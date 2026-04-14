package com.territorial.auction.domain.building.controller;

import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/buildings")
@RequiredArgsConstructor
public class BuildingController {

    @GetMapping
    public ResponseEntity<ApiResponse<Void>> getBuildings() {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
