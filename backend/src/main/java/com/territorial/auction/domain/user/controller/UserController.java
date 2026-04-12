package com.territorial.auction.domain.user.controller;

import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<Void>> getUser(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
