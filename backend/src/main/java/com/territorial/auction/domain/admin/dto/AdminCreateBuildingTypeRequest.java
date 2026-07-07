package com.territorial.auction.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record AdminCreateBuildingTypeRequest(
        @NotBlank String name,
        String displayName,
        @NotNull @Positive Integer width,
        @NotNull @Positive Integer height,
        @NotNull @Positive Integer maxHp,
        @NotNull @PositiveOrZero Integer baseCostGp,
        Integer zoneRestriction,
        Integer defensePower,
        Integer foodProductionRate,
        Integer unitCapacityPerLevel,
        Integer gpProductionRate,
        String icon,
        String colorHex) {}
