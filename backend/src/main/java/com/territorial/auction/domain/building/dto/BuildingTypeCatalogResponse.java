package com.territorial.auction.domain.building.dto;

import com.territorial.auction.domain.building.entity.BuildingType;
import java.util.List;

public record BuildingTypeCatalogResponse(List<BuildingTypeInfo> buildingTypes) {

    public record BuildingTypeInfo(
            Long buildingTypeId,
            String name,
            int width,
            int height,
            int maxHp,
            int baseCostGp,
            Integer zoneRestriction,
            Integer defensePower,
            Integer foodProductionRate,
            Integer unitCapacityPerLevel,
            Integer gpProductionRate,
            String icon,
            String colorHex) {

        public static BuildingTypeInfo from(BuildingType t) {
            return new BuildingTypeInfo(
                    t.getId(),
                    t.getName(),
                    t.getWidth(),
                    t.getHeight(),
                    t.getMaxHp(),
                    t.getBaseCostGp(),
                    t.getZoneRestriction(),
                    t.getDefensePower(),
                    t.getFoodProductionRate(),
                    t.getUnitCapacityPerLevel(),
                    t.getGpProductionRate(),
                    t.getIcon(),
                    t.getColorHex());
        }
    }

    public static BuildingTypeCatalogResponse of(List<BuildingType> types) {
        return new BuildingTypeCatalogResponse(types.stream().map(BuildingTypeInfo::from).toList());
    }
}
