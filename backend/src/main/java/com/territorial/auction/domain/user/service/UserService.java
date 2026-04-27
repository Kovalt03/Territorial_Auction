package com.territorial.auction.domain.user.service;

import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.entity.UserSeasonPass;
import com.territorial.auction.domain.season.entity.UserTrophy;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import com.territorial.auction.domain.season.repository.UserTrophyRepository;
import com.territorial.auction.domain.user.dto.MyProfileResponse;
import com.territorial.auction.domain.user.dto.NotificationSettingResponse;
import com.territorial.auction.domain.user.dto.UpdateNotificationSettingRequest;
import com.territorial.auction.domain.user.dto.UserProfileResponse;
import com.territorial.auction.domain.user.entity.NotificationSetting;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.UserProfile;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.NotificationSettingRepository;
import com.territorial.auction.domain.user.repository.UserProfileRepository;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final HomeIslandRepository homeIslandRepository;
    private final UserSeasonPassRepository userSeasonPassRepository;
    private final TerritoryRepository territoryRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserTrophyRepository userTrophyRepository;
    private final NotificationSettingRepository notificationSettingRepository;

    public User findById(Long userId) {
        return userRepository
                .findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    public User findByEmail(String email) {
        return userRepository
                .findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    public MyProfileResponse getMyProfile(Long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Wallet wallet =
                walletRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        HomeIsland island =
                homeIslandRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));

        // TODO: Redis 캐시 우선 조회 후 미존재 시 DB 조회로 전환 필요 (TTL 30분)
        //       명세: https://www.notion.so/33c2efa4278d81a88cf3eff675a30e46 비고 참고
        Optional<UserSeasonPass> activePass =
                userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId);

        int builderCount = 1 + activePass.map(p -> p.getSeasonPass().getExtraBuilders()).orElse(0);

        int territoryCount = (int) territoryRepository.countByOwnerId(userId);

        return new MyProfileResponse(
                user.getId(),
                user.getNickname(),
                new MyProfileResponse.WalletInfo(
                        wallet.getAvailableGp(), wallet.getAvailableAp(), wallet.getLockedAp()),
                new MyProfileResponse.IslandInfo(
                        island.getId(),
                        island.getLevel(),
                        0, // TODO: 섬 건물 합산 생산량 계산으로 교체 필요 (건물 도메인 구현 후)
                        builderCount),
                activePass
                        .map(
                                p ->
                                        new MyProfileResponse.SeasonPassInfo(
                                                p.getIsActive(), p.getExpiresAt()))
                        .orElse(new MyProfileResponse.SeasonPassInfo(false, null)),
                territoryCount);
    }

    public UserProfileResponse getUserProfile(Long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        String profileImageUrl =
                userProfileRepository
                        .findById(userId)
                        .map(UserProfile::getProfileImageUrl)
                        .orElse(null);

        int level = homeIslandRepository.findByUserId(userId).map(HomeIsland::getLevel).orElse(1);

        int trophyPoints =
                userTrophyRepository.findById(userId).map(UserTrophy::getScore).orElse(0);

        int territoryCount = (int) territoryRepository.countByOwnerId(userId);

        return new UserProfileResponse(
                user.getId(),
                user.getNickname(),
                profileImageUrl,
                level,
                trophyPoints,
                territoryCount,
                null,
                user.getCreatedAt());
    }

    public NotificationSettingResponse getNotificationSetting(Long userId) {
        NotificationSetting setting =
                notificationSettingRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        return new NotificationSettingResponse(
                setting.isOutbidEnabled(),
                setting.isAuctionStartEnabled(),
                setting.isMarketingEnabled(),
                setting.getUpdatedAt());
    }

    @Transactional
    public NotificationSettingResponse updateNotificationSetting(
            Long userId, UpdateNotificationSettingRequest request) {
        NotificationSetting setting =
                notificationSettingRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        setting.update(
                request.isOutbidEnabled(),
                request.isAuctionStartEnabled(),
                request.isMarketingEnabled());
        notificationSettingRepository.save(setting);
        return new NotificationSettingResponse(
                setting.isOutbidEnabled(),
                setting.isAuctionStartEnabled(),
                setting.isMarketingEnabled(),
                setting.getUpdatedAt());
    }
}
