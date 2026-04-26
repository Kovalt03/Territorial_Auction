package com.territorial.auction.domain.map.dto;

import java.util.List;

public record GridMapResponse(int gridSize, List<GridTerritoryDto> territories) {

    public record GridTerritoryDto(
            Long id,
            int coordX,
            int coordY,
            Long ownerId,
            String ownerNickname,
            String color,
            String grade,
            String status,
            boolean isAuctioning,
            Long continentId,
            int gridSize) {}
}
