package com.territorial.auction.domain.military.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record DeclareSiegeRequest(
        @NotNull Long targetTerritoryId,
        Long targetBuildingId,
        @NotNull @Min(1) @Max(3) Integer attackZone,
        @NotNull Long unitTypeId,
        @NotNull @Min(1) Integer unitQuantity) {}
