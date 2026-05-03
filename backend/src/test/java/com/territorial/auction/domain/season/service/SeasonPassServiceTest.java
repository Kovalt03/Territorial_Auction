package com.territorial.auction.domain.season.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.territorial.auction.domain.season.dto.MySeasonPassResponse;
import com.territorial.auction.domain.season.entity.SeasonPass;
import com.territorial.auction.domain.season.entity.UserSeasonPass;
import com.territorial.auction.domain.season.repository.SeasonPassRepository;
import com.territorial.auction.domain.season.repository.SeasonRepository;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
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

    // ─── 공통 픽스처 ─────────────────────────────────────────────────────────

    private SeasonPass buildSeasonPass(Long id) {
        SeasonPass pass =
                SeasonPass.builder()
                        .name("Standard Pass")
                        .costAp(100)
                        .islandBonusPct(10)
                        .extraBuilders(1)
                        .taxExemptBonus(2)
                        .build();
        ReflectionTestUtils.setField(pass, "id", id);
        return pass;
    }

    // ─── getMyPass() ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getMyPass()")
    class GetMyPass {

        @Test
        @DisplayName("보유한 시즌패스 없음 - hasSeasonPass=false, seasonPassInfo=null")
        void noPass_returnsFalse() {
            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.empty());

            MySeasonPassResponse response = seasonPassService.getMyPass(1L);

            assertThat(response.hasSeasonPass()).isFalse();
            assertThat(response.seasonPassInfo()).isNull();
        }

        @Test
        @DisplayName("유효한 시즌패스 존재 - 모든 필드 정확히 매핑")
        void validPass_allFieldsMappedCorrectly() {
            SeasonPass pass = buildSeasonPass(7L);
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
            MySeasonPassResponse.SeasonPassInfo info = response.seasonPassInfo();
            assertThat(info.seasonPassId()).isEqualTo(7L);
            assertThat(info.name()).isEqualTo("Standard Pass");
            assertThat(info.startedAt()).isEqualTo(startedAt);
            assertThat(info.expiresAt()).isEqualTo(expiresAt);
            assertThat(info.benefitInfo().islandBonusPct()).isEqualTo(10);
            assertThat(info.benefitInfo().extraBuilders()).isEqualTo(1);
            assertThat(info.benefitInfo().taxExemptBonus()).isEqualTo(2);
        }

        @Test
        @DisplayName("만료된 시즌패스 - hasSeasonPass=false, seasonPassInfo=null")
        void expiredPass_returnsFalse() {
            SeasonPass pass = buildSeasonPass(1L);
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
            assertThat(response.seasonPassInfo()).isNull();
        }
    }
}
