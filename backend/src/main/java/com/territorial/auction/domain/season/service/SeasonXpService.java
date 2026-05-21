package com.territorial.auction.domain.season.service;

import com.territorial.auction.domain.military.event.SiegeVictoryEvent;
import com.territorial.auction.domain.ranking.event.AuctionSettledEvent;
import com.territorial.auction.domain.season.SeasonPassPolicy;
import com.territorial.auction.domain.season.entity.Season;
import com.territorial.auction.domain.season.entity.SeasonPassProgress;
import com.territorial.auction.domain.season.repository.SeasonPassProgressRepository;
import com.territorial.auction.domain.season.repository.SeasonRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.repository.UserRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeasonXpService {

    private static final String CACHE_PROGRESS = "season_pass:progress:";

    private final SeasonRepository seasonRepository;
    private final SeasonPassProgressRepository seasonPassProgressRepository;
    private final UserRepository userRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleAuctionWin(AuctionSettledEvent event) {
        grantXp(event.userId(), event.seasonId(), SeasonPassPolicy.XP_AUCTION_WIN);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleSiegeVictory(SiegeVictoryEvent event) {
        grantXp(event.attackerId(), event.seasonId(), SeasonPassPolicy.XP_SIEGE_VICTORY);
    }

    // 이벤트 리스너 컨텍스트 — 예외 대신 조용한 종료로 처리해야 하므로 if-isEmpty 패턴 의도적 사용
    private void grantXp(Long userId, Long seasonId, int xpAmount) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            log.warn("시즌 패스 XP 적립 실패: 유저 없음. userId={}", userId);
            return;
        }
        Optional<Season> seasonOpt = seasonRepository.findById(seasonId);
        if (seasonOpt.isEmpty()) {
            log.warn("시즌 패스 XP 적립 실패: 시즌 없음. seasonId={}", seasonId);
            return;
        }

        User user = userOpt.get();
        Season season = seasonOpt.get();

        // SeasonXpService는 seasonId 유효성을 재확인하기 위해 Season 엔티티가 필요하다.
        // SiegeService에서 이미 확인한 seasonId라도 리스너가 Season 엔티티를 직접 써야 하므로 재조회한다.
        SeasonPassProgress progress = findOrCreateProgress(user, season);
        if (progress == null) return;

        progress.addXp(xpAmount, SeasonPassPolicy.XP_PER_LEVEL);

        try {
            redisTemplate.delete(CACHE_PROGRESS + userId);
        } catch (Exception e) {
            log.warn("시즌 패스 XP 캐시 무효화 실패. userId={}", userId);
        }

        log.info("시즌 패스 XP 적립. userId={}, seasonId={}, xpAmount={}", userId, seasonId, xpAmount);
    }

    private SeasonPassProgress findOrCreateProgress(User user, Season season) {
        try {
            return seasonPassProgressRepository
                    .findByUser_IdAndSeason_Id(user.getId(), season.getId())
                    .orElseGet(
                            () ->
                                    seasonPassProgressRepository.save(
                                            SeasonPassProgress.builder()
                                                    .user(user)
                                                    .season(season)
                                                    .build()));
        } catch (DataIntegrityViolationException e) {
            return seasonPassProgressRepository
                    .findByUser_IdAndSeason_Id(user.getId(), season.getId())
                    .orElseGet(
                            () -> {
                                log.error(
                                        "동시 insert 이후 progress 재조회 실패. userId={}, seasonId={}",
                                        user.getId(),
                                        season.getId());
                                return null;
                            });
        }
    }
}
