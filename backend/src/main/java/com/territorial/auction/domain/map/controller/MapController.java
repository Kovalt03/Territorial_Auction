package com.territorial.auction.domain.map.controller;

import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/map")
@RequiredArgsConstructor
public class MapController {

    @GetMapping
    public ResponseEntity<ApiResponse<Void>> getMap() {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
