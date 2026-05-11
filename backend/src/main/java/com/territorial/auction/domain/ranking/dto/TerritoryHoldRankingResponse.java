package com.territorial.auction.domain.ranking.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record TerritoryHoldRankingResponse(
        Long seasonId,
        List<RankEntry> rankings,
        int myRank,
        long myScore,
        LocalDateTime updatedAt) {

    public record RankEntry(
            int rank, Long userId, String nickname, long score, Map<String, Long> gradeBreakdown) {}
}
