package com.territorial.auction.domain.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.territorial.auction.domain.admin.dto.AdminChangeGradeRequest;
import com.territorial.auction.domain.admin.dto.AdminTerritoryResponse;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.TerritoryGrade;
import com.territorial.auction.domain.map.repository.ContinentRepository;
import com.territorial.auction.domain.map.repository.TerritoryGradeRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminTerritoryServiceTest {

    @InjectMocks private AdminTerritoryService adminTerritoryService;

    @Mock private TerritoryRepository territoryRepository;
    @Mock private TerritoryGradeRepository territoryGradeRepository;
    @Mock private ContinentRepository continentRepository;
    @Mock private AdminAuditLogger adminAuditLogger;

    private TerritoryGrade grade(String g) {
        return TerritoryGrade.builder()
                .grade(g)
                .productionMultiplier(BigDecimal.ONE)
                .auctionPriceMultiplier(BigDecimal.ONE)
                .preBuiltCount(0)
                .spawnRate(BigDecimal.ONE)
                .gridSize(10)
                .build();
    }

    private Territory territory(long id, TerritoryGrade g) {
        Territory t = Territory.builder().coordX(1).coordY(2).grade(g).build();
        ReflectionTestUtils.setField(t, "id", id);
        return t;
    }

    @Test
    @DisplayName("등급 변경 성공 → 새 등급 반영")
    void changeGrade_success() {
        Territory t = territory(100L, grade("C"));
        given(territoryRepository.findById(100L)).willReturn(Optional.of(t));
        given(territoryGradeRepository.findByGrade("S")).willReturn(Optional.of(grade("S")));

        AdminTerritoryResponse response =
                adminTerritoryService.changeGrade(1L, 100L, new AdminChangeGradeRequest("S", "조정"));

        assertThat(response.grade()).isEqualTo("S");
        assertThat(t.getGrade().getGrade()).isEqualTo("S");
    }

    @Test
    @DisplayName("존재하지 않는 영토 → TERRITORY_NOT_FOUND")
    void changeGrade_territoryNotFound() {
        given(territoryRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                adminTerritoryService.changeGrade(
                                        1L, 999L, new AdminChangeGradeRequest("S", "조정")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TERRITORY_NOT_FOUND);
    }

    @Test
    @DisplayName("존재하지 않는 등급 → TERRITORY_GRADE_NOT_FOUND")
    void changeGrade_gradeNotFound() {
        given(territoryRepository.findById(100L))
                .willReturn(Optional.of(territory(100L, grade("C"))));
        given(territoryGradeRepository.findByGrade("Z")).willReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                adminTerritoryService.changeGrade(
                                        1L, 100L, new AdminChangeGradeRequest("Z", "조정")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.TERRITORY_GRADE_NOT_FOUND);
    }

    @Test
    @DisplayName("존재하지 않는 대륙 목록 조회 → CONTINENT_NOT_FOUND")
    void getTerritories_continentNotFound() {
        given(continentRepository.existsById(5L)).willReturn(false);

        assertThatThrownBy(() -> adminTerritoryService.getTerritories(5L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CONTINENT_NOT_FOUND);
    }
}
