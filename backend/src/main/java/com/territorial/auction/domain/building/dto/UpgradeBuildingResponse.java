package com.territorial.auction.domain.building.dto;

public record UpgradeBuildingResponse(
        Long buildingId,
        int newLevel,
        Integer nextLevel,
        int maxLevel,
        int upgradeCost,
        int gpRemaining) {}
