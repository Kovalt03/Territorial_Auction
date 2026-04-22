package com.territorial.auction.domain.auth.service;

import com.territorial.auction.domain.auth.dto.*;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import com.territorial.auction.global.security.jwt.JwtTokenProvider;
import com.territorial.auction.global.security.jwt.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;

    public SignupResponse signup(SignupRequest request) {
        // TODO: 중복 검사(완) → User 저장(완) → Wallet + NotificationSetting 생성 [2/4]
        // 중복 검사
        if (userRepository.existsByLoginId(request.loginId()))
            throw new CustomException(ErrorCode.DUPLICATE_LOGIN_ID);
        if (userRepository.existsByNickname(request.nickname()))
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);

        // User 저장
        User user =
                User.builder()
                        .loginId(request.loginId())
                        .passwordHash(passwordEncoder.encode(request.password()))
                        .nickname(request.nickname())
                        .build();
        userRepository.save(user);

        return SignupResponse.from(user);
    }

    public TokenResponse login(LoginRequest request) {
        // loginId 조회
        User user =
                userRepository
                        .findByLoginId(request.loginId())
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 비밀번호 검증
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash()))
            throw new CustomException(ErrorCode.INVALID_PASSWORD);

        // Access/Refresh 토큰 발급 -> jwtTokenProvider에게 위임
        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        // Redis 저장
        refreshTokenService.save(user.getId(), refreshToken);

        // 응답
        return new TokenResponse(accessToken, refreshToken);
    }

    public TokenResponse refresh(RefreshRequest request) {
        // TODO: refreshToken 파싱 → Redis 검증 → 새 토큰 발급
        return null;
    }

    public void logout(Long userId) {
        // TODO: Redis에서 refreshToken 삭제
    }
}
