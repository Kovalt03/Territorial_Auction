package com.territorial.auction.domain.building.controller;

import com.territorial.auction.domain.building.dto.MoveBuildingRequest;
import com.territorial.auction.domain.building.dto.MoveBuildingResponse;
import com.territorial.auction.domain.building.dto.PlaceBuildingRequest;
import com.territorial.auction.domain.building.dto.PlaceBuildingResponse;
import com.territorial.auction.domain.building.dto.RepairBuildingResponse;
import com.territorial.auction.domain.building.dto.StoreBuildingResponse;
import com.territorial.auction.domain.building.dto.TerritoryBuildingResponse;
import com.territorial.auction.domain.building.dto.UpgradeBuildingResponse;
import com.territorial.auction.domain.building.service.BuildingService;
import com.territorial.auction.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class BuildingController {

    private final BuildingService buildingService;

    @GetMapping("/api/v1/map/territories/{territoryId}/buildings")
    public ResponseEntity<ApiResponse<TerritoryBuildingResponse>> getTerritoryBuildings(
            @PathVariable Long territoryId) {
        return ResponseEntity.ok(
                ApiResponse.ok(buildingService.findTerritoryBuildings(territoryId)));
    }

    @PostMapping("/api/v1/map/territories/{territoryId}/buildings")
    public ResponseEntity<ApiResponse<PlaceBuildingResponse>> placeOnTerritory(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long territoryId,
            @RequestBody @Valid PlaceBuildingRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(buildingService.placeOnTerritory(userId, territoryId, request)));
    }

    @PostMapping("/api/v1/buildings/{buildingId}/upgrade")
    public ResponseEntity<ApiResponse<UpgradeBuildingResponse>> upgrade(
            @AuthenticationPrincipal Long userId, @PathVariable Long buildingId) {
        return ResponseEntity.ok(ApiResponse.ok(buildingService.upgrade(userId, buildingId)));
    }

    @PostMapping("/api/v1/buildings/{buildingId}/repair")
    public ResponseEntity<ApiResponse<RepairBuildingResponse>> repair(
            @AuthenticationPrincipal Long userId, @PathVariable Long buildingId) {
        return ResponseEntity.ok(ApiResponse.ok(buildingService.repair(userId, buildingId)));
    }

    @PatchMapping("/api/v1/buildings/{buildingId}/move")
    public ResponseEntity<ApiResponse<MoveBuildingResponse>> move(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long buildingId,
            @RequestBody @Valid MoveBuildingRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(buildingService.move(userId, buildingId, request)));
    }

    @PostMapping("/api/v1/buildings/{buildingId}/store")
    public ResponseEntity<ApiResponse<StoreBuildingResponse>> store(
            @AuthenticationPrincipal Long userId, @PathVariable Long buildingId) {
        return ResponseEntity.ok(ApiResponse.ok(buildingService.store(userId, buildingId)));
    }
}
