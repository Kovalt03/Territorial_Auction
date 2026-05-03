package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.map.LandTaxPolicy;
import com.territorial.auction.domain.map.dto.TaxLogResponse;
import com.territorial.auction.domain.map.dto.TaxStatusResponse;
import com.territorial.auction.domain.map.entity.LandTaxLog;
import com.territorial.auction.domain.map.entity.LandTaxLog.TaxStatus;
import com.territorial.auction.domain.map.repository.LandTaxLogRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LandTaxService {

    private final TerritoryRepository territoryRepository;
    private final LandTaxLogRepository landTaxLogRepository;
    private final UserSeasonPassRepository userSeasonPassRepository;

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

    @Transactional
    public void processAllUsersTax() {
        // TODO: 전체 유저 탐색 — 분산 처리 필요 (메시지 큐 등)
    }

    @Transactional
    public void processUserTax(Long userId) {
        // TODO: 세금 납부 가능 시 납부, 불가 시 영토 환수
    }

    @Transactional
    public void collectTaxes(Long userId) {
        // TODO
    }

    @Transactional
    public void enforceEviction(Long userId) {
        // TODO
    }
}
