package com.territorial.auction.domain.auth.service;

import com.territorial.auction.domain.auth.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    public SignupResponse signup(SignupRequest request) {
        // TODO: 중복 검사 → User 저장 → Wallet + NotificationSetting 생성
        return null;
    }

    public TokenResponse login(LoginRequest request) {
        // TODO: loginId 조회 → 비밀번호 검증 → Access/Refresh 토큰 발급 → Redis 저장
        return null;
    }

    public TokenResponse refresh(RefreshRequest request) {
        // TODO: refreshToken 파싱 → Redis 검증 → 새 토큰 발급
        return null;
    }

    public void logout(Long userId) {
        // TODO: Redis에서 refreshToken 삭제
    }
}
