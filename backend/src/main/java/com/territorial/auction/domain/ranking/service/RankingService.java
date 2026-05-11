package com.territorial.auction.domain.ranking.service;

import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.ranking.dto.AuctionSpendRankingResponse;
import com.territorial.auction.domain.ranking.dto.AuctionSpendRankingResponse.RankEntry;
import com.territorial.auction.domain.ranking.dto.MyRankingResponse;
import com.territorial.auction.domain.ranking.dto.TerritoryHoldRankingResponse;
import com.territorial.auction.domain.ranking.entity.SeasonTerritoryHold;
import com.territorial.auction.domain.ranking.event.AuctionSettledEvent;
import com.territorial.auction.domain.ranking.event.TerritoryHoldClosedEvent;
import com.territorial.auction.domain.ranking.event.TerritoryHoldStartedEvent;
import com.territorial.auction.domain.ranking.repository.SeasonTerritoryHoldRepository;
import com.territorial.auction.domain.season.entity.Season;
import com.territorial.auction.domain.season.repository.SeasonRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RankingService {

    private static final String TERRITORY_HOLD_KEY = "ranking:season:%d:territory_hold";
    private static final String AUCTION_SPEND_KEY = "ranking:season:%d:auction_spend";
    private static final String TERRITORY_HOLD_UPDATED_AT_KEY =
            "ranking:season:%d:territory_hold:updated_at";

    private static final Map<String, Integer> GRADE_WEIGHT =
            Map.of("S", 5, "A", 4, "B", 3, "C", 2, "D", 1);

    private final SeasonTerritoryHoldRepository seasonTerritoryHoldRepository;
    private final SeasonRepository seasonRepository;
    private final TerritoryRepository territoryRepository;
    private final StringRedisTemplate stringRedisTemplate;
    private final UserRepository userRepository;

    public TerritoryHoldRankingResponse getTerritoryHoldRanking(Long userId, int page, int size) {
        Optional<Season> seasonOpt = seasonRepository.findActiveSeason(LocalDateTime.now());
        if (seasonOpt.isEmpty()) {
            return new TerritoryHoldRankingResponse(null, List.of(), 0, 0L, null);
        }
        Season season = seasonOpt.get();
        String key = String.format(TERRITORY_HOLD_KEY, season.getId());
        LocalDateTime updatedAt = parseUpdatedAt(season.getId());

        long start = (long) page * size;
        long stop = start + size - 1;
        Set<ZSetOperations.TypedTuple<String>> tuples =
                stringRedisTemplate.opsForZSet().reverseRangeWithScores(key, start, stop);

        List<TerritoryHoldRankingResponse.RankEntry> rankings =
                buildTerritoryHoldEntries(tuples, season.getId(), start);
        int myRank = userId != null ? findMyRank(key, String.valueOf(userId)) : 0;
        long myScore = userId != null ? getMyScore(key, String.valueOf(userId)) : 0L;

        return new TerritoryHoldRankingResponse(
                season.getId(), rankings, myRank, myScore, updatedAt);
    }

    public AuctionSpendRankingResponse getAuctionSpendRanking(Long userId, int page, int size) {
        Optional<Season> seasonOpt = seasonRepository.findActiveSeason(LocalDateTime.now());
        if (seasonOpt.isEmpty()) {
            return new AuctionSpendRankingResponse(null, List.of(), 0, 0L, LocalDateTime.now());
        }
        Season season = seasonOpt.get();
        String key = String.format(AUCTION_SPEND_KEY, season.getId());

        long start = (long) page * size;
        long stop = start + size - 1;
        Set<ZSetOperations.TypedTuple<String>> tuples =
                stringRedisTemplate.opsForZSet().reverseRangeWithScores(key, start, stop);

        List<RankEntry> rankings = buildAuctionSpendEntries(tuples, start);
        int myRank = userId != null ? findMyRank(key, String.valueOf(userId)) : 0;
        long myScore = userId != null ? getMyScore(key, String.valueOf(userId)) : 0L;

        return new AuctionSpendRankingResponse(
                season.getId(), rankings, myRank, myScore, LocalDateTime.now());
    }

    public MyRankingResponse getMyRanking(Long userId) {
        Optional<Season> seasonOpt = seasonRepository.findActiveSeason(LocalDateTime.now());
        if (seasonOpt.isEmpty()) {
            return new MyRankingResponse(null, 0, 0L, 0, 0L);
        }
        Season season = seasonOpt.get();
        String holdKey = String.format(TERRITORY_HOLD_KEY, season.getId());
        String spendKey = String.format(AUCTION_SPEND_KEY, season.getId());
        String userIdStr = String.valueOf(userId);

        return new MyRankingResponse(
                season.getId(),
                findMyRank(holdKey, userIdStr),
                getMyScore(holdKey, userIdStr),
                findMyRank(spendKey, userIdStr),
                getMyScore(spendKey, userIdStr));
    }

    @EventListener
    public void handleAuctionSettled(AuctionSettledEvent event) {
        String key = String.format(AUCTION_SPEND_KEY, event.seasonId());
        stringRedisTemplate
                .opsForZSet()
                .incrementScore(key, String.valueOf(event.userId()), event.finalPrice());
        log.info(
                "경매 소비 랭킹 업데이트. userId={}, seasonId={}, price={}",
                event.userId(),
                event.seasonId(),
                event.finalPrice());
    }

    @EventListener
    @Transactional
    public void handleTerritoryHoldStarted(TerritoryHoldStartedEvent event) {
        Season season =
                seasonRepository
                        .findById(event.seasonId())
                        .orElseThrow(() -> new CustomException(ErrorCode.SEASON_NOT_FOUND));
        User user =
                userRepository
                        .findById(event.userId())
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        Territory territory =
                territoryRepository
                        .findById(event.territoryId())
                        .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));

        seasonTerritoryHoldRepository.save(
                SeasonTerritoryHold.builder()
                        .season(season)
                        .user(user)
                        .territory(territory)
                        .grade(event.grade())
                        .heldFrom(event.heldFrom())
                        .build());
        log.info(
                "영토 점유 시작 기록. userId={}, seasonId={}, territoryId={}",
                event.userId(),
                event.seasonId(),
                event.territoryId());
    }

    @EventListener
    @Transactional
    public void handleTerritoryHoldClosed(TerritoryHoldClosedEvent event) {
        seasonTerritoryHoldRepository
                .findBySeasonIdAndUserIdAndTerritoryIdAndHeldUntilIsNull(
                        event.seasonId(), event.userId(), event.territoryId())
                .ifPresent(hold -> hold.closeHold(event.heldUntil()));
        log.info(
                "영토 점유 종료 기록. userId={}, seasonId={}, territoryId={}",
                event.userId(),
                event.seasonId(),
                event.territoryId());
    }

    public void aggregateTerritoryHoldRanking(Long seasonId) {
        List<SeasonTerritoryHold> holds = seasonTerritoryHoldRepository.findAllBySeasonId(seasonId);
        Map<Long, Long> scoreByUser = calculateScoresByUser(holds);

        String key = String.format(TERRITORY_HOLD_KEY, seasonId);
        stringRedisTemplate.delete(key);
        scoreByUser.forEach(
                (uid, score) ->
                        stringRedisTemplate.opsForZSet().add(key, String.valueOf(uid), score));

        String updatedAtKey = String.format(TERRITORY_HOLD_UPDATED_AT_KEY, seasonId);
        stringRedisTemplate.opsForValue().set(updatedAtKey, LocalDateTime.now().toString());
        log.info("영토 점유 랭킹 집계 완료. seasonId={}, userCount={}", seasonId, scoreByUser.size());
    }

    // ── private ───────────────────────────────────────────────────────────────

    private LocalDateTime parseUpdatedAt(Long seasonId) {
        String raw =
                stringRedisTemplate
                        .opsForValue()
                        .get(String.format(TERRITORY_HOLD_UPDATED_AT_KEY, seasonId));
        return raw != null ? LocalDateTime.parse(raw) : null;
    }

    private int findMyRank(String key, String userIdStr) {
        Long rank = stringRedisTemplate.opsForZSet().reverseRank(key, userIdStr);
        return rank != null ? (int) (rank + 1) : 0;
    }

    private long getMyScore(String key, String userIdStr) {
        Double score = stringRedisTemplate.opsForZSet().score(key, userIdStr);
        return score != null ? score.longValue() : 0L;
    }

    private Map<Long, Long> calculateScoresByUser(List<SeasonTerritoryHold> holds) {
        Map<Long, Long> scoreByUser = new HashMap<>();
        for (SeasonTerritoryHold hold : holds) {
            long score = calculateHoldScore(hold);
            scoreByUser.merge(hold.getUser().getId(), score, Long::sum);
        }
        return scoreByUser;
    }

    private long calculateHoldScore(SeasonTerritoryHold hold) {
        LocalDateTime until =
                hold.getHeldUntil() != null ? hold.getHeldUntil() : LocalDateTime.now();
        long seconds = Duration.between(hold.getHeldFrom(), until).getSeconds();
        return seconds * gradeWeight(hold.getGrade());
    }

    private int gradeWeight(String grade) {
        return GRADE_WEIGHT.getOrDefault(grade, 0);
    }

    private List<TerritoryHoldRankingResponse.RankEntry> buildTerritoryHoldEntries(
            Set<ZSetOperations.TypedTuple<String>> tuples, Long seasonId, long start) {
        if (tuples == null) return List.of();
        List<TerritoryHoldRankingResponse.RankEntry> entries = new ArrayList<>();
        int index = 0;
        for (ZSetOperations.TypedTuple<String> tuple : tuples) {
            Long uid = Long.parseLong(tuple.getValue());
            long score = tuple.getScore() != null ? tuple.getScore().longValue() : 0L;
            String nickname = findNickname(uid);
            Map<String, Long> breakdown = buildGradeBreakdown(seasonId, uid);
            entries.add(
                    new TerritoryHoldRankingResponse.RankEntry(
                            (int) (start + index + 1), uid, nickname, score, breakdown));
            index++;
        }
        return entries;
    }

    private List<RankEntry> buildAuctionSpendEntries(
            Set<ZSetOperations.TypedTuple<String>> tuples, long start) {
        if (tuples == null) return List.of();
        List<RankEntry> entries = new ArrayList<>();
        int index = 0;
        for (ZSetOperations.TypedTuple<String> tuple : tuples) {
            Long uid = Long.parseLong(tuple.getValue());
            long score = tuple.getScore() != null ? tuple.getScore().longValue() : 0L;
            String nickname = findNickname(uid);
            entries.add(new RankEntry((int) (start + index + 1), uid, nickname, score));
            index++;
        }
        return entries;
    }

    private String findNickname(Long userId) {
        return userRepository.findById(userId).map(User::getNickname).orElse("알 수 없음");
    }

    private Map<String, Long> buildGradeBreakdown(Long seasonId, Long userId) {
        List<SeasonTerritoryHold> holds =
                seasonTerritoryHoldRepository.findBySeasonIdAndUserId(seasonId, userId);
        Map<String, Long> breakdown = new HashMap<>();
        for (SeasonTerritoryHold hold : holds) {
            breakdown.merge(hold.getGrade(), 1L, Long::sum);
        }
        return breakdown;
    }
}
