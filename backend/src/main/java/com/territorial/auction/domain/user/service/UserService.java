package com.territorial.auction.domain.user.service;

import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.entity.UserTrophy;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import com.territorial.auction.domain.season.repository.UserTrophyRepository;
import com.territorial.auction.domain.user.dto.MyProfileResponse;
import com.territorial.auction.domain.user.dto.NotificationSettingResponse;
import com.territorial.auction.domain.user.dto.NotificationSettingUpdateRequest;
import com.territorial.auction.domain.user.dto.UserProfileResponse;
import com.territorial.auction.domain.user.entity.NotificationSetting;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.UserProfile;
import com.territorial.auction.domain.user.repository.NotificationSettingRepository;
import com.territorial.auction.domain.user.repository.UserProfileRepository;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
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
        throw new UnsupportedOperationException("not implemented");
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
            Long userId, NotificationSettingUpdateRequest request) {
        NotificationSetting setting =
                notificationSettingRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        setting.update(
                request.getIsOutbidEnabled(),
                request.getIsAuctionStartEnabled(),
                request.getIsMarketingEnabled());
        notificationSettingRepository.save(setting);
        return new NotificationSettingResponse(
                setting.isOutbidEnabled(),
                setting.isAuctionStartEnabled(),
                setting.isMarketingEnabled(),
                setting.getUpdatedAt());
    }
}
