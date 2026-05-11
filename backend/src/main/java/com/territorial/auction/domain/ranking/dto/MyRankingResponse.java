package com.territorial.auction.domain.ranking.dto;

public record MyRankingResponse(
        Long seasonId,
        int territoryHoldRank,
        long territoryHoldScore,
        int auctionSpendRank,
        long auctionSpendScore) {}
