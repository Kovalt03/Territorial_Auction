package com.territorial.auction.domain.item.dto;

import java.time.LocalDateTime;

public record UseItemResponse(Long itemId, String itemType, UseResult result, int remainingCount) {

    public record UseResult(Long territoryId, LocalDateTime invincibleUntil) {}
}
