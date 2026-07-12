package com.territorial.auction.domain.military.dto;

import com.territorial.auction.domain.military.LocationType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProduceUnitRequest(
        @NotNull Long unitTypeId,
        @NotNull @Min(1) Integer quantity,
        @NotNull Long locationId,
        @NotNull LocationType locationType) {}
