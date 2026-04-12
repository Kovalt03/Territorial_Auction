package com.territorial.auction.domain.island.controller;

import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/islands")
@RequiredArgsConstructor
public class IslandController {

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> getIsland(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
