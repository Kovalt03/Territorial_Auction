package com.territorial.auction.domain.military.service;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.military.MilitaryPolicy;
import com.territorial.auction.domain.military.entity.SiegeEvent;
import com.territorial.auction.domain.military.entity.SiegeResult;
import com.territorial.auction.domain.military.entity.UnitInstance;
import com.territorial.auction.domain.military.event.CastleDestroyedEvent;
import com.territorial.auction.domain.military.repository.SiegeResultRepository;
import com.territorial.auction.domain.military.repository.UnitInstanceRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SiegeService {

    private final SiegeResultRepository siegeResultRepository;
    private final UnitInstanceRepository unitInstanceRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final WalletRepository walletRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void resolveOneSiege(SiegeEvent event) {
        Long attackerId = event.getAttacker().getId();
        Long defenderId = event.getDefender().getId();
        Long territoryId = event.getTargetTerritory().getId();

        List<UnitInstance> attackerUnits =
                unitInstanceRepository.findByUserIdAndDeployedTerritoryId(attackerId, territoryId);
        List<UnitInstance> defenderUnits =
                unitInstanceRepository.findByUserIdAndDeployedTerritoryId(defenderId, territoryId);

        boolean isAttackerWin = calculateAtk(attackerUnits) > calculateDef(defenderUnits, event);
        int totalAttackerUnits = sumQuantity(attackerUnits);
        int totalDefenderUnits = sumQuantity(defenderUnits);

        applyUnitLoss(isAttackerWin, attackerUnits, defenderUnits);
        SiegeResult.ResultType resultType = applyResultEffect(event, isAttackerWin);
        int lootedGp = resultType == SiegeResult.ResultType.LOOT ? applyLoot(event) : 0;

        saveSiegeResult(
                event, isAttackerWin, totalAttackerUnits, totalDefenderUnits, lootedGp, resultType);
        event.resolve();
        log.info(
                "공성전 처리 완료. siegeId={}, territoryId={}, attackerWin={}, resultType={}",
                event.getId(),
                territoryId,
                isAttackerWin,
                resultType);
    }

    private void saveSiegeResult(
            SiegeEvent event,
            boolean isAttackerWin,
            int totalAttackerUnits,
            int totalDefenderUnits,
            int lootedGp,
            SiegeResult.ResultType resultType) {
        siegeResultRepository.save(
                SiegeResult.builder()
                        .siege(event)
                        .isAttackerWin(isAttackerWin)
                        .attackerUnitsLost(calculateAttackerLost(totalAttackerUnits, isAttackerWin))
                        .defenderUnitsLost(
                                isAttackerWin
                                        ? (int)
                                                Math.ceil(
                                                        totalDefenderUnits
                                                                * MilitaryPolicy.DEFENDER_LOSS_RATE)
                                        : 0)
                        .lootedGp(lootedGp)
                        .resultType(resultType)
                        .build());
    }

    private int calculateAtk(List<UnitInstance> attackerUnits) {
        return attackerUnits.stream()
                .mapToInt(u -> u.getUnitType().getAttackPower() * u.getQuantity())
                .sum();
    }

    private int calculateDef(List<UnitInstance> defenderUnits, SiegeEvent event) {
        int unitDef =
                defenderUnits.stream()
                        .mapToInt(u -> u.getUnitType().getDefensePower() * u.getQuantity())
                        .sum();
        int buildingDef =
                buildingInstanceRepository
                        .findActiveByTerritoryIdAndZone(
                                event.getTargetTerritory().getId(), event.getAttackZone())
                        .stream()
                        .filter(b -> b.getBuildingType().getDefensePower() != null)
                        .mapToInt(b -> b.getBuildingType().getDefensePower())
                        .sum();
        return unitDef + buildingDef;
    }

    private void applyUnitLoss(
            boolean isAttackerWin,
            List<UnitInstance> attackerUnits,
            List<UnitInstance> defenderUnits) {
        int attackerLost = calculateAttackerLost(sumQuantity(attackerUnits), isAttackerWin);
        deductUnits(attackerUnits, attackerLost);

        if (isAttackerWin) {
            int defenderLost =
                    (int) Math.ceil(sumQuantity(defenderUnits) * MilitaryPolicy.DEFENDER_LOSS_RATE);
            deductUnits(defenderUnits, defenderLost);
        }
    }

    private int calculateAttackerLost(int totalAttackerUnits, boolean isAttackerWin) {
        double rate =
                isAttackerWin
                        ? MilitaryPolicy.ATTACKER_LOSS_RATE
                        : MilitaryPolicy.ATTACKER_FAIL_LOSS_RATE;
        return (int) Math.ceil(totalAttackerUnits * rate);
    }

    private void deductUnits(List<UnitInstance> units, int totalLost) {
        int remaining = totalLost;
        for (UnitInstance unit : units) {
            if (remaining <= 0) break;
            int deduct = Math.min(unit.getQuantity(), remaining);
            unit.subtractQuantity(deduct);
            remaining -= deduct;
            if (unit.getQuantity() <= 0) {
                unitInstanceRepository.delete(unit);
            }
        }
    }

    private SiegeResult.ResultType applyResultEffect(SiegeEvent event, boolean isAttackerWin) {
        if (!isAttackerWin) return null;
        return switch (event.getAttackZone()) {
            case 3 -> SiegeResult.ResultType.LOOT;
            case 2 -> {
                applyDebuff(event);
                yield SiegeResult.ResultType.DEBUFF;
            }
            case 1 -> {
                applyCastleDamage(event);
                yield SiegeResult.ResultType.AUCTION;
            }
            default -> null;
        };
    }

    private int applyLoot(SiegeEvent event) {
        List<BuildingInstance> storages =
                buildingInstanceRepository
                        .findActiveByTerritoryIdAndZone(event.getTargetTerritory().getId(), 3)
                        .stream()
                        .filter(b -> "STORAGE".equals(b.getBuildingType().getName()))
                        .toList();

        int totalLooted = 0;
        for (BuildingInstance storage : storages) {
            int lootAmount = (int) Math.floor(storage.getStoredGp() * MilitaryPolicy.LOOT_RATE);
            totalLooted += storage.loot(lootAmount);
        }

        if (totalLooted > 0) {
            final int lootedGp = totalLooted;
            walletRepository
                    .findById(event.getAttacker().getId())
                    .ifPresent(w -> w.addGp(lootedGp));
        }
        return totalLooted;
    }

    private void applyDebuff(SiegeEvent event) {
        // Zone 2 클리어 시 방어자 건물에 데미지 적용
        List<BuildingInstance> buildings =
                buildingInstanceRepository.findActiveByTerritoryIdAndZone(
                        event.getTargetTerritory().getId(), 2);
        buildings.forEach(b -> b.takeDamage(b.getBuildingType().getMaxHp() / 2));
    }

    private void applyCastleDamage(SiegeEvent event) {
        Long territoryId = event.getTargetTerritory().getId();
        List<BuildingInstance> zone1Buildings =
                buildingInstanceRepository.findActiveByTerritoryIdAndZone(territoryId, 1);

        if (event.getTargetBuilding() != null) {
            applyDamageToTarget(event.getTargetBuilding(), territoryId);
        } else {
            applyDamageEvenly(zone1Buildings, territoryId);
        }
    }

    private void applyDamageToTarget(BuildingInstance target, Long territoryId) {
        int damage = target.getBuildingType().getMaxHp() / 2;
        target.takeDamage(damage);
        if (target.isDestroyed() && "CASTLE".equals(target.getBuildingType().getName())) {
            eventPublisher.publishEvent(new CastleDestroyedEvent(territoryId));
        }
    }

    private void applyDamageEvenly(List<BuildingInstance> buildings, Long territoryId) {
        if (buildings.isEmpty()) return;
        int damageEach = 100 / buildings.size();
        boolean castleDestroyed = false;
        for (BuildingInstance b : buildings) {
            b.takeDamage(damageEach);
            if (b.isDestroyed() && "CASTLE".equals(b.getBuildingType().getName())) {
                castleDestroyed = true;
            }
        }
        if (castleDestroyed) {
            eventPublisher.publishEvent(new CastleDestroyedEvent(territoryId));
        }
    }

    private int sumQuantity(List<UnitInstance> units) {
        return units.stream().mapToInt(UnitInstance::getQuantity).sum();
    }
}
