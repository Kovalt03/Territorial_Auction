package com.territorial.auction.domain.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.BDDMockito.given;

import com.territorial.auction.domain.admin.dto.AdminContinentCompositionResponse;
import com.territorial.auction.domain.admin.dto.AdminContinentCompositionResponse.ContinentComposition;
import com.territorial.auction.domain.map.entity.Continent;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.ContinentRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminContinentServiceTest {

    @InjectMocks private AdminContinentService adminContinentService;

    @Mock private ContinentRepository continentRepository;
    @Mock private TerritoryRepository territoryRepository;

    private Continent continent(long id, String name, Integer minTrophy) {
        Continent c =
                Continent.builder()
                        .name(name)
                        .themeColor("#fff")
                        .minTrophyRequired(minTrophy)
                        .build();
        ReflectionTestUtils.setField(c, "id", id);
        return c;
    }

    @Test
    @DisplayName("대륙별 등급·상태 집계를 조합해 구성 현황 반환")
    void getCompositions_success() {
        given(continentRepository.findAll())
                .willReturn(List.of(continent(1L, "글리치", 0), continent(2L, "네뷸라", 1000)));
        given(territoryRepository.aggregateCompositionGroupByContinent())
                .willReturn(
                        List.of(
                                new Object[] {1L, "S", Territory.TerritoryStatus.BIDDING, 2L},
                                new Object[] {1L, "A", Territory.TerritoryStatus.OCCUPIED, 5L},
                                new Object[] {1L, "A", Territory.TerritoryStatus.IDLE, 3L},
                                new Object[] {2L, "B", Territory.TerritoryStatus.IDLE, 4L}));

        AdminContinentCompositionResponse response = adminContinentService.getCompositions();

        assertThat(response.continents())
                .extracting(
                        ContinentComposition::continentId, ContinentComposition::totalTerritories)
                .containsExactly(tuple(1L, 10L), tuple(2L, 4L));

        ContinentComposition glitch = response.continents().get(0);
        assertThat(glitch.gradeBreakdown()).containsEntry("S", 2L).containsEntry("A", 8L);
        assertThat(glitch.biddingCount()).isEqualTo(2L);
        assertThat(glitch.occupiedCount()).isEqualTo(5L);
        assertThat(glitch.idleCount()).isEqualTo(3L);
    }

    @Test
    @DisplayName("영토 집계가 없는 대륙은 0으로 채워 반환")
    void getCompositions_emptyContinent() {
        given(continentRepository.findAll()).willReturn(List.of(continent(9L, "빈행성", 5000)));
        given(territoryRepository.aggregateCompositionGroupByContinent()).willReturn(List.of());

        AdminContinentCompositionResponse response = adminContinentService.getCompositions();

        ContinentComposition empty = response.continents().get(0);
        assertThat(empty.totalTerritories()).isZero();
        assertThat(empty.gradeBreakdown()).isEmpty();
        assertThat(empty.biddingCount()).isZero();
    }
}
