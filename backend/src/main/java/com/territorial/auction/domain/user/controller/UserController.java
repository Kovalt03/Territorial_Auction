package com.territorial.auction.domain.user.controller;

import com.territorial.auction.domain.user.dto.UserProfileResponse;
import com.territorial.auction.domain.user.service.UserService;
import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
}
