package com.territorial.auction.domain.admin.service;

import com.territorial.auction.domain.admin.dto.AdminCreateBuildingTypeRequest;
import com.territorial.auction.domain.admin.dto.AdminUpdateBuildingTypeRequest;
import com.territorial.auction.domain.building.dto.BuildingTypeCatalogResponse;
import com.territorial.auction.domain.building.dto.BuildingTypeCatalogResponse.BuildingTypeInfo;
import com.territorial.auction.domain.building.entity.BuildingCategory;
import com.territorial.auction.domain.building.entity.BuildingType;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.building.repository.BuildingTypeRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminBuildingService {

    private final BuildingTypeRepository buildingTypeRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final AdminAuditLogger adminAuditLogger;

    public BuildingTypeCatalogResponse getBuildingTypes() {
        return BuildingTypeCatalogResponse.of(buildingTypeRepository.findAll());
    }

    @Transactional
    public BuildingTypeInfo create(Long adminUserId, AdminCreateBuildingTypeRequest request) {
        String name = request.name().trim().toUpperCase();
        if (buildingTypeRepository.existsByName(name)) {
            throw new CustomException(ErrorCode.DUPLICATE_BUILDING_TYPE_NAME);
        }
        // 기능은 백엔드가 코드로 하드코딩 매칭하므로, 신규 생성은 장식 건물만 허용한다.
        if (BuildingCategory.FUNCTIONAL_CODES.contains(name)) {
            throw new CustomException(ErrorCode.FUNCTIONAL_BUILDING_NOT_CREATABLE);
        }
        BuildingType saved =
                buildingTypeRepository.save(
                        BuildingType.builder()
                                .name(name)
                                .displayName(blankToNull(request.displayName()))
                                .category(BuildingCategory.DECORATIVE)
                                .width(request.width())
                                .height(request.height())
                                .maxHp(request.maxHp())
                                .baseCostGp(request.baseCostGp())
                                .zoneRestriction(request.zoneRestriction())
                                .defensePower(request.defensePower())
                                // 장식 건물은 생산 기능이 없다(이름 기반 로직이 없음).
                                .foodProductionRate(null)
                                .unitCapacityPerLevel(null)
                                .gpProductionRate(null)
                                .icon(blankToNull(request.icon()))
                                .colorHex(blankToNull(request.colorHex()))
                                .build());

        adminAuditLogger.record(
                adminUserId,
                "BUILDING_TYPE_CREATE",
                "BUILDING_TYPE",
                saved.getId(),
                Map.of("name", name));
        return BuildingTypeInfo.from(saved);
    }

    @Transactional
    public BuildingTypeInfo update(
            Long adminUserId, Long buildingTypeId, AdminUpdateBuildingTypeRequest request) {
        BuildingType type = findOrThrow(buildingTypeId);
        boolean isDecorative = type.getCategory() == BuildingCategory.DECORATIVE;
        type.update(
                blankToNull(request.displayName()),
                request.width(),
                request.height(),
                request.maxHp(),
                request.baseCostGp(),
                request.zoneRestriction(),
                request.defensePower(),
                // 장식 건물은 생산 필드를 강제로 비운다(기능이 없으므로).
                isDecorative ? null : request.foodProductionRate(),
                isDecorative ? null : request.unitCapacityPerLevel(),
                isDecorative ? null : request.gpProductionRate(),
                blankToNull(request.icon()),
                blankToNull(request.colorHex()));

        adminAuditLogger.record(
                adminUserId,
                "BUILDING_TYPE_UPDATE",
                "BUILDING_TYPE",
                buildingTypeId,
                Map.of("name", type.getName()));
        return BuildingTypeInfo.from(type);
    }

    @Transactional
    public void delete(Long adminUserId, Long buildingTypeId) {
        BuildingType type = findOrThrow(buildingTypeId);
        if (buildingInstanceRepository.countByBuildingType_Id(buildingTypeId) > 0) {
            throw new CustomException(ErrorCode.BUILDING_TYPE_IN_USE);
        }
        buildingTypeRepository.delete(type);
        adminAuditLogger.record(
                adminUserId,
                "BUILDING_TYPE_DELETE",
                "BUILDING_TYPE",
                buildingTypeId,
                Map.of("name", type.getName()));
    }

    private BuildingType findOrThrow(Long buildingTypeId) {
        return buildingTypeRepository
                .findById(buildingTypeId)
                .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_TYPE_NOT_FOUND));
    }

    private String blankToNull(String v) {
        return (v != null && !v.isBlank()) ? v.trim() : null;
    }
}
