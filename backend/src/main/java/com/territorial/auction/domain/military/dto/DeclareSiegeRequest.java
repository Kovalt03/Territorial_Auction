package com.territorial.auction.domain.military.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record DeclareSiegeRequest(
        @NotNull Long targetTerritoryId,
        Long targetBuildingId,
        @NotNull @Min(1) @Max(3) Integer attackZone,
        @NotEmpty @Valid List<ForceEntry> forces) {

    /** 공격에 커밋할 유닛 타입별 수량. 공성 병기+호위 등 혼합 편성. */
    public record ForceEntry(@NotNull Long unitTypeId, @NotNull @Min(1) Integer quantity) {}
}
