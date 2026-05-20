package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.map.TerritoryIncomePolicy;
import com.territorial.auction.domain.map.dto.CollectTerritoryResponse;
import com.territorial.auction.domain.map.entity.BonusTile;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.TerritoryProductionLog;
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
                        .findActiveStorageByTerritoryId(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_NOT_FOUND));

        int creditedGp = doSettle(territory, storage);
        int storageCapacity = storage.getLevel() * TerritoryIncomePolicy.STORAGE_CAPACITY_PER_LEVEL;

        return new CollectTerritoryResponse(
                creditedGp,
                storage.getStoredGp(),
                calculateEffectiveRate(territory),
                territory.getLastProducedAt(),
                storageCapacity);
    }

    public int calculateEffectiveRate(Territory territory) {
        if (territory.getOwner() == null) return 0;

        double rate = territory.getBaseProductionRate();
        rate *= territory.getGrade().getProductionMultiplier().doubleValue();

        BonusTile bonusTile = bonusTileRepository.findByTerritoryId(territory.getId()).orElse(null);
        if (bonusTile != null) {
            rate *= bonusTile.getMultiplier().doubleValue();
        }

        int adjacentCount =
                territoryRepository.countAdjacentOccupiedByOwner(
                        territory.getCoordX(),
                        territory.getCoordY(),
                        territory.getOwner().getId(),
                        territory.getId(),
                        Territory.TerritoryStatus.OCCUPIED);
        rate *= (1.0 + adjacentCount * TerritoryIncomePolicy.ADJACENT_BONUS_RATE);

        return (int) Math.floor(rate);
    }

    private int doSettle(Territory territory, BuildingInstance storage) {
        LocalDateTime now = LocalDateTime.now();

        if (territory.getLastProducedAt() == null) {
            territory.updateLastProducedAt(now);
            return 0;
        }

        long elapsedMinutes = ChronoUnit.MINUTES.between(territory.getLastProducedAt(), now);
        if (elapsedMinutes < 1) return 0;

        int effectiveRate = calculateEffectiveRate(territory);
        long totalGp = (long) effectiveRate * elapsedMinutes;

        int storageCapacity = storage.getLevel() * TerritoryIncomePolicy.STORAGE_CAPACITY_PER_LEVEL;
        int availableSpace = Math.max(0, storageCapacity - storage.getStoredGp());
        int creditedGp = (int) Math.min(totalGp, availableSpace);

        if (creditedGp > 0) {
            storage.addStoredGp(creditedGp);
            User ownerRef = userRepository.getReferenceById(territory.getOwner().getId());
            productionLogRepository.save(
                    TerritoryProductionLog.builder()
                            .territory(territory)
                            .owner(ownerRef)
                            .amount(creditedGp)
                            .reason(TerritoryProductionLog.ProductionReason.BASE)
                            .build());
            log.info(
                    "영토 수입 정산. territoryId={}, ownerId={}, creditedGp={}, elapsedMinutes={}",
                    territory.getId(),
                    territory.getOwner().getId(),
                    creditedGp,
                    elapsedMinutes);
        }

        territory.updateLastProducedAt(now);
        return creditedGp;
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
