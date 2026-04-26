package com.territorial.auction.domain.map.dto;

import java.util.List;
import lombok.Builder;

public record ContinentListResponse(int totalContinents, List<ContinentInfo> continent) {

    @Builder
    public record ContinentInfo(
            Long continentId,
            String continentName,
            int totalTerritories,
            int occupiedTerritories,
            String dominantGuildName,
            String avgTerritorytGrade,
            String bonusDescription) {}
}
