package com.territorial.auction.domain.military.controller;

import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/military")
@RequiredArgsConstructor
public class MilitaryController {

    @GetMapping
    public ResponseEntity<ApiResponse<Void>> getTroops() {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
