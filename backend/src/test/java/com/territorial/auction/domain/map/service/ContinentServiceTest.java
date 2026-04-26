package com.territorial.auction.domain.map.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.territorial.auction.domain.map.dto.ContinentListResponse;
import com.territorial.auction.domain.map.dto.ContinentListResponse.ContinentInfo;
import com.territorial.auction.domain.map.entity.Continent;
import com.territorial.auction.domain.map.entity.Territory.TerritoryStatus;
import com.territorial.auction.domain.map.repository.ContinentRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class ContinentServiceTest {

    @InjectMocks private ContinentService continentService;

    @Mock private ContinentRepository continentRepository;
    @Mock private TerritoryRepository territoryRepository;

    // ────────────────────────────────────────────────────────────────
    // Fixtures
    // ────────────────────────────────────────────────────────────────

    private Continent continent(Long id, String name) {
        Continent c = Continent.builder().name(name).themeColor("#FF4444").build();
        ReflectionTestUtils.setField(c, "id", id);
        return c;
    }

    // ────────────────────────────────────────────────────────────────
    // getContinents()
    // ────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getContinents()")
    class GetContinents {

        @Test
        @DisplayName("대륙이 존재하면 전체 목록과 totalContinents를 반환한다")
        void getContinents_returnsList() {
            Continent c1 = continent(1L, "붉은 사막");
            Continent c2 = continent(2L, "얼음 벌판");
            given(continentRepository.findAll()).willReturn(List.of(c1, c2));
            given(territoryRepository.countByContinentId(1L)).willReturn(10L);
            given(territoryRepository.countByContinentId(2L)).willReturn(8L);
            given(territoryRepository.countByContinentIdAndStatus(1L, TerritoryStatus.OCCUPIED))
                    .willReturn(3L);
            given(territoryRepository.countByContinentIdAndStatus(2L, TerritoryStatus.OCCUPIED))
                    .willReturn(5L);

            ContinentListResponse response = continentService.getContinents();

            assertThat(response.totalContinents()).isEqualTo(2);
            assertThat(response.continent()).hasSize(2);
        }

        @Test
        @DisplayName("대륙 ID와 이름이 올바르게 매핑된다")
        void getContinents_mapsIdAndName() {
            Continent c = continent(1L, "붉은 사막");
            given(continentRepository.findAll()).willReturn(List.of(c));
            given(territoryRepository.countByContinentId(1L)).willReturn(0L);
            given(territoryRepository.countByContinentIdAndStatus(1L, TerritoryStatus.OCCUPIED))
                    .willReturn(0L);

            ContinentInfo info = continentService.getContinents().continent().get(0);

            assertThat(info.continentId()).isEqualTo(1L);
            assertThat(info.continentName()).isEqualTo("붉은 사막");
        }

        @Test
        @DisplayName("totalTerritories는 해당 대륙의 전체 영토 수를 반환한다")
        void getContinents_totalTerritories() {
            Continent c = continent(1L, "붉은 사막");
            given(continentRepository.findAll()).willReturn(List.of(c));
            given(territoryRepository.countByContinentId(1L)).willReturn(15L);
            given(territoryRepository.countByContinentIdAndStatus(1L, TerritoryStatus.OCCUPIED))
                    .willReturn(0L);

            ContinentInfo info = continentService.getContinents().continent().get(0);

            assertThat(info.totalTerritories()).isEqualTo(15);
        }

        @Test
        @DisplayName("occupiedTerritories는 OCCUPIED 상태 영토 수만 반환한다")
        void getContinents_occupiedTerritories() {
            Continent c = continent(1L, "붉은 사막");
            given(continentRepository.findAll()).willReturn(List.of(c));
            given(territoryRepository.countByContinentId(1L)).willReturn(10L);
            given(territoryRepository.countByContinentIdAndStatus(1L, TerritoryStatus.OCCUPIED))
                    .willReturn(4L);

            ContinentInfo info = continentService.getContinents().continent().get(0);

            assertThat(info.occupiedTerritories()).isEqualTo(4);
        }

        @Test
        @DisplayName("미구현 필드(dominantGuildName, avgTerritorytGrade, bonusDescription)는 null이다")
        void getContinents_todoFieldsAreNull() {
            Continent c = continent(1L, "붉은 사막");
            given(continentRepository.findAll()).willReturn(List.of(c));
            given(territoryRepository.countByContinentId(1L)).willReturn(0L);
            given(territoryRepository.countByContinentIdAndStatus(1L, TerritoryStatus.OCCUPIED))
                    .willReturn(0L);

            ContinentInfo info = continentService.getContinents().continent().get(0);

            assertThat(info.dominantGuildName()).isNull();
            assertThat(info.avgTerritorytGrade()).isNull();
            assertThat(info.bonusDescription()).isNull();
        }

        @Test
        @DisplayName("대륙이 없으면 빈 목록과 totalContinents 0을 반환한다")
        void getContinents_empty() {
            given(continentRepository.findAll()).willReturn(List.of());

            ContinentListResponse response = continentService.getContinents();

            assertThat(response.totalContinents()).isZero();
            assertThat(response.continent()).isEmpty();
        }

        @Test
        @DisplayName("여러 대륙의 영토 수가 각각 독립적으로 집계된다")
        void getContinents_multipleContinent_eachCountIndependent() {
            Continent c1 = continent(1L, "붉은 사막");
            Continent c2 = continent(2L, "얼음 벌판");
            given(continentRepository.findAll()).willReturn(List.of(c1, c2));
            given(territoryRepository.countByContinentId(1L)).willReturn(20L);
            given(territoryRepository.countByContinentId(2L)).willReturn(5L);
            given(territoryRepository.countByContinentIdAndStatus(1L, TerritoryStatus.OCCUPIED))
                    .willReturn(10L);
            given(territoryRepository.countByContinentIdAndStatus(2L, TerritoryStatus.OCCUPIED))
                    .willReturn(2L);

            List<ContinentInfo> infos = continentService.getContinents().continent();

            assertThat(infos.get(0).totalTerritories()).isEqualTo(20);
            assertThat(infos.get(0).occupiedTerritories()).isEqualTo(10);
            assertThat(infos.get(1).totalTerritories()).isEqualTo(5);
            assertThat(infos.get(1).occupiedTerritories()).isEqualTo(2);
        }
    }
}
