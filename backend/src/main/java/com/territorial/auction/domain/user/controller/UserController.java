package com.territorial.auction.domain.user.controller;

import com.territorial.auction.domain.user.dto.*;
import com.territorial.auction.domain.user.service.UserService;
import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getMyProfile(userId)));
    }

    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteMe(
            @AuthenticationPrincipal Long userId, @RequestBody DeleteMeRequest request) {
        userService.deleteMe(userId, request.password());
        return ResponseEntity.ok(ApiResponse.ok("회원 탈퇴가 완료되었습니다.", null));
    }

    @GetMapping("/me/settings")
    public ResponseEntity<ApiResponse<NotificationSettingResponse>> getNotificationSetting(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getNotificationSetting(userId)));
    }

    @PatchMapping("/me/settings")
    public ResponseEntity<ApiResponse<NotificationSettingResponse>> updateNotificationSetting(
            @AuthenticationPrincipal Long userId,
            @RequestBody UpdateNotificationSettingRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(userService.updateNotificationSetting(userId, request)));
    }

    @GetMapping("/me/territories")
    public ResponseEntity<ApiResponse<MyTerritoryResponse>> getMyTerritories(
            @AuthenticationPrincipal Long userId,
            @PageableDefault(page = 0, size = 10, sort = "id", direction = Sort.Direction.DESC)
                    Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getMyTerritories(userId, pageable)));
    }

    @GetMapping("/me/wallet")
    public ResponseEntity<ApiResponse<MyWalletResponse>> getMyWallet(
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getMyWallet(userId)));
    }

    @PatchMapping("/me/nickname")
    public ResponseEntity<ApiResponse<ChangeNicknameResponse>> changeUserNickname(
            @AuthenticationPrincipal Long userId, @RequestBody ChangeNicknameRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok(userService.changeUserNickname(userId, request.nickname())));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changeUserPassword(
            @AuthenticationPrincipal Long userId, @RequestBody ChangePasswordRequest request) {
        userService.changeUserPassword(userId, request.currentPassword(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.ok("비밀번호가 성공적으로 변경되었습니다.", null));
    }
}
