package com.territorial.auction.domain.military.dto;

import java.util.List;

public record UnitListResponse(List<UnitDto> units, Integer totalFoodCostPerHour) {

    public record UnitDto(
            Long unitTypeId,
            String name,
            Integer quantity,
            Integer deployedCount,
            Integer idleCount,
            Integer attackPower,
            Integer defensePower,
            Integer foodCostPerHour) {}
}
