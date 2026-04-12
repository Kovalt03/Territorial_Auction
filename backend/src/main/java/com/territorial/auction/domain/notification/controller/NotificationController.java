package com.territorial.auction.domain.notification.controller;

import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    @GetMapping
    public ResponseEntity<ApiResponse<Void>> getNotifications() {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
