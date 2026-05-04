package com.territorial.auction.domain.season.service;

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
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeasonPassService {

    private final SeasonRepository seasonRepository;
    private final SeasonPassRepository seasonPassRepository;
    private final UserSeasonPassRepository userSeasonPassRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;

    public SeasonPassResponse getProgress(Long userId) {
        Season season =
                seasonRepository
                        .findActiveSeason(LocalDateTime.now())
                        .orElseThrow(() -> new CustomException(ErrorCode.SEASON_NOT_FOUND));

        boolean hasPremiumPass =
                userSeasonPassRepository
                        .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                        .filter(pass -> pass.getExpiresAt().isAfter(LocalDateTime.now()))
                        .isPresent();

        // TODO: season_pass_progress 엔티티 구현 후 currentLevel/currentXp/rewards 연동
        return new SeasonPassResponse(
                season.getId(),
                "Season " + season.getSeasonNumber(),
                hasPremiumPass ? "PREMIUM" : "FREE",
                0,
                0,
                null,
                season.getEndedAt(),
                List.of());
    }

    public MySeasonPassResponse getMyPass(Long userId) {
        return userSeasonPassRepository
                .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                .filter(pass -> pass.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(MySeasonPassResponse::from)
                .orElse(new MySeasonPassResponse(false, null));
    }

    @Transactional
    public PurchaseSeasonPassResponse purchase(Long userId) {
        SeasonPass pass =
                seasonPassRepository
                        .findFirstByOrderByIdDesc()
                        .orElseThrow(() -> new CustomException(ErrorCode.SEASON_PASS_NOT_FOUND));
        Wallet wallet =
                walletRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (wallet.getAvailableAp() < pass.getCostAp()) {
            throw new CustomException(ErrorCode.INSUFFICIENT_AP);
        }

        wallet.spendAp(pass.getCostAp());

        Optional<UserSeasonPass> existingPass =
                userSeasonPassRepository.findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId);

        UserSeasonPass userPass;
        if (existingPass.isPresent()
                && existingPass.get().getExpiresAt().isAfter(LocalDateTime.now())) {
            existingPass.get().extend(pass.getDurationDays());
            userPass = existingPass.get();
        } else {
            User user =
                    userRepository
                            .findById(userId)
                            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
            LocalDateTime now = LocalDateTime.now();
            userPass =
                    userSeasonPassRepository.save(
                            UserSeasonPass.builder()
                                    .user(user)
                                    .seasonPass(pass)
                                    .startedAt(now)
                                    .expiresAt(now.plusDays(pass.getDurationDays()))
                                    .build());
        }

        return PurchaseSeasonPassResponse.of(userPass, wallet.getAvailableAp());
    }
}
