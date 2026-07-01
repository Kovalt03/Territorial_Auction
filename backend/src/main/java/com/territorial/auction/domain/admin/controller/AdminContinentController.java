package com.territorial.auction.domain.admin.controller;

import com.territorial.auction.domain.admin.dto.AdminContinentCompositionResponse;
import com.territorial.auction.domain.admin.service.AdminContinentService;
import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/continents")
@RequiredArgsConstructor
public class AdminContinentController {

    private final AdminContinentService adminContinentService;

    @GetMapping
    public ResponseEntity<ApiResponse<AdminContinentCompositionResponse>> getCompositions() {
        return ResponseEntity.ok(ApiResponse.ok(adminContinentService.getCompositions()));
    }
}
