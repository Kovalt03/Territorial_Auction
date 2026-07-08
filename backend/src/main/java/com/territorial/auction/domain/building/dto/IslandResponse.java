package com.territorial.auction.domain.building.dto;

import com.territorial.auction.domain.building.BuildingPolicy;
import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.HomeIsland;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.function.ToIntFunction;

public record IslandResponse(
        Long islandId,
        String grade,
        int gridSize,
        int level,
        int productionRate,
        LocalDateTime lastHarvestAt,
        int accumulatedGp,
        int zone1Radius,
        int zone2Radius,
        List<IslandBuildingInfo> buildings) {

    public record IslandBuildingInfo(
            Long buildingId,
            String type,
            int posX,
            int posY,
            int hp,
            int maxHp,
            int level,
            int width,
            int height,
            boolean isDestroyed) {

        public static IslandBuildingInfo from(BuildingInstance bi, int maxHp) {
            return new IslandBuildingInfo(
                    bi.getId(),
                    bi.getBuildingType().getName(),
                    bi.getPosX(),
                    bi.getPosY(),
                    bi.getHp(),
                    maxHp,
                    bi.getLevel(),
                    bi.getBuildingType().getWidth(),
                    bi.getBuildingType().getHeight(),
                    bi.isDestroyed());
        }
    }

    public static IslandResponse of(
            HomeIsland island,
            List<BuildingInstance> buildings,
            ToIntFunction<BuildingInstance> gpPerHourFn,
            ToIntFunction<BuildingInstance> maxHpFn) {
        List<IslandBuildingInfo> buildingInfos =
                buildings.stream()
                        .map(b -> IslandBuildingInfo.from(b, maxHpFn.applyAsInt(b)))
                        .toList();

        int productionRatePerHour =
                buildings.stream().filter(b -> !b.isDestroyed()).mapToInt(gpPerHourFn).sum();
        int productionRate = productionRatePerHour / 60;

        LocalDateTime lastHarvestAt =
                island.getLastHarvestAt() != null
                        ? island.getLastHarvestAt()
                        : island.getCreatedAt() != null
                                ? island.getCreatedAt()
                                : LocalDateTime.now();

        long minutesElapsed =
                Math.max(
                        0,
                        Math.min(
                                ChronoUnit.MINUTES.between(lastHarvestAt, LocalDateTime.now()),
                                BuildingPolicy.MAX_HARVEST_ACCUMULATION_MINUTES));

        int accumulatedGp = (int) (minutesElapsed * productionRate);

        return new IslandResponse(
                island.getId(),
                island.getGrade(),
                island.getGridSize(),
                island.getLevel(),
                productionRate,
                lastHarvestAt,
                accumulatedGp,
                island.getZone1Radius(),
                island.getZone2Radius(),
                buildingInfos);
    }
}
