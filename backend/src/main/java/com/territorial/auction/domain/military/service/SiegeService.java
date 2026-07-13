package com.territorial.auction.domain.military.service;

import com.territorial.auction.domain.auction.AuctionPolicy;
import com.territorial.auction.domain.building.StoragePolicy;
import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.GlobalVault;
import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.building.repository.GlobalVaultRepository;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.map.dto.MapUpdateBroadcast;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.military.MilitaryPolicy;
import com.territorial.auction.domain.military.dto.SiegeAlert;
import com.territorial.auction.domain.military.entity.SiegeEvent;
import com.territorial.auction.domain.military.entity.SiegeForce;
import com.territorial.auction.domain.military.entity.SiegeResult;
import com.territorial.auction.domain.military.entity.UnitInstance;
import com.territorial.auction.domain.military.entity.UnitType;
import com.territorial.auction.domain.military.event.SiegeVictoryEvent;
import com.territorial.auction.domain.military.repository.SiegeForceRepository;
import com.territorial.auction.domain.military.repository.SiegeResultRepository;
import com.territorial.auction.domain.military.repository.UnitInstanceRepository;
import com.territorial.auction.domain.season.entity.Season;
import com.territorial.auction.domain.season.repository.SeasonRepository;
import com.territorial.auction.domain.user.entity.User;
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
    private final SiegeForceRepository siegeForceRepository;
    private final UnitInstanceRepository unitInstanceRepository;
    private final HomeIslandRepository homeIslandRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final com.territorial.auction.domain.building.repository.BuildingLevelSpecRepository
            buildingLevelSpecRepository;
    private final GlobalVaultRepository globalVaultRepository;
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

        // 공격 병력은 선언 시 커밋된 SiegeForce에서 온다(대기 풀에서 차감돼 기록됨).
        List<SiegeForce> attackerForces = siegeForceRepository.findBySiegeId(event.getId());
        List<UnitInstance> defenderUnits =
                unitInstanceRepository.findByUserIdAndDeployedTerritoryId(defenderId, territoryId);

        boolean isAttackerWin =
                calculateForceAtk(attackerForces) > calculateDef(defenderUnits, event);
        int totalAttackerUnits = attackerForces.stream().mapToInt(SiegeForce::getQuantity).sum();
        int totalDefenderUnits = sumQuantity(defenderUnits);

        // 손실 적용 — 공격은 커밋 병력에서, 방어는 배치 유닛에서 차감.
        applyAttackerForceLoss(
                attackerForces, calculateAttackerLost(totalAttackerUnits, isAttackerWin));
        if (isAttackerWin) {
            deductUnits(
                    defenderUnits,
                    (int) Math.ceil(totalDefenderUnits * MilitaryPolicy.DEFENDER_LOSS_RATE));
        }
        // 손실 후 생존 공격 병력의 건물 피해력 — Zone 1 성 HP를 이만큼 깎는다.
        int buildingDamage =
                attackerForces.stream()
                        .mapToInt(f -> f.getUnitType().getBuildingDamage() * f.getQuantity())
                        .sum();
        SiegeResult.ResultType resultType = applyResultEffect(event, isAttackerWin, buildingDamage);
        int lootedGp = resultType == SiegeResult.ResultType.LOOT ? applyLoot(event) : 0;

        // 생존 공격 병력은 공격자 홈 아일랜드 대기 풀로 환원, 커밋 기록은 정리.
        returnAttackerSurvivors(event.getAttacker(), attackerForces);
        siegeForceRepository.deleteAll(attackerForces);

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

    private int calculateForceAtk(List<SiegeForce> attackerForces) {
        return attackerForces.stream()
                .mapToInt(f -> f.getUnitType().getAttackPower() * f.getQuantity())
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
        // 건설 중인 건물은 방어에 기여하지 않는다. HP는 있으므로 공격 대상은 된다.
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        int buildingDef =
                defenseBuildings.stream()
                        .filter(b -> !b.isUnderConstruction(now))
                        .mapToInt(resolver::defense)
                        .sum();
        return unitDef + buildingDef;
    }

    // 커밋 병력에서 손실을 순차 차감(SiegeForce 수량을 생존분으로 줄인다).
    private void applyAttackerForceLoss(List<SiegeForce> forces, int totalLost) {
        int remaining = totalLost;
        for (SiegeForce force : forces) {
            if (remaining <= 0) break;
            int deduct = Math.min(force.getQuantity(), remaining);
            force.subtractQuantity(deduct);
            remaining -= deduct;
        }
    }

    // 생존 공격 병력을 공격자 홈 아일랜드 대기 풀로 되돌린다. 섬이 없으면 소멸.
    private void returnAttackerSurvivors(User attacker, List<SiegeForce> forces) {
        homeIslandRepository
                .findByUserId(attacker.getId())
                .ifPresent(
                        island ->
                                forces.stream()
                                        .filter(f -> f.getQuantity() > 0)
                                        .forEach(
                                                f ->
                                                        addIslandReadyIdle(
                                                                attacker,
                                                                f.getUnitType(),
                                                                island,
                                                                f.getQuantity())));
    }

    private void addIslandReadyIdle(User user, UnitType unitType, HomeIsland island, int quantity) {
        unitInstanceRepository
                .findByUserIdAndUnitTypeIdAndHomeIslandIdAndDeployedTerritoryIsNullAndMoveCompleteAtIsNull(
                        user.getId(), unitType.getId(), island.getId())
                .ifPresentOrElse(
                        e -> e.addQuantity(quantity),
                        () ->
                                unitInstanceRepository.save(
                                        UnitInstance.builder()
                                                .user(user)
                                                .unitType(unitType)
                                                .quantity(quantity)
                                                .homeIsland(island)
                                                .build()));
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

    private SiegeResult.ResultType applyResultEffect(
            SiegeEvent event, boolean isAttackerWin, int buildingDamage) {
        if (!isAttackerWin) return null;
        return switch (event.getAttackZone()) {
            case 3 -> SiegeResult.ResultType.LOOT;
            case 2 -> {
                applyDebuff(event);
                yield SiegeResult.ResultType.DEBUFF;
            }
            case 1 -> {
                applyCastleDamage(event, buildingDamage);
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
            creditAttackerVault(event.getAttacker(), totalLooted);
        }
        return totalLooted;
    }

    // 약탈 GP 는 공격자 금고로 들어간다 — 위치별 GP 원칙상 지갑이 아니라 금고가 유일한 위치 간 이동 수단.
    private void creditAttackerVault(User attacker, int amount) {
        GlobalVault vault =
                globalVaultRepository
                        .findById(attacker.getId())
                        .orElseGet(
                                () ->
                                        globalVaultRepository.save(
                                                GlobalVault.builder().user(attacker).build()));
        vault.receiveGp(amount);
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

    private void applyCastleDamage(SiegeEvent event, int buildingDamage) {
        List<BuildingInstance> zone1Buildings =
                buildingInstanceRepository.findActiveByTerritoryIdAndZone(
                        event.getTargetTerritory().getId(), 1);

        boolean castleDestroyed =
                event.getTargetBuilding() != null
                        ? applyDamageToTarget(event.getTargetBuilding(), buildingDamage)
                        : applyDamageEvenly(zone1Buildings, buildingDamage);
        if (castleDestroyed) {
            takeOverTerritory(event);
        }
    }

    // 정밀 공격: 지정 건물에 건물 피해 전량 집중.
    private boolean applyDamageToTarget(BuildingInstance target, int buildingDamage) {
        target.takeDamage(buildingDamage);
        return target.isDestroyed() && "CASTLE".equals(target.getBuildingType().getName());
    }

    // 일반 공격: Zone 내 건물에 건물 피해를 분산.
    private boolean applyDamageEvenly(List<BuildingInstance> buildings, int buildingDamage) {
        if (buildings.isEmpty()) return false;
        int damageEach = buildingDamage / buildings.size();
        boolean castleDestroyed = false;
        for (BuildingInstance b : buildings) {
            b.takeDamage(damageEach);
            if (b.isDestroyed() && "CASTLE".equals(b.getBuildingType().getName())) {
                castleDestroyed = true;
            }
        }
        return castleDestroyed;
    }

    // 성 파괴 = 공격자 즉시 인계. 저장 GP 80%를 공격자 금고로(20% 소멸), 식량은 소멸,
    // 방어 유닛은 전멸시키고 영토를 공격자에게 넘긴다. 건물은 그대로 인계(파괴된 성은 공격자가 수리).
    private void takeOverTerritory(SiegeEvent event) {
        Territory territory = event.getTargetTerritory();
        List<BuildingInstance> storages =
                buildingInstanceRepository.findStorageBuildingsByTerritoryIdWithLock(
                        territory.getId());
        int totalGp = StoragePolicy.drainAllGp(storages);
        StoragePolicy.drainAllFood(storages);
        int recovered = (int) Math.floor(totalGp * StoragePolicy.TERRITORY_LOSS_TRANSFER_RATE);
        if (recovered > 0) {
            creditAttackerVault(event.getAttacker(), recovered);
        }
        annihilateDefenderUnits(event.getDefender().getId(), territory.getId());

        LocalDateTime now = LocalDateTime.now();
        territory.occupy(
                event.getAttacker(),
                now.plusDays(AuctionPolicy.OCCUPATION_DURATION_DAYS),
                now.plusHours(AuctionPolicy.PROTECTION_DURATION_HOURS));
        broadcastTakeoverAfterCommit(territory, event.getAttacker());
        log.info(
                "성 파괴로 영토 인계. territoryId={}, attackerId={}, recoveredGp={}",
                territory.getId(),
                event.getAttacker().getId(),
                recovered);
    }

    private void annihilateDefenderUnits(Long defenderId, Long territoryId) {
        unitInstanceRepository.deleteAll(
                unitInstanceRepository.findByOwnerAndTerritoryAssociation(defenderId, territoryId));
    }

    private void broadcastTakeoverAfterCommit(Territory territory, User attacker) {
        MapUpdateBroadcast update =
                new MapUpdateBroadcast(
                        territory.getId(),
                        territory.getCoordX(),
                        territory.getCoordY(),
                        attacker.getId(),
                        attacker.getNickname(),
                        "OCCUPIED");
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        messagingTemplate.convertAndSend("/sub/map/update", update);
                    }
                });
    }

    private int sumQuantity(List<UnitInstance> units) {
        return units.stream().mapToInt(UnitInstance::getQuantity).sum();
    }
}
