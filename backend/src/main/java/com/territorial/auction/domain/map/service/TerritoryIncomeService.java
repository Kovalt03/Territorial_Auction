package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.map.TerritoryIncomePolicy;
import com.territorial.auction.domain.map.dto.CollectTerritoryResponse;
import com.territorial.auction.domain.map.entity.BonusTile;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.TerritoryProductionLog;
import com.territorial.auction.domain.map.entity.TerritoryProductionLog.ProductionReason;
import com.territorial.auction.domain.map.repository.BonusTileRepository;
import com.territorial.auction.domain.map.repository.TerritoryProductionLogRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TerritoryIncomeService {

    private final TerritoryRepository territoryRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final BonusTileRepository bonusTileRepository;
    private final TerritoryProductionLogRepository productionLogRepository;
    private final UserRepository userRepository;

    private record RateBreakdown(int baseRate, int bonusTileRate, int adjacentRate) {
        int total() {
            return baseRate + bonusTileRate + adjacentRate;
        }
    }

    private record GpBreakdown(int credited, int baseGp, int bonusTileGp, int adjacentGp) {}

    @Transactional
    public CollectTerritoryResponse collect(Long userId, Long territoryId) {
        Territory territory =
                territoryRepository
                        .findByIdWithDetails(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));
        validateOwner(territory, userId);
        validateOccupied(territory);

        BuildingInstance storage =
                buildingInstanceRepository
                        .findStorageByTerritoryIdWithLock(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_NOT_FOUND));

        if (storage.isDestroyed()) {
            return destroyedStorageResponse(territory, storage);
        }

        int creditedGp = doSettle(territory, storage);
        return buildCollectResponse(territory, storage, creditedGp);
    }

    public int calculateEffectiveRate(Territory territory) {
        if (territory.getOwner() == null) return 0;
        return computeRateBreakdown(territory).total();
    }

    private int doSettle(Territory territory, BuildingInstance storage) {
        LocalDateTime now = LocalDateTime.now();
        if (territory.getLastProducedAt() == null) {
            territory.updateLastProducedAt(now);
            return 0;
        }
        long elapsedMinutes = ChronoUnit.MINUTES.between(territory.getLastProducedAt(), now);
        if (elapsedMinutes < 1) return 0;

        GpBreakdown gp = computeGpBreakdown(territory, storage, elapsedMinutes);
        if (gp.credited() > 0) {
            storage.addStoredGp(gp.credited());
            User ownerRef = userRepository.getReferenceById(territory.getOwner().getId());
            saveProductionLogs(territory, ownerRef, gp);
            log.info(
                    "영토 수입 정산. territoryId={}, ownerId={}, creditedGp={}, elapsedMinutes={}",
                    territory.getId(),
                    territory.getOwner().getId(),
                    gp.credited(),
                    elapsedMinutes);
        }
        territory.updateLastProducedAt(now);
        return gp.credited();
    }

    private GpBreakdown computeGpBreakdown(
            Territory territory, BuildingInstance storage, long elapsed) {
        RateBreakdown rates = computeRateBreakdown(territory);
        int cap =
                Math.max(
                        0,
                        storage.getLevel() * TerritoryIncomePolicy.STORAGE_CAPACITY_PER_LEVEL
                                - storage.getStoredGp());
        long totalRaw = (long) rates.total() * elapsed;
        int credited = (int) Math.min(totalRaw, cap);
        if (credited == 0 || totalRaw == 0) return new GpBreakdown(0, 0, 0, 0);

        double scale = (double) credited / totalRaw;
        int baseGp = (int) Math.floor((long) rates.baseRate() * elapsed * scale);
        int bonusTileGp = (int) Math.floor((long) rates.bonusTileRate() * elapsed * scale);
        return new GpBreakdown(credited, baseGp, bonusTileGp, credited - baseGp - bonusTileGp);
    }

    private RateBreakdown computeRateBreakdown(Territory territory) {
        double base = territory.getBaseProductionRate();
        double grade = territory.getGrade().getProductionMultiplier().doubleValue();
        BonusTile bonusTile = bonusTileRepository.findByTerritoryId(territory.getId()).orElse(null);
        double btMul = bonusTile != null ? bonusTile.getMultiplier().doubleValue() : 1.0;
        int adjacentCount =
                territoryRepository.countAdjacentOccupiedByOwner(
                        territory.getCoordX(),
                        territory.getCoordY(),
                        territory.getOwner().getId(),
                        territory.getId(),
                        Territory.TerritoryStatus.OCCUPIED);

        int baseRate = (int) Math.floor(base * grade);
        int rateWithBt = (int) Math.floor(base * grade * btMul);
        int totalRate =
                (int)
                        Math.floor(
                                base
                                        * grade
                                        * btMul
                                        * (1.0
                                                + adjacentCount
                                                        * TerritoryIncomePolicy
                                                                .ADJACENT_BONUS_RATE));
        return new RateBreakdown(baseRate, rateWithBt - baseRate, totalRate - rateWithBt);
    }

    private void saveProductionLogs(Territory territory, User ownerRef, GpBreakdown gp) {
        if (gp.baseGp() > 0) saveLog(territory, ownerRef, gp.baseGp(), ProductionReason.BASE);
        if (gp.bonusTileGp() > 0)
            saveLog(territory, ownerRef, gp.bonusTileGp(), ProductionReason.BONUS_TILE);
        if (gp.adjacentGp() > 0)
            saveLog(territory, ownerRef, gp.adjacentGp(), ProductionReason.ADJACENT_BONUS);
    }

    private void saveLog(Territory territory, User ownerRef, int amount, ProductionReason reason) {
        productionLogRepository.save(
                TerritoryProductionLog.builder()
                        .territory(territory)
                        .owner(ownerRef)
                        .amount(amount)
                        .reason(reason)
                        .build());
    }

    private CollectTerritoryResponse destroyedStorageResponse(
            Territory territory, BuildingInstance storage) {
        return new CollectTerritoryResponse(
                0, storage.getStoredGp(), 0, territory.getLastProducedAt(), 0);
    }

    private CollectTerritoryResponse buildCollectResponse(
            Territory territory, BuildingInstance storage, int creditedGp) {
        return new CollectTerritoryResponse(
                creditedGp,
                storage.getStoredGp(),
                calculateEffectiveRate(territory),
                territory.getLastProducedAt(),
                storage.getLevel() * TerritoryIncomePolicy.STORAGE_CAPACITY_PER_LEVEL);
    }

    private void validateOwner(Territory territory, Long userId) {
        if (territory.getOwner() == null || !territory.getOwner().getId().equals(userId)) {
            throw new CustomException(ErrorCode.NOT_TERRITORY_OWNER);
        }
    }

    private void validateOccupied(Territory territory) {
        if (territory.getStatus() != Territory.TerritoryStatus.OCCUPIED
                || territory.getOccupiedUntil() == null
                || territory.getOccupiedUntil().isBefore(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.TERRITORY_NOT_OCCUPIED);
        }
    }
}
