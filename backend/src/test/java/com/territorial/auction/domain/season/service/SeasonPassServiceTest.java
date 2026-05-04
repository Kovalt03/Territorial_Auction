package com.territorial.auction.domain.season.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.territorial.auction.domain.season.dto.MySeasonPassResponse;
import com.territorial.auction.domain.season.dto.PurchaseSeasonPassResponse;
import com.territorial.auction.domain.season.dto.SeasonPassResponse;
import com.territorial.auction.domain.season.entity.Season;
import com.territorial.auction.domain.season.entity.SeasonPass;
import com.territorial.auction.domain.season.entity.UserSeasonPass;
import com.territorial.auction.domain.season.repository.SeasonPassRepository;
import com.territorial.auction.domain.season.repository.SeasonRepository;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SeasonPassServiceTest {

    @InjectMocks private SeasonPassService seasonPassService;

    @Mock private SeasonRepository seasonRepository;
    @Mock private SeasonPassRepository seasonPassRepository;
    @Mock private UserSeasonPassRepository userSeasonPassRepository;
    @Mock private UserRepository userRepository;
    @Mock private WalletRepository walletRepository;

    // ─── 공통 픽스처 ─────────────────────────────────────────────────────────

    private SeasonPass buildSeasonPass(Long id, int costAp, int durationDays) {
        SeasonPass pass =
                SeasonPass.builder()
                        .name("Standard Pass")
                        .costAp(costAp)
                        .durationDays(durationDays)
                        .islandBonusPct(10)
                        .extraBuilders(1)
                        .taxExemptBonus(2)
                        .build();
        ReflectionTestUtils.setField(pass, "id", id);
        return pass;
    }

    private Season buildSeason(Long id, int number) {
        Season season =
                Season.builder()
                        .seasonNumber(number)
                        .startedAt(LocalDateTime.now().minusDays(30))
                        .endedAt(LocalDateTime.now().plusDays(30))
                        .build();
        ReflectionTestUtils.setField(season, "id", id);
        return season;
    }

    private Wallet walletWithAp(int availableAp) {
        Wallet wallet = org.mockito.Mockito.mock(Wallet.class);
        given(wallet.getAvailableAp()).willReturn(availableAp);
        return wallet;
    }

    // ─── getMyPass() ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getMyPass()")
    class GetMyPass {

        @Test
        @DisplayName("보유한 시즌패스 없음 - hasSeasonPass=false, seasonPass=null")
        void noPass_returnsFalse() {
            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.empty());

            MySeasonPassResponse response = seasonPassService.getMyPass(1L);

            assertThat(response.hasSeasonPass()).isFalse();
            assertThat(response.seasonPass()).isNull();
        }

        @Test
        @DisplayName("유효한 시즌패스 존재 - 모든 필드 정확히 매핑")
        void validPass_allFieldsMappedCorrectly() {
            SeasonPass pass = buildSeasonPass(7L, 100, 30);
            LocalDateTime startedAt = LocalDateTime.of(2026, 5, 1, 0, 0, 0);
            LocalDateTime expiresAt = LocalDateTime.of(2026, 6, 1, 0, 0, 0);
            UserSeasonPass userPass =
                    UserSeasonPass.builder()
                            .seasonPass(pass)
                            .startedAt(startedAt)
                            .expiresAt(expiresAt)
                            .build();

            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.of(userPass));

            MySeasonPassResponse response = seasonPassService.getMyPass(1L);

            assertThat(response.hasSeasonPass()).isTrue();
            MySeasonPassResponse.SeasonPassInfo info = response.seasonPass();
            assertThat(info.seasonPassId()).isEqualTo(7L);
            assertThat(info.name()).isEqualTo("Standard Pass");
            assertThat(info.startedAt()).isEqualTo(startedAt);
            assertThat(info.expiresAt()).isEqualTo(expiresAt);
            assertThat(info.daysRemaining()).isPositive();
            assertThat(info.benefits().islandBonusPct()).isEqualTo(10);
            assertThat(info.benefits().extraBuilders()).isEqualTo(1);
            assertThat(info.benefits().taxExemptBonus()).isEqualTo(2);
        }

        @Test
        @DisplayName("만료된 시즌패스 - hasSeasonPass=false, seasonPass=null")
        void expiredPass_returnsFalse() {
            SeasonPass pass = buildSeasonPass(1L, 100, 30);
            UserSeasonPass expiredPass =
                    UserSeasonPass.builder()
                            .seasonPass(pass)
                            .startedAt(LocalDateTime.now().minusDays(31))
                            .expiresAt(LocalDateTime.now().minusMinutes(1))
                            .build();

            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.of(expiredPass));

            MySeasonPassResponse response = seasonPassService.getMyPass(1L);

            assertThat(response.hasSeasonPass()).isFalse();
            assertThat(response.seasonPass()).isNull();
        }
    }

    // ─── purchase() ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("purchase()")
    class Purchase {

        @Test
        @DisplayName("AP 충분 + 기존 패스 없음 - 새 UserSeasonPass 저장")
        void sufficientAp_noExisting_createsNew() {
            SeasonPass pass = buildSeasonPass(1L, 100, 30);
            Wallet wallet = walletWithAp(500);
            User user = org.mockito.Mockito.mock(User.class);
            LocalDateTime beforePurchase = LocalDateTime.now();

            given(seasonPassRepository.findFirstByOrderByIdDesc()).willReturn(Optional.of(pass));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));
            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.empty());
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(userSeasonPassRepository.save(any())).willAnswer(inv -> inv.getArgument(0));

            PurchaseSeasonPassResponse response = seasonPassService.purchase(1L);

            then(wallet).should().spendAp(100);
            then(userSeasonPassRepository).should().save(any(UserSeasonPass.class));
            assertThat(response.seasonPassId()).isEqualTo(1L);
            assertThat(response.costAP()).isEqualTo(100);
            assertThat(response.expiresAt()).isAfter(beforePurchase.plusDays(29));
        }

        @Test
        @DisplayName("AP 충분 + 유효한 기존 패스 존재 - 만료일 연장")
        void sufficientAp_existingValid_extendsExpiry() {
            SeasonPass pass = buildSeasonPass(1L, 100, 30);
            Wallet wallet = walletWithAp(500);
            UserSeasonPass existingPass = org.mockito.Mockito.mock(UserSeasonPass.class);
            given(existingPass.getExpiresAt()).willReturn(LocalDateTime.now().plusDays(10));

            given(seasonPassRepository.findFirstByOrderByIdDesc()).willReturn(Optional.of(pass));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));
            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.of(existingPass));
            given(existingPass.getSeasonPass()).willReturn(pass);
            given(existingPass.getStartedAt()).willReturn(LocalDateTime.now().minusDays(20));

            seasonPassService.purchase(1L);

            then(wallet).should().spendAp(100);
            then(existingPass).should().extend(30);
            then(userSeasonPassRepository).should(org.mockito.Mockito.never()).save(any());
        }

        @Test
        @DisplayName("AP 부족 - INSUFFICIENT_AP 예외")
        void insufficientAp_throwsException() {
            SeasonPass pass = buildSeasonPass(1L, 1000, 30);
            Wallet wallet = walletWithAp(100);

            given(seasonPassRepository.findFirstByOrderByIdDesc()).willReturn(Optional.of(pass));
            given(walletRepository.findById(1L)).willReturn(Optional.of(wallet));

            assertThatThrownBy(() -> seasonPassService.purchase(1L))
                    .isInstanceOf(CustomException.class)
                    .extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.INSUFFICIENT_AP);
        }

        @Test
        @DisplayName("시즌패스 없음 - SEASON_PASS_NOT_FOUND 예외")
        void noSeasonPass_throwsException() {
            given(seasonPassRepository.findFirstByOrderByIdDesc()).willReturn(Optional.empty());

            assertThatThrownBy(() -> seasonPassService.purchase(1L))
                    .isInstanceOf(CustomException.class)
                    .extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.SEASON_PASS_NOT_FOUND);
        }
    }

    // ─── getProgress() ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getProgress()")
    class GetProgress {

        @Test
        @DisplayName("시즌패스 보유 유저 - passType=PREMIUM")
        void withSeasonPass_returnsPremium() {
            Season season = buildSeason(3L, 3);
            SeasonPass pass = buildSeasonPass(1L, 100, 30);
            UserSeasonPass userPass =
                    UserSeasonPass.builder()
                            .seasonPass(pass)
                            .startedAt(LocalDateTime.now().minusDays(5))
                            .expiresAt(LocalDateTime.now().plusDays(25))
                            .build();

            given(seasonRepository.findActiveSeason(any())).willReturn(Optional.of(season));
            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.of(userPass));

            SeasonPassResponse response = seasonPassService.getProgress(1L);

            assertThat(response.seasonId()).isEqualTo(3L);
            assertThat(response.seasonName()).isEqualTo("Season 3");
            assertThat(response.passType()).isEqualTo("PREMIUM");
            assertThat(response.seasonEndsAt()).isEqualTo(season.getEndedAt());
        }

        @Test
        @DisplayName("시즌패스 미보유 유저 - passType=FREE")
        void withoutSeasonPass_returnsFree() {
            Season season = buildSeason(3L, 3);

            given(seasonRepository.findActiveSeason(any())).willReturn(Optional.of(season));
            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.empty());

            SeasonPassResponse response = seasonPassService.getProgress(1L);

            assertThat(response.passType()).isEqualTo("FREE");
        }

        @Test
        @DisplayName("진행 중인 시즌 없음 - SEASON_NOT_FOUND 예외")
        void noActiveSeason_throwsException() {
            given(seasonRepository.findActiveSeason(any())).willReturn(Optional.empty());

            assertThatThrownBy(() -> seasonPassService.getProgress(1L))
                    .isInstanceOf(CustomException.class)
                    .extracting(e -> ((CustomException) e).getErrorCode())
                    .isEqualTo(ErrorCode.SEASON_NOT_FOUND);
        }
    }
}
