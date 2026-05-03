package com.territorial.auction.domain.season.controller;

import com.territorial.auction.domain.season.dto.MySeasonPassResponse;
import com.territorial.auction.domain.season.dto.PurchaseSeasonPassResponse;
import com.territorial.auction.domain.season.dto.SeasonPassResponse;
import com.territorial.auction.domain.season.service.SeasonPassService;
import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/season-pass")
@RequiredArgsConstructor
public class SeasonPassController {

    private final SeasonPassService seasonPassService;

    @GetMapping()
    public ResponseEntity<ApiResponse<SeasonPassResponse>> getSeasonPass(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(seasonPassService.getProgress(userId)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MySeasonPassResponse>> getMySeasonPass(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(seasonPassService.getMyPass(userId)));
    }

    @PostMapping("/purchase")
    public ResponseEntity<ApiResponse<PurchaseSeasonPassResponse>> purchaseSeasonPass(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(seasonPassService.purchase(userId)));
    }
}
