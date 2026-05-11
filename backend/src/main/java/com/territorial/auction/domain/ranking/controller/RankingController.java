package com.territorial.auction.domain.ranking.controller;

import com.territorial.auction.domain.ranking.dto.AuctionSpendRankingResponse;
import com.territorial.auction.domain.ranking.dto.MyRankingResponse;
import com.territorial.auction.domain.ranking.dto.TerritoryHoldRankingResponse;
import com.territorial.auction.domain.ranking.service.RankingService;
import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/rankings")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;

    @GetMapping("/territory-hold")
    public ResponseEntity<ApiResponse<TerritoryHoldRankingResponse>> getTerritoryHoldRanking(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int cappedSize = Math.min(size, 100);
        return ResponseEntity.ok(
                ApiResponse.ok(rankingService.getTerritoryHoldRanking(userId, page, cappedSize)));
    }

    @GetMapping("/auction-spend")
    public ResponseEntity<ApiResponse<AuctionSpendRankingResponse>> getAuctionSpendRanking(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        int cappedSize = Math.min(size, 100);
        return ResponseEntity.ok(
                ApiResponse.ok(rankingService.getAuctionSpendRanking(userId, page, cappedSize)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MyRankingResponse>> getMyRanking(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(rankingService.getMyRanking(userId)));
    }
}
