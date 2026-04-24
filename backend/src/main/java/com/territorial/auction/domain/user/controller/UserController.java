package com.territorial.auction.domain.user.controller;

import com.territorial.auction.domain.user.dto.MyProfileResponse;
import com.territorial.auction.domain.user.dto.NotificationSettingResponse;
import com.territorial.auction.domain.user.dto.NotificationSettingUpdateRequest;
import com.territorial.auction.domain.user.dto.UserProfileResponse;
import com.territorial.auction.domain.user.service.UserService;
import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getUser(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUserProfile(userId)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MyProfileResponse>> getMe(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(userService.getMyProfile(userId)));
    }

    @GetMapping("/me/settings")
    public ResponseEntity<ApiResponse<NotificationSettingResponse>> getNotificationSetting(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok(userService.getNotificationSetting(userId)));
    }

    @PatchMapping("/me/settings")
    public ResponseEntity<ApiResponse<NotificationSettingResponse>> updateNotificationSetting(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody NotificationSettingUpdateRequest request) {
        Long userId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(
                ApiResponse.ok(userService.updateNotificationSetting(userId, request)));
    }
}
