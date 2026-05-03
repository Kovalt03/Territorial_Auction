package com.territorial.auction.domain.season.service;

import com.territorial.auction.domain.season.dto.MySeasonPassResponse;
import com.territorial.auction.domain.season.dto.PurchaseSeasonPassResponse;
import com.territorial.auction.domain.season.dto.SeasonPassResponse;
import com.territorial.auction.domain.season.repository.SeasonPassRepository;
import com.territorial.auction.domain.season.repository.SeasonRepository;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeasonPassService {

    private final SeasonRepository seasonRepository;
    private final SeasonPassRepository seasonPassRepository;
    private final UserSeasonPassRepository userSeasonPassRepository;

    public SeasonPassResponse getProgress(Long userId) {
        // TODO: 구현 예정
        throw new UnsupportedOperationException("미구현");
    }

    public MySeasonPassResponse getMyPass(Long userId) {
        return userSeasonPassRepository
                .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                .filter(pass -> pass.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(MySeasonPassResponse::from)
                .orElse(new MySeasonPassResponse(false, null));
    }

    @Transactional
    public PurchaseSeasonPassResponse purchase(Long userId) {
        // TODO: AP 차감, UserSeasonPass INSERT, Redis 캐시 갱신
        throw new UnsupportedOperationException("미구현");
    }
}
