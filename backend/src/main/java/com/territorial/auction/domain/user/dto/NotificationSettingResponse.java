package com.territorial.auction.domain.user.dto;

import java.time.LocalDateTime;

public record NotificationSettingResponse(
        boolean isOutbidEnabled,
        boolean isAuctionStartEnabled,
        boolean isMarketingEnabled,
        LocalDateTime updatedAt) {}
