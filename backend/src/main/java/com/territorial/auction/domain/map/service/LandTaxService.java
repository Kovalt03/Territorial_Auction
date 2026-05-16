package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.map.LandTaxPolicy;
import com.territorial.auction.domain.map.dto.TaxLogResponse;
import com.territorial.auction.domain.map.dto.TaxStatusResponse;
import com.territorial.auction.domain.map.entity.LandTaxLog;
import com.territorial.auction.domain.map.entity.LandTaxLog.TaxStatus;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.LandTaxLogRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LandTaxService {

    private final TerritoryRepository territoryRepository;
    private final LandTaxLogRepository landTaxLogRepository;
    private final UserSeasonPassRepository userSeasonPassRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

    public TaxStatusResponse getLandTaxStatus(Long userId) {
        int territoryCount = (int) territoryRepository.countByOwnerId(userId);

        int seasonPassExemptBonus =
                userSeasonPassRepository
                        .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                        .filter(pass -> pass.getExpiresAt().isAfter(LocalDateTime.now()))
                        .map(pass -> pass.getSeasonPass().getTaxExemptBonus())
                        .orElse(0);

        int baseExemptedCount = Math.min(territoryCount, LandTaxPolicy.BASE_EXEMPT_COUNT);
        int baseTaxableCount = Math.max(0, territoryCount - LandTaxPolicy.BASE_EXEMPT_COUNT);
        int baseDailyTax = LandTaxPolicy.calculateDailyTax(baseTaxableCount);

        int effectiveExemptCount = LandTaxPolicy.BASE_EXEMPT_COUNT + seasonPassExemptBonus;
        int finalTaxableCount = Math.max(0, territoryCount - effectiveExemptCount);
        int finalDailyGP = LandTaxPolicy.calculateDailyTax(finalTaxableCount);

        return new TaxStatusResponse(
                territoryCount,
                new TaxStatusResponse.TaxBreakdown(
                        baseExemptedCount, baseTaxableCount, baseDailyTax),
                seasonPassExemptBonus,
                effectiveExemptCount,
                finalDailyGP,
                LocalDateTime.now().truncatedTo(ChronoUnit.DAYS).plusDays(1));
    }

    public TaxLogResponse getLandTaxLogs(Long userId, TaxStatus status, Pageable pageable) {
        Page<LandTaxLog> taxLogs =
                (status == null)
                        ? landTaxLogRepository.findByUserIdOrderByChargedAtDesc(userId, pageable)
                        : landTaxLogRepository.findByUserIdAndStatusOrderByChargedAtDesc(
                                userId, status, pageable);

        List<TaxLogResponse.TaxLogItem> logs =
                taxLogs.getContent().stream()
                        .map(
                                log ->
                                        new TaxLogResponse.TaxLogItem(
                                                log.getId(),
                                                log.getChargedAt(),
                                                log.getTerritoryCount(),
                                                log.getGpCharged(),
                                                log.getStatus()))
                        .toList();

        return new TaxLogResponse(taxLogs.getTotalElements(), logs);
    }

    // 개별 processUserTax가 독립 트랜잭션으로 실행되도록 트랜잭션 없이 루프 실행
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void processAllUsersTax() {
        List<Long> ownerIds =
                territoryRepository.findAllDistinctOwnerIds(Territory.TerritoryStatus.OCCUPIED);
        for (Long userId : ownerIds) {
            try {
                processUserTax(userId);
            } catch (Exception e) {
                log.error("토지세 처리 실패. userId={}", userId, e);
            }
        }
    }

    @Transactional
    public void processUserTax(Long userId) {
        int territoryCount = (int) territoryRepository.countByOwnerId(userId);
        if (territoryCount == 0) {
            return;
        }

        int taxAmount = calculateTaxAmount(userId, territoryCount);
        if (taxAmount == 0) {
            saveLog(userId, territoryCount, 0, TaxStatus.EXEMPT);
            return;
        }

        applyTaxOrEvict(userId, territoryCount, taxAmount);
    }

    private int calculateTaxAmount(Long userId, int territoryCount) {
        int seasonPassExemptBonus = resolveSeasonPassExemptBonus(userId);
        int effectiveExemptCount = LandTaxPolicy.BASE_EXEMPT_COUNT + seasonPassExemptBonus;
        int taxableCount = Math.max(0, territoryCount - effectiveExemptCount);
        return LandTaxPolicy.calculateDailyTax(taxableCount);
    }

    private void applyTaxOrEvict(Long userId, int territoryCount, int taxAmount) {
        Wallet wallet =
                walletRepository
                        .findById(userId)
                        .orElseThrow(
                                () -> new IllegalStateException("지갑을 찾을 수 없음. userId=" + userId));

        if (wallet.getAvailableGp() >= taxAmount) {
            wallet.spendGp(taxAmount);
            saveLog(userId, territoryCount, taxAmount, TaxStatus.PAID);
            log.info(
                    "토지세 납부 완료. userId={}, taxAmount={}, territoryCount={}",
                    userId,
                    taxAmount,
                    territoryCount);
        } else {
            enforceEviction(userId);
            saveLog(userId, territoryCount, 0, TaxStatus.FAILED);
        }
    }

    private void enforceEviction(Long userId) {
        List<Territory> territories =
                territoryRepository.findAllOccupiedByOwnerId(
                        userId, Territory.TerritoryStatus.OCCUPIED);
        LocalDateTime nextAuctionAt = LocalDateTime.now().plusHours(1);
        for (Territory territory : territories) {
            territory.release(nextAuctionAt);
        }
        log.info("토지세 미납으로 영토 환수. userId={}, territoryCount={}", userId, territories.size());
    }

    private int resolveSeasonPassExemptBonus(Long userId) {
        return userSeasonPassRepository
                .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                .filter(pass -> pass.getExpiresAt().isAfter(LocalDateTime.now()))
                .map(pass -> pass.getSeasonPass().getTaxExemptBonus())
                .orElse(0);
    }

    private void saveLog(Long userId, int territoryCount, int gpCharged, TaxStatus status) {
        User userRef = userRepository.getReferenceById(userId);
        landTaxLogRepository.save(
                LandTaxLog.builder()
                        .user(userRef)
                        .territoryCount(territoryCount)
                        .gpCharged(gpCharged)
                        .status(status)
                        .chargedAt(LocalDateTime.now())
                        .build());
    }
}
