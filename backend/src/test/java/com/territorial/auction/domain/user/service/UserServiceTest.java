package com.territorial.auction.domain.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.entity.UserSeasonPass;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import com.territorial.auction.domain.user.dto.MyProfileResponse;
import com.territorial.auction.domain.user.dto.NotificationSettingResponse;
import com.territorial.auction.domain.user.dto.NotificationSettingUpdateRequest;
import com.territorial.auction.domain.user.dto.UserProfileResponse;
import com.territorial.auction.domain.user.entity.NotificationSetting;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.NotificationSettingRepository;
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
class UserServiceTest {

    @InjectMocks private UserService userService;

    @Mock private UserRepository userRepository;
    @Mock private WalletRepository walletRepository;
    @Mock private HomeIslandRepository homeIslandRepository;
    @Mock private UserSeasonPassRepository userSeasonPassRepository;
    @Mock private TerritoryRepository territoryRepository;
    @Mock private NotificationSettingRepository notificationSettingRepository;

    // ─── 공통 픽스처 ─────────────────────────────────────────────────────────

    private User sampleUser() {
        User user =
                User.builder()
                        .username("testuser")
                        .email("user@example.com")
                        .passwordHash("encoded")
                        .nickname("픽셀전사")
                        .build();
        ReflectionTestUtils.setField(user, "id", 1L);
        ReflectionTestUtils.setField(user, "createdAt", LocalDateTime.of(2026, 1, 10, 0, 0));
        return user;
    }

    private Wallet sampleWallet(User user) {
        Wallet wallet = Wallet.builder().user(user).build();
        ReflectionTestUtils.setField(wallet, "availableGp", 1500);
        ReflectionTestUtils.setField(wallet, "availableAp", 300);
        ReflectionTestUtils.setField(wallet, "lockedAp", 0);
        return wallet;
    }

    private HomeIsland sampleIsland(User user) {
        HomeIsland island = HomeIsland.builder().user(user).build();
        ReflectionTestUtils.setField(island, "id", 1L);
        return island;
    }

    private NotificationSetting sampleNotificationSetting(User user) {
        NotificationSetting setting = NotificationSetting.builder().user(user).build();
        ReflectionTestUtils.setField(setting, "updatedAt", LocalDateTime.of(2026, 4, 9, 10, 0));
        return setting;
    }

    // ─── getMyProfile() ───────────────────────────────────────────────────────

    @Nested
    @DisplayName("getMyProfile()")
    class GetMyProfile {

        @Test
        @DisplayName("정상 조회 시 MyProfileResponse 반환")
        void getMyProfile_success() {
            User user = sampleUser();
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(walletRepository.findById(1L)).willReturn(Optional.of(sampleWallet(user)));
            given(homeIslandRepository.findByUserId(1L))
                    .willReturn(Optional.of(sampleIsland(user)));
            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.empty());
            given(territoryRepository.countByOwnerId(1L)).willReturn(3L);

            MyProfileResponse response = userService.getMyProfile(1L);

            assertThat(response.userId()).isEqualTo(1L);
            assertThat(response.nickname()).isEqualTo("픽셀전사");
            assertThat(response.wallet().availableGP()).isEqualTo(1500);
            assertThat(response.wallet().availableAP()).isEqualTo(300);
            assertThat(response.wallet().lockedAP()).isEqualTo(0);
            assertThat(response.island().islandId()).isEqualTo(1L);
            assertThat(response.seasonPass().isActive()).isFalse();
            assertThat(response.territoryCount()).isEqualTo(3);
        }

        @Test
        @DisplayName("활성 시즌 패스가 있으면 seasonPass.isActive = true")
        void getMyProfile_withActiveSeasonPass() {
            User user = sampleUser();
            UserSeasonPass activePass =
                    UserSeasonPass.builder()
                            .user(user)
                            .seasonPass(null) // SeasonPass 엔티티는 이 테스트에서 불필요
                            .startedAt(LocalDateTime.now().minusDays(1))
                            .expiresAt(LocalDateTime.now().plusDays(30))
                            .build();
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(walletRepository.findById(1L)).willReturn(Optional.of(sampleWallet(user)));
            given(homeIslandRepository.findByUserId(1L))
                    .willReturn(Optional.of(sampleIsland(user)));
            given(userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(1L))
                    .willReturn(Optional.of(activePass));
            given(territoryRepository.countByOwnerId(1L)).willReturn(0L);

            MyProfileResponse response = userService.getMyProfile(1L);

            assertThat(response.seasonPass().isActive()).isTrue();
            assertThat(response.seasonPass().expiresAt()).isNotNull();
        }

        @Test
        @DisplayName("존재하지 않는 userId 시 USER_NOT_FOUND 예외")
        void getMyProfile_userNotFound() {
            given(userRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getMyProfile(99L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.USER_NOT_FOUND);
        }

        @Test
        @DisplayName("섬 정보가 없으면 ISLAND_NOT_FOUND 예외")
        void getMyProfile_islandNotFound() {
            User user = sampleUser();
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(walletRepository.findById(1L)).willReturn(Optional.of(sampleWallet(user)));
            given(homeIslandRepository.findByUserId(1L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getMyProfile(1L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.ISLAND_NOT_FOUND);
        }
    }

    // ─── getUserProfile() ─────────────────────────────────────────────────────

    @Nested
    @DisplayName("getUserProfile()")
    class GetUserProfile {

        @Test
        @DisplayName("정상 조회 시 UserProfileResponse 반환")
        void getUserProfile_success() {
            User user = sampleUser();
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(territoryRepository.countByOwnerId(1L)).willReturn(5L);

            UserProfileResponse response = userService.getUserProfile(1L);

            assertThat(response.userId()).isEqualTo(1L);
            assertThat(response.nickname()).isEqualTo("픽셀전사");
            assertThat(response.territoryCount()).isEqualTo(5);
            assertThat(response.joinedAt()).isEqualTo(LocalDateTime.of(2026, 1, 10, 0, 0));
        }

        @Test
        @DisplayName("존재하지 않는 userId 시 USER_NOT_FOUND 예외")
        void getUserProfile_userNotFound() {
            given(userRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getUserProfile(99L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.USER_NOT_FOUND);
        }
    }

    // ─── getNotificationSetting() ─────────────────────────────────────────────

    @Nested
    @DisplayName("getNotificationSetting()")
    class GetNotificationSetting {

        @Test
        @DisplayName("정상 조회 시 NotificationSettingResponse 반환")
        void getNotificationSetting_success() {
            User user = sampleUser();
            given(notificationSettingRepository.findById(1L))
                    .willReturn(Optional.of(sampleNotificationSetting(user)));

            NotificationSettingResponse response = userService.getNotificationSetting(1L);

            assertThat(response.isOutbidEnabled()).isTrue();
            assertThat(response.isAuctionStartEnabled()).isTrue();
            assertThat(response.isMarketingEnabled()).isFalse();
        }

        @Test
        @DisplayName("알림 설정이 없으면 NOTIFICATION_NOT_FOUND 예외")
        void getNotificationSetting_notFound() {
            given(notificationSettingRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getNotificationSetting(99L))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);
        }
    }

    // ─── updateNotificationSetting() ──────────────────────────────────────────

    @Nested
    @DisplayName("updateNotificationSetting()")
    class UpdateNotificationSetting {

        @Test
        @DisplayName("전체 필드 업데이트 시 변경된 값 반환")
        void updateNotificationSetting_allFields() {
            User user = sampleUser();
            NotificationSetting setting = sampleNotificationSetting(user);
            given(notificationSettingRepository.findById(1L)).willReturn(Optional.of(setting));
            given(notificationSettingRepository.save(any(NotificationSetting.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            NotificationSettingUpdateRequest request = new NotificationSettingUpdateRequest();
            request.setIsOutbidEnabled(false);
            request.setIsAuctionStartEnabled(false);
            request.setIsMarketingEnabled(true);

            NotificationSettingResponse response =
                    userService.updateNotificationSetting(1L, request);

            assertThat(response.isOutbidEnabled()).isFalse();
            assertThat(response.isAuctionStartEnabled()).isFalse();
            assertThat(response.isMarketingEnabled()).isTrue();
        }

        @Test
        @DisplayName("null 필드는 기존 값 유지 (Partial Update)")
        void updateNotificationSetting_partialUpdate() {
            User user = sampleUser();
            NotificationSetting setting = sampleNotificationSetting(user);
            // 기본값: isOutbidEnabled=true, isAuctionStartEnabled=true, isMarketingEnabled=false
            given(notificationSettingRepository.findById(1L)).willReturn(Optional.of(setting));
            given(notificationSettingRepository.save(any(NotificationSetting.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            NotificationSettingUpdateRequest request = new NotificationSettingUpdateRequest();
            request.setIsOutbidEnabled(false); // 이것만 변경
            // isAuctionStartEnabled, isMarketingEnabled 는 null → 변경 없음

            NotificationSettingResponse response =
                    userService.updateNotificationSetting(1L, request);

            assertThat(response.isOutbidEnabled()).isFalse();
            assertThat(response.isAuctionStartEnabled()).isTrue(); // 기존 유지
            assertThat(response.isMarketingEnabled()).isFalse(); // 기존 유지
        }

        @Test
        @DisplayName("알림 설정이 없으면 NOTIFICATION_NOT_FOUND 예외")
        void updateNotificationSetting_notFound() {
            given(notificationSettingRepository.findById(99L)).willReturn(Optional.empty());

            NotificationSettingUpdateRequest request = new NotificationSettingUpdateRequest();

            assertThatThrownBy(() -> userService.updateNotificationSetting(99L, request))
                    .isInstanceOf(CustomException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND);
        }

        @Test
        @DisplayName("save 호출 여부 검증")
        void updateNotificationSetting_callsSave() {
            User user = sampleUser();
            NotificationSetting setting = sampleNotificationSetting(user);
            given(notificationSettingRepository.findById(1L)).willReturn(Optional.of(setting));
            given(notificationSettingRepository.save(any(NotificationSetting.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            NotificationSettingUpdateRequest request = new NotificationSettingUpdateRequest();
            request.setIsMarketingEnabled(true);

            userService.updateNotificationSetting(1L, request);

            then(notificationSettingRepository).should().save(setting);
        }
    }
}
