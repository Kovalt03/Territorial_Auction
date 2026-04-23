package com.territorial.auction.domain.user.dto;

import java.time.LocalDateTime;

public record UserProfileResponse(
        Long userId,
        String nickname,
        int trophyPoints,
        int territoryCount,
        LocalDateTime joinedAt) {}
