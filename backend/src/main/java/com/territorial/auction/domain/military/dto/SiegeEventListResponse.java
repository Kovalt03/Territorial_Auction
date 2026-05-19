package com.territorial.auction.domain.military.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SiegeEventListResponse(long totalCount, List<SiegeDto> sieges) {

    public record SiegeDto(
            Long siegeId,
            String status,
            UserDto attacker,
            UserDto defender,
            TerritoryDto targetTerritory,
            LocalDateTime siegeStartAt,
            LocalDateTime resolveAt) {}

    public record UserDto(Long userId, String nickname) {}

    public record TerritoryDto(Long id, Integer coordX, Integer coordY) {}
}
