package com.territorial.auction.domain.admin.service;

import com.territorial.auction.domain.admin.dto.AdminAdjustWalletRequest;
import com.territorial.auction.domain.admin.dto.AdminChangeUserStatusRequest;
import com.territorial.auction.domain.admin.dto.AdminUserDetailResponse;
import com.territorial.auction.domain.admin.dto.AdminUserListResponse;
import com.territorial.auction.domain.admin.dto.AdminUserResponse;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.UserStatus;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TerritoryRepository territoryRepository;
    private final AdminAuditLogger adminAuditLogger;

    public AdminUserListResponse getUsers(String keyword, UserStatus status, Pageable pageable) {
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        Page<User> page = userRepository.searchForAdmin(status, kw, pageable);
        List<AdminUserResponse> users =
                page.getContent().stream().map(AdminUserResponse::from).toList();
        return new AdminUserListResponse(
                page.getTotalElements(), page.getNumber(), page.getSize(), users);
    }

    public AdminUserDetailResponse getUser(Long userId) {
        User user = findUserOrThrow(userId);
        return toDetail(user, findWalletOrThrow(userId));
    }

    @Transactional
    public AdminUserDetailResponse changeStatus(
            Long adminUserId, Long userId, AdminChangeUserStatusRequest request) {
        User user = findUserOrThrow(userId);
        validateStatusChange(user, request.status());

        UserStatus before = user.getStatus();
        user.updateStatus(request.status());

        adminAuditLogger.record(
                adminUserId,
                "USER_STATUS_CHANGE",
                "USER",
                userId,
                Map.of("before", before, "after", request.status(), "reason", request.reason()));
        return toDetail(user, findWalletOrThrow(userId));
    }

    @Transactional
    public AdminUserDetailResponse adjustWallet(
            Long adminUserId, Long userId, AdminAdjustWalletRequest request) {
        User user = findUserOrThrow(userId);
        int apDelta = request.apDelta() != null ? request.apDelta() : 0;
        int gpDelta = request.gpDelta() != null ? request.gpDelta() : 0;
        if (apDelta == 0 && gpDelta == 0) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        Wallet wallet =
                walletRepository
                        .findByIdWithLock(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.WALLET_NOT_FOUND));
        if (apDelta != 0) wallet.adjustAvailableAp(apDelta);
        if (gpDelta != 0) wallet.adjustAvailableGp(gpDelta);

        Map<String, Object> detail = new HashMap<>();
        detail.put("apDelta", apDelta);
        detail.put("gpDelta", gpDelta);
        detail.put("reason", request.reason());
        adminAuditLogger.record(adminUserId, "WALLET_ADJUST", "USER", userId, detail);
        return toDetail(user, wallet);
    }

    private void validateStatusChange(User user, UserStatus status) {
        if (status == UserStatus.WITHDRAWN) {
            throw new CustomException(ErrorCode.INVALID_USER_STATUS);
        }
        if (user.isAdmin() && status == UserStatus.SUSPENDED) {
            throw new CustomException(ErrorCode.CANNOT_SUSPEND_ADMIN);
        }
    }

    private User findUserOrThrow(Long userId) {
        return userRepository
                .findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Wallet findWalletOrThrow(Long userId) {
        return walletRepository
                .findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.WALLET_NOT_FOUND));
    }

    private AdminUserDetailResponse toDetail(User user, Wallet wallet) {
        long territoryCount = territoryRepository.countByOwnerId(user.getId());
        return new AdminUserDetailResponse(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getEmail(),
                user.getStatus().name(),
                user.getRole().name(),
                user.getCreatedAt(),
                wallet.getAvailableAp(),
                wallet.getLockedAp(),
                wallet.getAvailableGp(),
                wallet.getAvailableFood(),
                territoryCount);
    }
}
