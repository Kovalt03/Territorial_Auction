package com.territorial.auction.domain.auction.controller;

import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auctions")
@RequiredArgsConstructor
public class AuctionController {

    @GetMapping
    public ResponseEntity<ApiResponse<Void>> getAuctions() {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/{auctionId}")
    public ResponseEntity<ApiResponse<Void>> getAuction(@PathVariable Long auctionId) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/{auctionId}/bids")
    public ResponseEntity<ApiResponse<Void>> getAuctionBidHistory(@PathVariable Long auctionId) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/{auctionId}/bids")
    public ResponseEntity<ApiResponse<Void>> placeBid(@PathVariable Long auctionId) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
