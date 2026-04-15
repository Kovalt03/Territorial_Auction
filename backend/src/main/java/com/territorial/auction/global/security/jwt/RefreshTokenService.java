package com.territorial.auction.global.security.jwt;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final StringRedisTemplate redisTemplate;
    private final JwtProperties jwtProperties;

    public void save(Long userId, String refreshToken) {
        // TODO: Redis에 session:jwt_refresh:{userId} 키로 저장 (TTL: refreshTokenExpiry)
    }

    public String get(Long userId) {
        // TODO: Redis에서 조회
        return null;
    }

    public void delete(Long userId) {
        // TODO: Redis에서 삭제
    }

    public boolean isValid(Long userId, String refreshToken) {
        // TODO: 저장된 토큰과 비교
        return false;
    }
}
