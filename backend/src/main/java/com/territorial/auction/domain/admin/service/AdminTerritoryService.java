package com.territorial.auction.domain.admin.service;

import com.territorial.auction.domain.admin.dto.AdminChangeGradeRequest;
import com.territorial.auction.domain.admin.dto.AdminTerritoryListResponse;
import com.territorial.auction.domain.admin.dto.AdminTerritoryResponse;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.TerritoryGrade;
import com.territorial.auction.domain.map.repository.ContinentRepository;
import com.territorial.auction.domain.map.repository.TerritoryGradeRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminTerritoryService {

    private final TerritoryRepository territoryRepository;
    private final TerritoryGradeRepository territoryGradeRepository;
    private final ContinentRepository continentRepository;

    public AdminTerritoryListResponse getTerritories(Long continentId) {
        if (!continentRepository.existsById(continentId)) {
            throw new CustomException(ErrorCode.CONTINENT_NOT_FOUND);
        }
        return new AdminTerritoryListResponse(
                territoryRepository.findAllByContinentIdWithDetails(continentId).stream()
                        .map(AdminTerritoryResponse::from)
                        .toList());
    }

    @Transactional
    public AdminTerritoryResponse changeGrade(Long territoryId, AdminChangeGradeRequest request) {
        Territory territory =
                territoryRepository
                        .findById(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));
        TerritoryGrade grade =
                territoryGradeRepository
                        .findByGrade(request.grade())
                        .orElseThrow(
                                () -> new CustomException(ErrorCode.TERRITORY_GRADE_NOT_FOUND));

        String before = territory.getGrade().getGrade();
        territory.changeGrade(grade);

        // TODO: 감사 로그(AdminAuditLog) 적용 예정
        log.info(
                "관리자 영토 등급 변경. territoryId={}, {} -> {}, reason={}",
                territoryId,
                before,
                request.grade(),
                request.reason());
        return AdminTerritoryResponse.from(territory);
    }
}
