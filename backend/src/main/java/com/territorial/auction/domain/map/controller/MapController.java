package com.territorial.auction.domain.map.controller;

import com.territorial.auction.domain.map.dto.ChangeColorRequest;
import com.territorial.auction.domain.map.dto.GridMapResponse;
import com.territorial.auction.domain.map.dto.TerritoryDetailResponse;
import com.territorial.auction.domain.map.service.MapService;
import com.territorial.auction.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/map")
@RequiredArgsConstructor
public class MapController {

    private final MapService mapService;

    @GetMapping("/grid")
    public ResponseEntity<ApiResponse<GridMapResponse>> getGridMap(
            @RequestParam(value = "continent", required = false) Long continentId) {
        return ResponseEntity.ok(ApiResponse.ok(mapService.getGridMap(continentId)));
    }

    @GetMapping("/territories/{territoryId}")
    public ResponseEntity<ApiResponse<TerritoryDetailResponse>> getTerritoryDetail(
            @PathVariable Long territoryId) {
        return ResponseEntity.ok(ApiResponse.ok(mapService.getTerritoryDetail(territoryId)));
    }

    @PatchMapping("/territories/{territoryId}/color")
    public ResponseEntity<ApiResponse<Void>> changeColor(
            @PathVariable Long territoryId,
            @AuthenticationPrincipal Long userId,
            @RequestBody @Valid ChangeColorRequest request) {
        mapService.changeColor(territoryId, userId, request.colorCode());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
