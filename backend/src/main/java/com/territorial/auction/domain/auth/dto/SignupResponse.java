package com.territorial.auction.domain.auth.dto;

import com.territorial.auction.domain.user.entity.User;

public record SignupResponse(Long userId, String loginId, String nickname) {
    public static SignupResponse from(User user) {
        return new SignupResponse(user.getId(), user.getLoginId(), user.getNickname());
    }
}
