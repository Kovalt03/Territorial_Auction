package com.territorial.auction.domain.military.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record DeployUnitRequest(
        @NotNull Long territoryId, @NotNull Long unitTypeId, @NotNull @Min(1) Integer quantity) {}
