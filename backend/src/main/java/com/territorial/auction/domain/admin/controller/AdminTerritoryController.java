package com.territorial.auction.domain.admin.controller;

import com.territorial.auction.domain.admin.dto.AdminChangeGradeRequest;
import com.territorial.auction.domain.admin.dto.AdminTerritoryListResponse;
import com.territorial.auction.domain.admin.dto.AdminTerritoryResponse;
import com.territorial.auction.domain.admin.service.AdminTerritoryService;
import com.territorial.auction.global.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminTerritoryController {

    private final AdminTerritoryService adminTerritoryService;

    @GetMapping("/continents/{continentId}/territories")
    public ResponseEntity<ApiResponse<AdminTerritoryListResponse>> getTerritories(
            @PathVariable Long continentId) {
        return ResponseEntity.ok(ApiResponse.ok(adminTerritoryService.getTerritories(continentId)));
    }

    @PatchMapping("/territories/{territoryId}/grade")
    public ResponseEntity<ApiResponse<AdminTerritoryResponse>> changeGrade(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long territoryId,
            @RequestBody @Valid AdminChangeGradeRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(adminTerritoryService.changeGrade(userId, territoryId, request)));
    }
}
