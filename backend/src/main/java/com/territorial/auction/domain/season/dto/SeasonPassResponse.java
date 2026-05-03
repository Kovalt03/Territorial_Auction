package com.territorial.auction.domain.season.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SeasonPassResponse(
        Long seasonId,
        String seasonName,
        String passType,
        Integer currentLevel,
        Integer currentXp,
        Integer nextLevelXp,
        LocalDateTime seasonEndsAt,
        List<RewardItem> rewards) {
    public record RewardItem(Integer level, String rewardName, Boolean isClaimed) {}
}
