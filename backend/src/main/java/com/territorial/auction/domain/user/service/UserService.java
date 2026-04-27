package com.territorial.auction.domain.user.service;

import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.entity.UserSeasonPass;
import com.territorial.auction.domain.season.entity.UserTrophy;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import com.territorial.auction.domain.season.repository.UserTrophyRepository;
import com.territorial.auction.domain.user.dto.*;
import com.territorial.auction.domain.user.dto.ChangeNicknameResponse;
import com.territorial.auction.domain.user.dto.MyWalletResponse;
import com.territorial.auction.domain.user.entity.*;
import com.territorial.auction.domain.user.repository.NotificationSettingRepository;
import com.territorial.auction.domain.user.repository.UserProfileRepository;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final PasswordEncoder passwordEncoder;

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

    @Transactional
    public void deleteMe(Long userId, String password) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        if (!passwordEncoder.matches(password, user.getPasswordHash()))
            throw new CustomException(ErrorCode.INVALID_PASSWORD);

        user.updateStatus(UserStatus.WITHDRAWN);
        userRepository.save(user);
        // TODO: 탈퇴 처리 후 해당 userId의 JWT 토큰 무효화 필요
        //       Redis 블랙리스트 등록 또는 토큰 버전(tokenVersion) 증가 방식으로 구현
    }

    public NotificationSettingResponse getNotificationSetting(Long userId) {
        NotificationSetting setting =
                notificationSettingRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.NOTIFICATION_NOT_FOUND));
        return NotificationSettingResponse.from(setting);
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
        return NotificationSettingResponse.from(setting);
    }

    @Transactional(readOnly = true)
    public MyTerritoryResponse getMyTerritories(Long userId, Pageable pageable) {

        Page<Territory> territoryPage = territoryRepository.findAllByUserId(userId, pageable);

        List<MyTerritoryResponse.TerritoryInfo> territoryInfos =
                territoryPage.getContent().stream()
                        .map(
                                t ->
                                        new MyTerritoryResponse.TerritoryInfo(
                                                t.getId(),
                                                t.getGrade().getGrade(),
                                                new PositionPair(t.getCoordX(), t.getCoordY()),
                                                t.getContinent().getName(),
                                                null, // TODO: 군사 도메인 구현 후 territories.occupied_at
                                                // 연동
                                                0, // TODO: 군사 도메인 구현 후 배치 유닛 수 집계 연동
                                                false // TODO: 무적 아이템 도메인 구현 후 연동
                                                ))
                        .toList();
        return new MyTerritoryResponse((int) territoryPage.getTotalElements(), territoryInfos);
    }

    @Transactional(readOnly = true)
    public MyWalletResponse getMyWallet(Long userId) {
        Wallet wallet =
                walletRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        // TODO: 군사 도메인 구현 후 wallet.getAvailableFood()를 MyWalletResponse에 추가
        return new MyWalletResponse(
                wallet.getAvailableGp(), wallet.getAvailableAp(), wallet.getLockedAp());
    }

    @Transactional
    public ChangeNicknameResponse changeUserNickname(Long userId, String nickname) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (userRepository.existsByNickname(nickname)) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }

        user.updateNickname(nickname);
        userRepository.save(user);
        // TODO: LocalDateTime.now()는 실제 DB 저장 시각과 미세하게 다를 수 있음
        //       User 엔티티에 @LastModifiedDate updatedAt 필드 추가 후 해당 값으로 교체 권장
        return new ChangeNicknameResponse(user.getId(), user.getNickname(), LocalDateTime.now());
    }

    @Transactional
    public void changeUserPassword(Long userId, String currentPassword, String newPassword) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash()))
            throw new CustomException(ErrorCode.INVALID_PASSWORD);

        user.updatePassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
