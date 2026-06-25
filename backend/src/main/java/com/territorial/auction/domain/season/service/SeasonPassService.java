package com.territorial.auction.domain.season.service;

import com.territorial.auction.domain.season.dto.ClaimRewardResponse;
import com.territorial.auction.domain.season.dto.MySeasonPassResponse;
import com.territorial.auction.domain.season.dto.PurchaseSeasonPassResponse;
import com.territorial.auction.domain.season.dto.SeasonPassResponse;
import com.territorial.auction.domain.season.entity.Season;
import com.territorial.auction.domain.season.entity.SeasonPass;
import com.territorial.auction.domain.season.entity.SeasonPassLevelReward;
import com.territorial.auction.domain.season.entity.SeasonPassProgress;
import com.territorial.auction.domain.season.entity.SeasonPassRewardClaim;
import com.territorial.auction.domain.season.entity.UserSeasonPass;
import com.territorial.auction.domain.season.repository.SeasonPassLevelRewardRepository;
import com.territorial.auction.domain.season.repository.SeasonPassProgressRepository;
import com.territorial.auction.domain.season.repository.SeasonPassRepository;
import com.territorial.auction.domain.season.repository.SeasonPassRewardClaimRepository;
import com.territorial.auction.domain.season.repository.SeasonRepository;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeasonPassService {

    private static final String CACHE_MY_PASS = "season_pass:my:";
    private static final String CACHE_PROGRESS = "season_pass:progress:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(30);
    private static final int XP_PER_LEVEL = 1000;

    private final SeasonRepository seasonRepository;
    private final SeasonPassRepository seasonPassRepository;
    private final UserSeasonPassRepository userSeasonPassRepository;
    private final SeasonPassProgressRepository seasonPassProgressRepository;
    private final SeasonPassLevelRewardRepository seasonPassLevelRewardRepository;
    private final SeasonPassRewardClaimRepository seasonPassRewardClaimRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    public SeasonPassResponse getProgress(Long userId) {
        try {
            Object cached = redisTemplate.opsForValue().get(CACHE_PROGRESS + userId);
            if (cached instanceof SeasonPassResponse response) {
                return response;
            }
        } catch (Exception e) {
            log.warn("시즌 패스 현황 Redis 캐시 조회 실패 - userId: {}", userId, e);
        }

        Season season =
                seasonRepository
                        .findActiveSeason(LocalDateTime.now())
                        .orElseThrow(() -> new CustomException(ErrorCode.SEASON_NOT_FOUND));

        boolean hasPremiumPass =
                userSeasonPassRepository
                        .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                        .filter(pass -> pass.getExpiresAt().isAfter(LocalDateTime.now()))
                        .isPresent();

        SeasonPassProgress progress =
                seasonPassProgressRepository
                        .findByUser_IdAndSeason_Id(userId, season.getId())
                        .orElse(null);

        int currentLevel = progress != null ? progress.getLevel() : 1;
        int currentXp = progress != null ? progress.getXp() : 0;

        List<SeasonPassLevelReward> allRewards =
                seasonPassLevelRewardRepository.findBySeason_IdOrderByLevelAsc(season.getId());
        Set<Long> claimedIds =
                seasonPassRewardClaimRepository.findClaimedRewardIdsByUserIdAndSeasonId(
                        userId, season.getId());

        List<SeasonPassResponse.RewardItem> rewardItems =
                allRewards.stream()
                        .map(
                                r -> {
                                    boolean isClaimed = claimedIds.contains(r.getId());
                                    boolean isPremium =
                                            r.getTrack()
                                                    == SeasonPassLevelReward.RewardTrack.PREMIUM;
                                    boolean canClaim =
                                            currentLevel >= r.getLevel()
                                                    && (!isPremium || hasPremiumPass)
                                                    && !isClaimed;
                                    return new SeasonPassResponse.RewardItem(
                                            r.getId(),
                                            r.getLevel(),
                                            r.getTrack().name(),
                                            r.getRewardName(),
                                            isClaimed,
                                            canClaim);
                                })
                        .toList();

        SeasonPassResponse response =
                new SeasonPassResponse(
                        season.getId(),
                        "Season " + season.getSeasonNumber(),
                        hasPremiumPass ? "PREMIUM" : "FREE",
                        currentLevel,
                        currentXp,
                        XP_PER_LEVEL,
                        season.getEndedAt(),
                        rewardItems);

        try {
            redisTemplate.opsForValue().set(CACHE_PROGRESS + userId, response, CACHE_TTL);
        } catch (Exception e) {
            log.warn("시즌 패스 현황 Redis 캐시 저장 실패 - userId: {}", userId, e);
        }
        return response;
    }

    public MySeasonPassResponse getMyPass(Long userId) {
        try {
            Object cached = redisTemplate.opsForValue().get(CACHE_MY_PASS + userId);
            if (cached instanceof MySeasonPassResponse response) {
                return response;
            }
        } catch (Exception e) {
            log.warn("시즌 패스 보유 Redis 캐시 조회 실패 - userId: {}", userId, e);
        }

        MySeasonPassResponse response =
                userSeasonPassRepository
                        .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                        .filter(pass -> pass.getExpiresAt().isAfter(LocalDateTime.now()))
                        .map(MySeasonPassResponse::from)
                        .orElse(new MySeasonPassResponse(false, null));

        try {
            redisTemplate.opsForValue().set(CACHE_MY_PASS + userId, response, CACHE_TTL);
        } catch (Exception e) {
            log.warn("시즌 패스 보유 Redis 캐시 저장 실패 - userId: {}", userId, e);
        }
        return response;
    }

    @Transactional
    public PurchaseSeasonPassResponse purchase(Long userId) {
        SeasonPass pass =
                seasonPassRepository
                        .findFirstByOrderByIdDesc()
                        .orElseThrow(() -> new CustomException(ErrorCode.SEASON_PASS_NOT_FOUND));

        boolean alreadyOwns =
                userSeasonPassRepository
                        .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                        .filter(p -> p.getExpiresAt().isAfter(LocalDateTime.now()))
                        .isPresent();
        if (alreadyOwns) {
            throw new CustomException(ErrorCode.SEASON_PASS_ALREADY_OWNED);
        }

        Season season =
                seasonRepository
                        .findActiveSeason(LocalDateTime.now())
                        .orElseThrow(() -> new CustomException(ErrorCode.SEASON_NOT_FOUND));
        Wallet wallet =
                walletRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        if (wallet.getAvailableAp() < pass.getCostAp()) {
            throw new CustomException(ErrorCode.INSUFFICIENT_AP);
        }
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        wallet.spendAp(pass.getCostAp());

        LocalDateTime now = LocalDateTime.now();
        // 패스는 현재 시즌에 종속 — 만료는 시즌 종료 시각. 시즌 종료 배치가 일괄 비활성화한다.
        LocalDateTime expiresAt =
                season.getEndedAt() != null ? season.getEndedAt() : now.plusDays(30);
        UserSeasonPass userPass =
                userSeasonPassRepository.save(
                        UserSeasonPass.builder()
                                .user(user)
                                .seasonPass(pass)
                                .startedAt(now)
                                .expiresAt(expiresAt)
                                .build());

        try {
            redisTemplate
                    .opsForValue()
                    .set(CACHE_MY_PASS + userId, MySeasonPassResponse.from(userPass), CACHE_TTL);
            redisTemplate.delete(CACHE_PROGRESS + userId);
        } catch (Exception e) {
            log.warn("시즌 패스 구매 후 Redis 캐시 갱신 실패 - userId: {}", userId, e);
            redisTemplate.delete(CACHE_MY_PASS + userId);
            redisTemplate.delete(CACHE_PROGRESS + userId);
        }

        return PurchaseSeasonPassResponse.of(userPass, wallet.getAvailableAp());
    }

    @Transactional
    public ClaimRewardResponse claimReward(Long userId, Long rewardId) {
        SeasonPassLevelReward reward =
                seasonPassLevelRewardRepository
                        .findById(rewardId)
                        .orElseThrow(() -> new CustomException(ErrorCode.SEASON_REWARD_NOT_FOUND));

        SeasonPassProgress progress =
                seasonPassProgressRepository
                        .findByUser_IdAndSeason_Id(userId, reward.getSeason().getId())
                        .orElse(null);
        int currentLevel = progress != null ? progress.getLevel() : 1;
        if (currentLevel < reward.getLevel()) {
            throw new CustomException(ErrorCode.REWARD_LEVEL_NOT_REACHED);
        }

        if (reward.getTrack() == SeasonPassLevelReward.RewardTrack.PREMIUM) {
            boolean hasPremiumPass =
                    userSeasonPassRepository
                            .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                            .filter(p -> p.getExpiresAt().isAfter(LocalDateTime.now()))
                            .isPresent();
            if (!hasPremiumPass) {
                throw new CustomException(ErrorCode.REWARD_PREMIUM_REQUIRED);
            }
        }

        if (seasonPassRewardClaimRepository.existsByUser_IdAndReward_Id(userId, rewardId)) {
            throw new CustomException(ErrorCode.REWARD_ALREADY_CLAIMED);
        }

        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        seasonPassRewardClaimRepository.save(
                SeasonPassRewardClaim.builder().user(user).reward(reward).build());

        try {
            redisTemplate.delete(CACHE_PROGRESS + userId);
        } catch (Exception e) {
            log.warn("보상 수령 후 진행도 캐시 무효화 실패. userId={}", userId);
        }

        return new ClaimRewardResponse(
                reward.getId(),
                reward.getRewardName(),
                reward.getTrack().name(),
                LocalDateTime.now());
    }
}
