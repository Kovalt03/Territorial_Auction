package com.territorial.auction.domain.social.controller;

import com.territorial.auction.global.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/social")
@RequiredArgsConstructor
public class SocialController {

    @GetMapping("/friends")
    public ResponseEntity<ApiResponse<Void>> getFriends() {
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
