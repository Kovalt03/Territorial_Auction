package com.territorial.auction.domain.ranking.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.ranking.dto.AuctionSpendRankingResponse;
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
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RankingServiceTest {

    @InjectMocks private RankingService rankingService;

    @Mock private SeasonTerritoryHoldRepository seasonTerritoryHoldRepository;
    @Mock private SeasonRepository seasonRepository;
    @Mock private TerritoryRepository territoryRepository;
    @Mock private StringRedisTemplate stringRedisTemplate;
    @Mock private UserRepository userRepository;
    @Mock private ZSetOperations<String, String> zSetOperations;
    @Mock private ValueOperations<String, String> valueOperations;

    private Season season;
    private User user;
    private Territory territory;
    private SeasonTerritoryHold hold;

    @BeforeEach
    void setUp() {
        season =
                Season.builder()
                        .seasonNumber(1)
                        .startedAt(LocalDateTime.of(2026, 1, 1, 0, 0))
                        .endedAt(LocalDateTime.of(2026, 12, 31, 23, 59))
                        .build();
        ReflectionTestUtils.setField(season, "id", 1L);

        user =
                User.builder()
                        .username("testuser")
                        .email("test@example.com")
                        .passwordHash("hashed")
                        .nickname("테스터")
                        .build();
        ReflectionTestUtils.setField(user, "id", 10L);

        territory = Territory.builder().coordX(0).coordY(0).build();
        ReflectionTestUtils.setField(territory, "id", 100L);

        hold =
                SeasonTerritoryHold.builder()
                        .season(season)
                        .user(user)
                        .territory(territory)
                        .grade("S")
                        .heldFrom(LocalDateTime.of(2026, 5, 1, 0, 0))
                        .build();
        ReflectionTestUtils.setField(hold, "id", 1L);
    }

    @Nested
    @DisplayName("GetTerritoryHoldRanking")
    class GetTerritoryHoldRanking {

        @Test
        @DisplayName("시즌 존재 + Redis 데이터 있을 때 → rankings 반환")
        void success_withSeason() {
            given(seasonRepository.findActiveSeason(any(LocalDateTime.class)))
                    .willReturn(Optional.of(season));
            given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations);
            given(stringRedisTemplate.opsForValue()).willReturn(valueOperations);
            given(valueOperations.get(anyString())).willReturn(null);

            Set<ZSetOperations.TypedTuple<String>> tuples = new HashSet<>();
            tuples.add(new TestTypedTuple("10", 5000.0));
            given(zSetOperations.reverseRangeWithScores(anyString(), eq(0L), eq(9L)))
                    .willReturn(tuples);
            given(zSetOperations.reverseRank(anyString(), eq("10"))).willReturn(0L);
            given(zSetOperations.score(anyString(), eq("10"))).willReturn(5000.0);
            given(userRepository.findAllById(any())).willReturn(List.of(user));
            given(seasonTerritoryHoldRepository.findAllBySeasonId(1L)).willReturn(List.of(hold));

            TerritoryHoldRankingResponse response =
                    rankingService.getTerritoryHoldRanking(10L, 0, 10);

            assertThat(response.seasonId()).isEqualTo(1L);
            assertThat(response.rankings()).hasSize(1);
            assertThat(response.rankings().get(0).rank()).isEqualTo(1);
            assertThat(response.rankings().get(0).userId()).isEqualTo(10L);
            assertThat(response.myRank()).isEqualTo(1);
        }

        @Test
        @DisplayName("활성 시즌 없을 때 → 빈 응답 반환")
        void success_noSeason() {
            given(seasonRepository.findActiveSeason(any(LocalDateTime.class)))
                    .willReturn(Optional.empty());

            TerritoryHoldRankingResponse response =
                    rankingService.getTerritoryHoldRanking(null, 0, 10);

            assertThat(response.seasonId()).isNull();
            assertThat(response.rankings()).isEmpty();
            assertThat(response.myRank()).isNull();
        }
    }

    @Nested
    @DisplayName("GetAuctionSpendRanking")
    class GetAuctionSpendRanking {

        @Test
        @DisplayName("시즌 존재 + Redis 데이터 있을 때 → rankings 반환")
        void success_withSeason() {
            given(seasonRepository.findActiveSeason(any(LocalDateTime.class)))
                    .willReturn(Optional.of(season));
            given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations);

            Set<ZSetOperations.TypedTuple<String>> tuples = new HashSet<>();
            tuples.add(new TestTypedTuple("10", 3000.0));
            given(zSetOperations.reverseRangeWithScores(anyString(), eq(0L), eq(9L)))
                    .willReturn(tuples);
            given(zSetOperations.reverseRank(anyString(), eq("10"))).willReturn(0L);
            given(zSetOperations.score(anyString(), eq("10"))).willReturn(3000.0);
            given(userRepository.findAllById(any())).willReturn(List.of(user));

            AuctionSpendRankingResponse response =
                    rankingService.getAuctionSpendRanking(10L, 0, 10);

            assertThat(response.seasonId()).isEqualTo(1L);
            assertThat(response.rankings()).hasSize(1);
            assertThat(response.rankings().get(0).totalSpentAP()).isEqualTo(3000L);
            assertThat(response.myScore()).isEqualTo(3000L);
        }

        @Test
        @DisplayName("활성 시즌 없을 때 → 빈 응답 반환")
        void success_noSeason() {
            given(seasonRepository.findActiveSeason(any(LocalDateTime.class)))
                    .willReturn(Optional.empty());

            AuctionSpendRankingResponse response =
                    rankingService.getAuctionSpendRanking(null, 0, 10);

            assertThat(response.seasonId()).isNull();
            assertThat(response.rankings()).isEmpty();
            assertThat(response.myRank()).isNull();
        }
    }

    @Nested
    @DisplayName("GetMyRanking")
    class GetMyRanking {

        @Test
        @DisplayName("활성 시즌 존재 → 두 카테고리 순위 모두 반환")
        void success() {
            given(seasonRepository.findActiveSeason(any(LocalDateTime.class)))
                    .willReturn(Optional.of(season));
            given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations);
            given(zSetOperations.reverseRank(eq("ranking:season:1:territory_hold"), eq("10")))
                    .willReturn(2L);
            given(zSetOperations.score(eq("ranking:season:1:territory_hold"), eq("10")))
                    .willReturn(4000.0);
            given(zSetOperations.reverseRank(eq("ranking:season:1:auction_spend"), eq("10")))
                    .willReturn(4L);
            given(zSetOperations.score(eq("ranking:season:1:auction_spend"), eq("10")))
                    .willReturn(1500.0);

            MyRankingResponse response = rankingService.getMyRanking(10L);

            assertThat(response.seasonId()).isEqualTo(1L);
            assertThat(response.territoryHold().rank()).isEqualTo(3);
            assertThat(response.territoryHold().score()).isEqualTo(4000L);
            assertThat(response.auctionSpend().rank()).isEqualTo(5);
            assertThat(response.auctionSpend().totalSpentAP()).isEqualTo(1500L);
        }
    }

    @Nested
    @DisplayName("HandleAuctionSettled")
    class HandleAuctionSettled {

        @Test
        @DisplayName("이벤트 수신 → ZINCRBY 호출 확인")
        void success() {
            given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations);
            AuctionSettledEvent event = new AuctionSettledEvent(10L, 1L, 2000);

            rankingService.handleAuctionSettled(event);

            then(zSetOperations)
                    .should()
                    .incrementScore("ranking:season:1:auction_spend", "10", 2000.0);
        }
    }

    @Nested
    @DisplayName("HandleTerritoryHoldStarted")
    class HandleTerritoryHoldStarted {

        @Test
        @DisplayName("이벤트 수신 → SeasonTerritoryHold 저장 확인")
        void success() {
            TerritoryHoldStartedEvent event =
                    new TerritoryHoldStartedEvent(
                            10L, 1L, 100L, "S", LocalDateTime.of(2026, 5, 1, 0, 0));

            given(seasonRepository.findById(1L)).willReturn(Optional.of(season));
            given(userRepository.findById(10L)).willReturn(Optional.of(user));
            given(territoryRepository.findById(100L)).willReturn(Optional.of(territory));

            rankingService.handleTerritoryHoldStarted(event);

            then(seasonTerritoryHoldRepository).should().save(any(SeasonTerritoryHold.class));
        }
    }

    @Nested
    @DisplayName("HandleTerritoryHoldClosed")
    class HandleTerritoryHoldClosed {

        @Test
        @DisplayName("열린 레코드 존재 → closeHold() 호출 확인")
        void success() {
            LocalDateTime closedAt = LocalDateTime.of(2026, 5, 10, 0, 0);
            TerritoryHoldClosedEvent event = new TerritoryHoldClosedEvent(10L, 1L, 100L, closedAt);

            given(
                            seasonTerritoryHoldRepository
                                    .findBySeasonIdAndUserIdAndTerritoryIdAndHeldUntilIsNull(
                                            1L, 10L, 100L))
                    .willReturn(Optional.of(hold));

            rankingService.handleTerritoryHoldClosed(event);

            assertThat(hold.getHeldUntil()).isEqualTo(closedAt);
        }

        @Test
        @DisplayName("열린 레코드 없을 때 → 예외 없이 정상 종료 (ifPresent로 처리)")
        void notFound() {
            TerritoryHoldClosedEvent event =
                    new TerritoryHoldClosedEvent(10L, 1L, 100L, LocalDateTime.now());

            given(
                            seasonTerritoryHoldRepository
                                    .findBySeasonIdAndUserIdAndTerritoryIdAndHeldUntilIsNull(
                                            1L, 10L, 100L))
                    .willReturn(Optional.empty());

            // ifPresent 사용이므로 예외 없이 종료 — save 호출 안 됨
            rankingService.handleTerritoryHoldClosed(event);

            then(seasonTerritoryHoldRepository)
                    .should()
                    .findBySeasonIdAndUserIdAndTerritoryIdAndHeldUntilIsNull(1L, 10L, 100L);
        }
    }

    @Nested
    @DisplayName("AggregateTerritoryHoldRanking")
    class AggregateTerritoryHoldRanking {

        @Test
        @DisplayName("hold 목록 존재 → ZADD 호출 및 스코어 계산 확인")
        void success() {
            LocalDateTime heldFrom = LocalDateTime.of(2026, 5, 1, 0, 0);
            LocalDateTime heldUntil =
                    LocalDateTime.of(2026, 5, 1, 1, 0); // 3600초, grade S(5) = 18000
            SeasonTerritoryHold closedHold =
                    SeasonTerritoryHold.builder()
                            .season(season)
                            .user(user)
                            .territory(territory)
                            .grade("S")
                            .heldFrom(heldFrom)
                            .build();
            ReflectionTestUtils.setField(closedHold, "heldUntil", heldUntil);

            given(seasonTerritoryHoldRepository.findAllBySeasonId(1L))
                    .willReturn(List.of(closedHold));
            given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations);
            given(stringRedisTemplate.opsForValue()).willReturn(valueOperations);

            rankingService.aggregateTerritoryHoldRanking(1L);

            // delete 후 ZADD 호출
            then(stringRedisTemplate).should().delete("ranking:season:1:territory_hold");
            then(zSetOperations)
                    .should()
                    .add(eq("ranking:season:1:territory_hold"), eq("10"), anyDouble());
            then(valueOperations)
                    .should()
                    .set(eq("ranking:season:1:territory_hold:updated_at"), anyString());
        }
    }

    // ── ZSetOperations.TypedTuple 테스트용 구현체 ──────────────────────────────

    private static class TestTypedTuple implements ZSetOperations.TypedTuple<String> {
        private final String value;
        private final Double score;

        TestTypedTuple(String value, Double score) {
            this.value = value;
            this.score = score;
        }

        @Override
        public String getValue() {
            return value;
        }

        @Override
        public Double getScore() {
            return score;
        }

        @Override
        public int compareTo(ZSetOperations.TypedTuple<String> o) {
            return Double.compare(score, o.getScore());
        }
    }
}
