package com.territorial.auction.domain.military.service;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.military.MilitaryPolicy;
import com.territorial.auction.domain.military.dto.SiegeAlert;
import com.territorial.auction.domain.military.entity.SiegeEvent;
import com.territorial.auction.domain.military.entity.SiegeResult;
import com.territorial.auction.domain.military.entity.UnitInstance;
import com.territorial.auction.domain.military.event.CastleDestroyedEvent;
import com.territorial.auction.domain.military.event.SiegeVictoryEvent;
import com.territorial.auction.domain.military.repository.SiegeResultRepository;
import com.territorial.auction.domain.military.repository.UnitInstanceRepository;
import com.territorial.auction.domain.season.entity.Season;
import com.territorial.auction.domain.season.repository.SeasonRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SiegeService {

    private final SiegeResultRepository siegeResultRepository;
    private final UnitInstanceRepository unitInstanceRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final com.territorial.auction.domain.building.repository.BuildingLevelSpecRepository
            buildingLevelSpecRepository;
    private final WalletRepository walletRepository;
    private final SeasonRepository seasonRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void resolveOneSiege(SiegeEvent event) {
        Long attackerId = event.getAttacker().getId();
        Long defenderId = event.getDefender().getId();
        Long territoryId = event.getTargetTerritory().getId();
        String attackerNickname = event.getAttacker().getNickname();
        String defenderNickname = event.getDefender().getNickname();
        int coordX = event.getTargetTerritory().getCoordX();
        int coordY = event.getTargetTerritory().getCoordY();

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

        if (isAttackerWin) {
            publishSiegeVictoryIfSeasonActive(attackerId);
        }

        saveSiegeResult(
                event, isAttackerWin, totalAttackerUnits, totalDefenderUnits, lootedGp, resultType);

        SiegeAlert alert =
                new SiegeAlert(
                        event.getId(),
                        "RESOLVED",
                        territoryId,
                        coordX,
                        coordY,
                        event.getAttackZone(),
                        attackerId,
                        attackerNickname,
                        defenderId,
                        defenderNickname,
                        event.getResolveAt(),
                        isAttackerWin,
                        resultType != null ? resultType.name() : null);
        event.resolve();
        log.info(
                "공성전 처리 완료. siegeId={}, territoryId={}, attackerWin={}, resultType={}",
                event.getId(),
                territoryId,
                isAttackerWin,
                resultType);

        scheduleAlertAfterCommit(attackerId, defenderId, alert);
    }

    private void publishSiegeVictoryIfSeasonActive(Long attackerId) {
        seasonRepository
                .findActiveSeason(LocalDateTime.now())
                .map(Season::getId)
                .ifPresent(
                        seasonId ->
                                eventPublisher.publishEvent(
                                        new SiegeVictoryEvent(attackerId, seasonId)));
    }

    private void scheduleAlertAfterCommit(Long attackerId, Long defenderId, SiegeAlert alert) {
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        messagingTemplate.convertAndSend(
                                "/sub/user/" + attackerId + "/siege-alert", alert);
                        messagingTemplate.convertAndSend(
                                "/sub/user/" + defenderId + "/siege-alert", alert);
                    }
                });
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
        List<com.territorial.auction.domain.building.entity.BuildingInstance> defenseBuildings =
                buildingInstanceRepository.findActiveByTerritoryIdAndZone(
                        event.getTargetTerritory().getId(), event.getAttackZone());
        com.territorial.auction.domain.building.BuildingLevelSpecResolver resolver =
                com.territorial.auction.domain.building.BuildingLevelSpecResolver.of(
                        defenseBuildings, buildingLevelSpecRepository);
        int buildingDef = defenseBuildings.stream().mapToInt(resolver::defense).sum();
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
        List<BuildingInstance> buildings =
                buildingInstanceRepository.findActiveByTerritoryIdAndZone(
                        event.getTargetTerritory().getId(), 2);
        LocalDateTime debuffUntil =
                LocalDateTime.now().plusHours(MilitaryPolicy.WORKSHOP_DEBUFF_HOURS);
        buildings.forEach(
                b -> {
                    b.takeDamage(b.getBuildingType().getMaxHp() / 2);
                    if (b.isDestroyed() && "WORKSHOP".equals(b.getBuildingType().getName())) {
                        b.applyWorkshopDebuff(debuffUntil);
                    }
                });
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
