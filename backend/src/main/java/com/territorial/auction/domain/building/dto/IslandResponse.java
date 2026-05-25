package com.territorial.auction.domain.building.dto;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.HomeIsland;
import java.util.List;

public record IslandResponse(
        Long islandId,
        int gridSize,
        int level,
        int productionRate,
        List<IslandBuildingInfo> buildings) {

    public record IslandBuildingInfo(
            Long buildingId,
            String type,
            int posX,
            int posY,
            int hp,
            int maxHp,
            int level,
            boolean isDestroyed) {

        public static IslandBuildingInfo from(BuildingInstance bi) {
            return new IslandBuildingInfo(
                    bi.getId(),
                    bi.getBuildingType().getName(),
                    bi.getPosX(),
                    bi.getPosY(),
                    bi.getHp(),
                    bi.getBuildingType().getMaxHp(),
                    bi.getLevel(),
                    bi.isDestroyed());
        }
    }

    public static IslandResponse of(HomeIsland island, List<BuildingInstance> buildings) {
        List<IslandBuildingInfo> buildingInfos =
                buildings.stream().map(IslandBuildingInfo::from).toList();
        int productionRate =
                buildings.stream()
                        .filter(
                                b ->
                                        !b.isDestroyed()
                                                && "WORKSHOP".equals(b.getBuildingType().getName())
                                                && b.getBuildingType().getGpProductionRate()
                                                        != null)
                        .mapToInt(b -> b.getLevel() * b.getBuildingType().getGpProductionRate())
                        .sum();
        return new IslandResponse(
                island.getId(),
                island.getGridSize(),
                island.getLevel(),
                productionRate,
                buildingInfos);
    }
}
