package com.territorial.auction.domain.military.service;

import com.territorial.auction.domain.building.StoragePolicy;
import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.military.LocationType;
import com.territorial.auction.domain.military.MilitaryPolicy;
import com.territorial.auction.domain.military.dto.*;
import com.territorial.auction.domain.military.entity.*;
import com.territorial.auction.domain.military.event.TerritoryLostEvent;
import com.territorial.auction.domain.military.repository.*;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MilitaryService {

    private final AttackTokenRepository attackTokenRepository;
    private final UnitInstanceRepository unitInstanceRepository;
    private final UnitTypeRepository unitTypeRepository;
    private final HomeIslandRepository homeIslandRepository;
    private final SiegeEventRepository siegeEventRepository;
    private final SiegeResultRepository siegeResultRepository;
    private final UserRepository userRepository;
    private final TerritoryRepository territoryRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public AttackTokenResponse getAttackTokens(Long userId) {
        return attackTokenRepository
                .findByUserId(userId)
                .map(AttackTokenResponse::from)
                .orElse(AttackTokenResponse.empty());
    }

    @Transactional
    public ProduceUnitResponse produceUnit(Long userId, ProduceUnitRequest request) {
        UnitType unitType = findUnitTypeOrThrow(request.unitTypeId());
        LocationRef loc =
                resolveOwnedLocation(userId, request.locationId(), request.locationType());
        validateBarracksAtLocation(loc, unitType.getLevel());
        validateUnitCapacityAtLocation(loc, request.quantity());

        int gpCost = unitType.getCostGp() * request.quantity();
        int foodCost = unitType.getFoodCost() * request.quantity();
        List<BuildingInstance> storages = findLocationStoragesWithLock(loc);
        int gpRemaining = chargeLocationGpAndFood(storages, gpCost, foodCost);

        addReadyIdleAtLocation(userId, unitType, loc, request.quantity());
        log.info(
                "유닛 생산 완료. userId={}, unitTypeId={}, quantity={}, {}={}",
                userId,
                unitType.getId(),
                request.quantity(),
                loc.type(),
                loc.id());
        return ProduceUnitResponse.of(unitType, request.quantity(), gpRemaining);
    }

    @Transactional
    public DeployUnitResponse deployUnit(Long userId, DeployUnitRequest request) {
        Territory territory = findOwnedTerritoryOrThrow(request.territoryId(), userId);
        LocationRef source =
                resolveOwnedLocation(
                        userId, request.sourceLocationId(), request.sourceLocationType());
        UnitInstance idle =
                findReadyIdleAtLocationOrThrow(
                        userId, request.unitTypeId(), source, request.quantity());

        idle.subtractQuantity(request.quantity());
        addDeployedUnits(userId, idle.getUnitType(), source, territory, request.quantity());
        return new DeployUnitResponse(request.quantity(), request.territoryId());
    }

    @Transactional
    public RecallUnitResponse recallUnit(Long userId, RecallUnitRequest request) {
        findOwnedTerritoryOrThrow(request.territoryId(), userId);
        List<UnitInstance> deployedStacks =
                unitInstanceRepository.findByUserIdAndUnitTypeIdAndDeployedTerritoryIdOrderByIdAsc(
                        userId, request.unitTypeId(), request.territoryId());
        int recalled = recallFromDeployed(deployedStacks, request.quantity());
        int remaining = deployedStacks.stream().mapToInt(UnitInstance::getQuantity).sum();
        return new RecallUnitResponse(recalled, remaining);
    }

    @Transactional
    public MoveUnitResponse moveUnit(Long userId, MoveUnitRequest request) {
        LocationRef source =
                resolveOwnedLocation(
                        userId, request.sourceLocationId(), request.sourceLocationType());
        LocationRef dest =
                resolveOwnedLocation(userId, request.destLocationId(), request.destLocationType());
        validateDifferentLocation(source, dest);

        UnitInstance idle =
                findReadyIdleAtLocationOrThrow(
                        userId, request.unitTypeId(), source, request.quantity());
        validateUnitCapacityAtLocation(dest, request.quantity());

        int gpCost = MilitaryPolicy.UNIT_MOVE_COST_GP * request.quantity();
        List<BuildingInstance> storages = findLocationStoragesWithLock(source);
        int gpRemaining = chargeLocationGp(storages, gpCost);

        idle.subtractQuantity(request.quantity());
        LocalDateTime completeAt =
                LocalDateTime.now().plusMinutes(MilitaryPolicy.UNIT_MOVE_MINUTES);
        saveInTransitUnit(userId, idle.getUnitType(), dest, request.quantity(), completeAt);
        log.info(
                "유닛 이동 시작. userId={}, unitTypeId={}, quantity={}, {}={} -> {}={}",
                userId,
                request.unitTypeId(),
                request.quantity(),
                source.type(),
                source.id(),
                dest.type(),
                dest.id());
        return new MoveUnitResponse(request.quantity(), gpRemaining, completeAt);
    }

    @Transactional
    public DeclareSiegeResponse declareSiege(Long userId, DeclareSiegeRequest request) {
        Territory target = findTerritoryOrThrow(request.targetTerritoryId());
        validateNotOwnTerritory(target, userId);
        validateTerritoryOccupied(target);
        validateNotProtected(target);
        validateAttackCooldown(request.targetTerritoryId(), userId);
        validateZoneCleared(request.targetTerritoryId(), userId, request.attackZone());

        AttackToken token = findAttackTokenOrThrow(userId);
        BuildingInstance targetBuilding = resolveTargetBuilding(request.targetBuildingId());
        consumeAttackToken(token, targetBuilding);

        validateReadyIdleAvailable(userId, request.unitTypeId(), request.unitQuantity());

        User attacker = findUserOrThrow(userId);
        SiegeEvent siege = buildSiegeEvent(attacker, target, targetBuilding, request);
        siegeEventRepository.save(siege);

        int remaining = targetBuilding == null ? token.getNormalCount() : token.getPrecisionCount();

        final long finalSiegeId = siege.getId();
        final long finalTerritoryId = target.getId();
        final int finalCoordX = target.getCoordX();
        final int finalCoordY = target.getCoordY();
        final int finalAttackZone = request.attackZone();
        final long finalAttackerId = userId;
        final String finalAttackerNickname = attacker.getNickname();
        final long finalDefenderId = target.getOwner().getId();
        final String finalDefenderNickname = target.getOwner().getNickname();
        final LocalDateTime finalResolveAt = siege.getResolveAt();

        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        messagingTemplate.convertAndSend(
                                "/sub/user/" + finalDefenderId + "/siege-alert",
                                new SiegeAlert(
                                        finalSiegeId,
                                        "DECLARED",
                                        finalTerritoryId,
                                        finalCoordX,
                                        finalCoordY,
                                        finalAttackZone,
                                        finalAttackerId,
                                        finalAttackerNickname,
                                        finalDefenderId,
                                        finalDefenderNickname,
                                        finalResolveAt,
                                        null,
                                        null));
                    }
                });

        log.info(
                "공성전 선언. siegeId={}, attackerId={}, targetTerritoryId={}",
                siege.getId(),
                userId,
                target.getId());
        return new DeclareSiegeResponse(siege.getId(), siege.getResolveAt(), remaining);
    }

    public SiegeResultResponse getSiegeResult(Long userId, Long siegeId) {
        SiegeEvent siege = findSiegeOrThrow(siegeId);
        validateSiegeParticipant(siege, userId);
        SiegeResult result =
                siegeResultRepository
                        .findBySiegeId(siegeId)
                        .orElseThrow(() -> new CustomException(ErrorCode.SIEGE_RESULT_NOT_FOUND));
        return SiegeResultResponse.of(siege, result);
    }

    public UnitListResponse getUnitList(Long userId) {
        List<UnitInstance> instances = unitInstanceRepository.findByUserId(userId);
        return buildUnitListResponse(userId, instances);
    }

    public SiegeEventListResponse getSiegeEvents(String statusParam, Pageable pageable) {
        SiegeEvent.SiegeStatus status = parseSiegeStatus(statusParam);
        Page<SiegeEvent> page = siegeEventRepository.findByStatus(status, pageable);
        List<SiegeEventListResponse.SiegeDto> dtos =
                page.getContent().stream().map(this::toSiegeDto).toList();
        return new SiegeEventListResponse(page.getTotalElements(), dtos);
    }

    public MySiegeHistoryResponse getMySiegeHistory(
            Long userId, String resultFilter, Pageable pageable) {
        Page<SiegeEvent> page =
                siegeEventRepository.findMyHistory(
                        userId, SiegeEvent.SiegeStatus.RESOLVED, pageable);
        return buildHistoryResponse(userId, page, resultFilter);
    }

    // 영토 상실(토지세 미납·점유 만료) 시 그 영토에 귀속·배치됐던 소유자 유닛을 홈 아일랜드로 퇴각시킨다.
    // 섬 수용량을 넘는 분은 소멸한다. 섬이 없으면 전부 소멸한다.
    @EventListener
    @Transactional
    public void handleTerritoryLost(TerritoryLostEvent event) {
        List<UnitInstance> units =
                unitInstanceRepository.findByOwnerAndTerritoryAssociation(
                        event.formerOwnerId(), event.territoryId());
        if (units.isEmpty()) {
            return;
        }
        homeIslandRepository
                .findByUserId(event.formerOwnerId())
                .ifPresentOrElse(
                        island -> retreatUnitsToIsland(event.formerOwnerId(), island, units),
                        () -> unitInstanceRepository.deleteAll(units));
    }

    private void retreatUnitsToIsland(Long userId, HomeIsland island, List<UnitInstance> units) {
        int free =
                Math.max(
                        0,
                        islandCapacity(island.getId())
                                - nullSafe(
                                        unitInstanceRepository.sumQuantityByHomeIslandId(
                                                island.getId())));
        for (UnitInstance unit : units) {
            // 이미 섬 귀속(섬→영토 배치분)이면 수용량에 이미 포함 → 전량 유지, 아니면 남은 슬롯까지만.
            boolean alreadyOnIsland =
                    unit.getHomeIsland() != null
                            && unit.getHomeIsland().getId().equals(island.getId());
            int accepted =
                    alreadyOnIsland ? unit.getQuantity() : Math.min(unit.getQuantity(), free);
            if (!alreadyOnIsland) {
                free -= accepted;
            }
            if (accepted > 0) {
                addIslandIdle(userId, unit.getUnitType(), island, accepted);
            }
            unitInstanceRepository.delete(unit);
        }
        log.info(
                "영토 상실 유닛 섬 퇴각. userId={}, islandId={}, stacks={}",
                userId,
                island.getId(),
                units.size());
    }

    private void addIslandIdle(Long userId, UnitType unitType, HomeIsland island, int quantity) {
        unitInstanceRepository
                .findByUserIdAndUnitTypeIdAndHomeIslandIdAndDeployedTerritoryIsNullAndMoveCompleteAtIsNull(
                        userId, unitType.getId(), island.getId())
                .ifPresentOrElse(
                        e -> e.addQuantity(quantity),
                        () ->
                                unitInstanceRepository.save(
                                        UnitInstance.builder()
                                                .user(findUserOrThrow(userId))
                                                .unitType(unitType)
                                                .quantity(quantity)
                                                .homeIsland(island)
                                                .build()));
    }

    private int islandCapacity(Long islandId) {
        int castleLevel = buildingInstanceRepository.findCastleLevelByIslandId(islandId).orElse(0);
        int residence =
                nullSafe(
                        buildingInstanceRepository.sumResidenceCapacityByIslandId(
                                islandId, LocalDateTime.now()));
        return MilitaryPolicy.castleUnitSlots(castleLevel) + residence;
    }

    // --- private helpers ---

    private UnitType findUnitTypeOrThrow(Long unitTypeId) {
        return unitTypeRepository
                .findById(unitTypeId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNIT_TYPE_NOT_FOUND));
    }

    /** 유닛이 귀속·생산되는 위치. 영토 또는 섬 중 하나. */
    private record LocationRef(
            LocationType type, Long id, Territory territory, HomeIsland island) {}

    private LocationRef resolveOwnedLocation(Long userId, Long locationId, LocationType type) {
        if (type == LocationType.TERRITORY) {
            return new LocationRef(
                    type, locationId, findOwnedTerritoryOrThrow(locationId, userId), null);
        }
        return new LocationRef(type, locationId, null, findOwnedIslandOrThrow(locationId, userId));
    }

    private HomeIsland findOwnedIslandOrThrow(Long islandId, Long userId) {
        HomeIsland island =
                homeIslandRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));
        if (!island.getId().equals(islandId)) {
            throw new CustomException(ErrorCode.ISLAND_NOT_FOUND);
        }
        return island;
    }

    private void validateBarracksAtLocation(LocationRef loc, int requiredLevel) {
        boolean exists =
                loc.type() == LocationType.TERRITORY
                        ? buildingInstanceRepository.existsActiveBarracksByTerritoryId(loc.id())
                        : buildingInstanceRepository.existsActiveBarracksByIslandId(loc.id());
        if (!exists) {
            throw new CustomException(ErrorCode.NO_BARRACKS);
        }
        int maxLevel =
                (loc.type() == LocationType.TERRITORY
                                ? buildingInstanceRepository.findMaxBarracksLevelByTerritoryId(
                                        loc.id())
                                : buildingInstanceRepository.findMaxBarracksLevelByIslandId(
                                        loc.id()))
                        .orElse(0);
        if (maxLevel < requiredLevel) {
            throw new CustomException(ErrorCode.BARRACKS_LEVEL_INSUFFICIENT);
        }
    }

    private void validateUnitCapacityAtLocation(LocationRef loc, int quantity) {
        int current =
                nullSafe(
                        loc.type() == LocationType.TERRITORY
                                ? unitInstanceRepository.sumQuantityByHomeTerritoryId(loc.id())
                                : unitInstanceRepository.sumQuantityByHomeIslandId(loc.id()));
        if (current + quantity > locationCapacity(loc)) {
            throw new CustomException(ErrorCode.UNIT_CAPACITY_EXCEEDED);
        }
    }

    private int locationCapacity(LocationRef loc) {
        int castleLevel =
                (loc.type() == LocationType.TERRITORY
                                ? buildingInstanceRepository.findCastleLevelByTerritoryId(loc.id())
                                : buildingInstanceRepository.findCastleLevelByIslandId(loc.id()))
                        .orElse(0);
        int residence =
                nullSafe(
                        loc.type() == LocationType.TERRITORY
                                ? buildingInstanceRepository.sumResidenceCapacityByTerritoryId(
                                        loc.id(), LocalDateTime.now())
                                : buildingInstanceRepository.sumResidenceCapacityByIslandId(
                                        loc.id(), LocalDateTime.now()));
        return MilitaryPolicy.castleUnitSlots(castleLevel) + residence;
    }

    private List<BuildingInstance> findLocationStoragesWithLock(LocationRef loc) {
        return loc.type() == LocationType.TERRITORY
                ? buildingInstanceRepository.findStorageBuildingsByTerritoryIdWithLock(loc.id())
                : buildingInstanceRepository.findStorageBuildingsByIslandIdWithLock(loc.id());
    }

    private int chargeLocationGpAndFood(List<BuildingInstance> storages, int gpCost, int foodCost) {
        if (storages.isEmpty()) {
            throw new CustomException(ErrorCode.STORAGE_NOT_FOUND);
        }
        if (StoragePolicy.totalGp(storages) < gpCost) {
            throw new CustomException(ErrorCode.INSUFFICIENT_GP);
        }
        if (StoragePolicy.totalFood(storages) < foodCost) {
            throw new CustomException(ErrorCode.FOOD_INSUFFICIENT);
        }
        StoragePolicy.drainGp(storages, gpCost);
        StoragePolicy.drainFood(storages, foodCost);
        return StoragePolicy.totalGp(storages);
    }

    private int chargeLocationGp(List<BuildingInstance> storages, int gpCost) {
        if (storages.isEmpty()) {
            throw new CustomException(ErrorCode.STORAGE_NOT_FOUND);
        }
        if (StoragePolicy.totalGp(storages) < gpCost) {
            throw new CustomException(ErrorCode.INSUFFICIENT_GP);
        }
        StoragePolicy.drainGp(storages, gpCost);
        return StoragePolicy.totalGp(storages);
    }

    private void validateDifferentLocation(LocationRef source, LocationRef dest) {
        if (source.type() == dest.type() && source.id().equals(dest.id())) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private int nullSafe(Integer value) {
        return value != null ? value : 0;
    }

    private UnitInstance newUnitAtLocation(
            Long userId,
            UnitType unitType,
            LocationRef home,
            int quantity,
            Territory deployed,
            LocalDateTime moveCompleteAt) {
        User user = findUserOrThrow(userId);
        UnitInstance.UnitInstanceBuilder builder =
                UnitInstance.builder()
                        .user(user)
                        .unitType(unitType)
                        .quantity(quantity)
                        .moveCompleteAt(moveCompleteAt);
        if (home.type() == LocationType.TERRITORY) {
            builder.homeTerritory(home.territory());
        } else {
            builder.homeIsland(home.island());
        }
        UnitInstance instance = builder.build();
        if (deployed != null) {
            instance.deployTo(deployed);
        }
        return instance;
    }

    /** 대기(ready idle) 스택에 병합한다. 없으면 그 위치 귀속으로 새로 만든다. */
    private void addReadyIdleAtLocation(
            Long userId, UnitType unitType, LocationRef loc, int quantity) {
        findReadyIdleAtLocation(userId, unitType.getId(), loc)
                .ifPresentOrElse(
                        e -> e.addQuantity(quantity),
                        () ->
                                unitInstanceRepository.save(
                                        newUnitAtLocation(
                                                userId, unitType, loc, quantity, null, null)));
    }

    private Optional<UnitInstance> findReadyIdleAtLocation(
            Long userId, Long unitTypeId, LocationRef loc) {
        return loc.type() == LocationType.TERRITORY
                ? unitInstanceRepository
                        .findByUserIdAndUnitTypeIdAndHomeTerritoryIdAndDeployedTerritoryIsNullAndMoveCompleteAtIsNull(
                                userId, unitTypeId, loc.id())
                : unitInstanceRepository
                        .findByUserIdAndUnitTypeIdAndHomeIslandIdAndDeployedTerritoryIsNullAndMoveCompleteAtIsNull(
                                userId, unitTypeId, loc.id());
    }

    private UnitInstance findReadyIdleAtLocationOrThrow(
            Long userId, Long unitTypeId, LocationRef loc, int required) {
        UnitInstance idle =
                findReadyIdleAtLocation(userId, unitTypeId, loc)
                        .orElseThrow(() -> new CustomException(ErrorCode.INSUFFICIENT_UNITS));
        if (idle.getQuantity() < required) {
            throw new CustomException(ErrorCode.INSUFFICIENT_UNITS);
        }
        return idle;
    }

    /** 배치(deployed) 스택에 병합한다 — (귀속지·배치영토)가 같은 스택으로. */
    private void addDeployedUnits(
            Long userId, UnitType unitType, LocationRef source, Territory territory, int quantity) {
        Optional<UnitInstance> existing =
                source.type() == LocationType.TERRITORY
                        ? unitInstanceRepository
                                .findByUserIdAndUnitTypeIdAndHomeTerritoryIdAndDeployedTerritoryId(
                                        userId, unitType.getId(), source.id(), territory.getId())
                        : unitInstanceRepository
                                .findByUserIdAndUnitTypeIdAndHomeIslandIdAndDeployedTerritoryId(
                                        userId, unitType.getId(), source.id(), territory.getId());
        existing.ifPresentOrElse(
                e -> e.addQuantity(quantity),
                () ->
                        unitInstanceRepository.save(
                                newUnitAtLocation(
                                        userId, unitType, source, quantity, territory, null)));
    }

    /** 배치 스택들에서 회수해 각자의 귀속지 대기 스택으로 되돌린다. */
    private int recallFromDeployed(List<UnitInstance> deployedStacks, int quantity) {
        int available = deployedStacks.stream().mapToInt(UnitInstance::getQuantity).sum();
        if (available < quantity) {
            throw new CustomException(ErrorCode.INSUFFICIENT_UNITS);
        }
        int remaining = quantity;
        for (UnitInstance deployed : deployedStacks) {
            if (remaining == 0) break;
            int take = Math.min(remaining, deployed.getQuantity());
            deployed.subtractQuantity(take);
            returnToHomeIdle(deployed, take);
            remaining -= take;
        }
        return quantity;
    }

    private void returnToHomeIdle(UnitInstance deployed, int quantity) {
        Long userId = deployed.getUser().getId();
        UnitType unitType = deployed.getUnitType();
        if (deployed.getHomeTerritory() != null) {
            Territory home = deployed.getHomeTerritory();
            unitInstanceRepository
                    .findByUserIdAndUnitTypeIdAndHomeTerritoryIdAndDeployedTerritoryIsNullAndMoveCompleteAtIsNull(
                            userId, unitType.getId(), home.getId())
                    .ifPresentOrElse(
                            e -> e.addQuantity(quantity),
                            () ->
                                    unitInstanceRepository.save(
                                            UnitInstance.builder()
                                                    .user(deployed.getUser())
                                                    .unitType(unitType)
                                                    .quantity(quantity)
                                                    .homeTerritory(home)
                                                    .build()));
        } else {
            HomeIsland home = deployed.getHomeIsland();
            unitInstanceRepository
                    .findByUserIdAndUnitTypeIdAndHomeIslandIdAndDeployedTerritoryIsNullAndMoveCompleteAtIsNull(
                            userId, unitType.getId(), home.getId())
                    .ifPresentOrElse(
                            e -> e.addQuantity(quantity),
                            () ->
                                    unitInstanceRepository.save(
                                            UnitInstance.builder()
                                                    .user(deployed.getUser())
                                                    .unitType(unitType)
                                                    .quantity(quantity)
                                                    .homeIsland(home)
                                                    .build()));
        }
    }

    private void saveInTransitUnit(
            Long userId,
            UnitType unitType,
            LocationRef dest,
            int quantity,
            LocalDateTime completeAt) {
        unitInstanceRepository.save(
                newUnitAtLocation(userId, unitType, dest, quantity, null, completeAt));
    }

    private void validateReadyIdleAvailable(Long userId, Long unitTypeId, int quantity) {
        if (nullSafe(unitInstanceRepository.sumReadyIdleQuantity(userId, unitTypeId)) < quantity) {
            throw new CustomException(ErrorCode.INSUFFICIENT_UNITS);
        }
    }

    private Territory findOwnedTerritoryOrThrow(Long territoryId, Long userId) {
        Territory territory = findTerritoryOrThrow(territoryId);
        if (territory.getOwner() == null || !territory.getOwner().getId().equals(userId)) {
            throw new CustomException(ErrorCode.NOT_TERRITORY_OWNER);
        }
        return territory;
    }

    private Territory findTerritoryOrThrow(Long territoryId) {
        return territoryRepository
                .findById(territoryId)
                .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));
    }

    private void validateNotOwnTerritory(Territory territory, Long userId) {
        if (territory.getOwner() != null && territory.getOwner().getId().equals(userId)) {
            throw new CustomException(ErrorCode.CANNOT_ATTACK_OWN_TERRITORY);
        }
    }

    private void validateTerritoryOccupied(Territory territory) {
        if (territory.getStatus() != Territory.TerritoryStatus.OCCUPIED) {
            throw new CustomException(ErrorCode.TERRITORY_NOT_OCCUPIED);
        }
    }

    private void validateNotProtected(Territory territory) {
        if (territory.getProtectedUntil() != null
                && LocalDateTime.now().isBefore(territory.getProtectedUntil())) {
            throw new CustomException(ErrorCode.TERRITORY_PROTECTED);
        }
    }

    private void validateAttackCooldown(Long territoryId, Long attackerId) {
        List<SiegeEvent> recent =
                siegeEventRepository.findRecentByTerritoryAndAttacker(
                        territoryId, attackerId, SiegeEvent.SiegeStatus.RESOLVED);
        if (recent.isEmpty()) {
            return;
        }
        SiegeEvent last = recent.get(0);
        boolean inCooldown =
                siegeResultRepository
                        .findBySiegeId(last.getId())
                        .filter(r -> !r.getIsAttackerWin())
                        .map(
                                r ->
                                        last.getResolveAt()
                                                .plusHours(MilitaryPolicy.ATTACK_COOLDOWN_HOURS)
                                                .isAfter(LocalDateTime.now()))
                        .orElse(false);
        if (inCooldown) {
            throw new CustomException(ErrorCode.ATTACK_COOLDOWN);
        }
    }

    // 공략은 외곽(Zone 3) → 중심(Zone 1) 순. 안쪽 Zone은 바로 바깥 Zone(attackZone+1)을
    // 먼저 클리어해야 진입 가능하다. 최외곽(Zone 3)은 전제 없음.
    private void validateZoneCleared(Long territoryId, Long attackerId, int attackZone) {
        if (attackZone >= MilitaryPolicy.OUTERMOST_ZONE) {
            return;
        }
        List<SiegeEvent> prevZoneEvents =
                siegeEventRepository.findRecentByTerritoryAndAttacker(
                        territoryId, attackerId, SiegeEvent.SiegeStatus.RESOLVED);
        boolean cleared =
                prevZoneEvents.stream()
                        .filter(e -> e.getAttackZone() == attackZone + 1)
                        .anyMatch(
                                e ->
                                        siegeResultRepository
                                                .findBySiegeId(e.getId())
                                                .map(SiegeResult::getIsAttackerWin)
                                                .orElse(false));
        if (!cleared) {
            throw new CustomException(ErrorCode.ZONE_NOT_CLEARED);
        }
    }

    private AttackToken findAttackTokenOrThrow(Long userId) {
        return attackTokenRepository
                .findByUserIdWithLock(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.NO_ATTACK_TOKEN));
    }

    private BuildingInstance resolveTargetBuilding(Long targetBuildingId) {
        if (targetBuildingId == null) {
            return null;
        }
        return buildingInstanceRepository
                .findById(targetBuildingId)
                .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_NOT_FOUND));
    }

    private void consumeAttackToken(AttackToken token, BuildingInstance targetBuilding) {
        if (targetBuilding == null) {
            if (token.getNormalCount() <= 0) {
                throw new CustomException(ErrorCode.NO_ATTACK_TOKEN);
            }
            token.consumeNormal();
        } else {
            if (token.getPrecisionCount() <= 0) {
                throw new CustomException(ErrorCode.NO_ATTACK_TOKEN);
            }
            token.consumePrecision();
        }
    }

    private User findUserOrThrow(Long userId) {
        return userRepository
                .findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private SiegeEvent buildSiegeEvent(
            User attacker,
            Territory target,
            BuildingInstance targetBuilding,
            DeclareSiegeRequest request) {
        LocalDateTime now = LocalDateTime.now();
        return SiegeEvent.builder()
                .attacker(attacker)
                .defender(target.getOwner())
                .targetTerritory(target)
                .targetBuilding(targetBuilding)
                .attackZone(request.attackZone())
                .siegeStartAt(now)
                .resolveAt(now.plusMinutes(MilitaryPolicy.SIEGE_COUNTDOWN_MINUTES))
                .build();
    }

    private SiegeEvent findSiegeOrThrow(Long siegeId) {
        return siegeEventRepository
                .findById(siegeId)
                .orElseThrow(() -> new CustomException(ErrorCode.SIEGE_NOT_FOUND));
    }

    private void validateSiegeParticipant(SiegeEvent siege, Long userId) {
        boolean isParticipant =
                siege.getAttacker().getId().equals(userId)
                        || siege.getDefender().getId().equals(userId);
        if (!isParticipant) {
            throw new CustomException(ErrorCode.SIEGE_FORBIDDEN);
        }
    }

    /** 유저의 위치(소유 영토 + 홈 아일랜드)별로 유닛·수용량·저장 식량을 묶어 돌려준다. */
    private UnitListResponse buildUnitListResponse(Long userId, List<UnitInstance> instances) {
        Map<String, List<UnitInstance>> byLocation = new LinkedHashMap<>();
        for (UnitInstance inst : instances) {
            byLocation.computeIfAbsent(locationKey(inst), k -> new ArrayList<>()).add(inst);
        }

        List<UnitListResponse.LocationUnits> locations = new ArrayList<>();
        for (Territory t : territoryRepository.findByOwnerId(userId)) {
            LocationRef loc = new LocationRef(LocationType.TERRITORY, t.getId(), t, null);
            locations.add(
                    toLocationUnits(
                            loc,
                            t.getCoordX(),
                            t.getCoordY(),
                            byLocation.getOrDefault("T" + t.getId(), List.of())));
        }
        homeIslandRepository
                .findByUserId(userId)
                .ifPresent(
                        island -> {
                            LocationRef loc =
                                    new LocationRef(
                                            LocationType.ISLAND, island.getId(), null, island);
                            locations.add(
                                    toLocationUnits(
                                            loc,
                                            null,
                                            null,
                                            byLocation.getOrDefault(
                                                    "I" + island.getId(), List.of())));
                        });
        return new UnitListResponse(locations);
    }

    private String locationKey(UnitInstance inst) {
        return inst.getHomeTerritory() != null
                ? "T" + inst.getHomeTerritory().getId()
                : "I" + inst.getHomeIsland().getId();
    }

    private UnitListResponse.LocationUnits toLocationUnits(
            LocationRef loc, Integer coordX, Integer coordY, List<UnitInstance> units) {
        List<BuildingInstance> storages =
                loc.type() == LocationType.TERRITORY
                        ? buildingInstanceRepository.findStorageBuildingsByTerritoryId(loc.id())
                        : buildingInstanceRepository.findStorageBuildingsByIslandId(loc.id());
        Map<Long, List<UnitInstance>> byType = new LinkedHashMap<>();
        for (UnitInstance u : units) {
            byType.computeIfAbsent(u.getUnitType().getId(), k -> new ArrayList<>()).add(u);
        }
        List<UnitListResponse.UnitDto> unitDtos = new ArrayList<>();
        for (List<UnitInstance> group : byType.values()) {
            unitDtos.add(toUnitDto(group));
        }
        return new UnitListResponse.LocationUnits(
                loc.type().name(),
                loc.id(),
                coordX,
                coordY,
                locationCapacity(loc),
                StoragePolicy.totalFood(storages),
                unitDtos);
    }

    private UnitListResponse.UnitDto toUnitDto(List<UnitInstance> group) {
        UnitType ut = group.get(0).getUnitType();
        int total = group.stream().mapToInt(UnitInstance::getQuantity).sum();
        int deployed =
                group.stream()
                        .filter(u -> u.getDeployedTerritory() != null)
                        .mapToInt(UnitInstance::getQuantity)
                        .sum();
        int inTransit =
                group.stream()
                        .filter(UnitInstance::isInTransit)
                        .mapToInt(UnitInstance::getQuantity)
                        .sum();
        return new UnitListResponse.UnitDto(
                ut.getId(),
                ut.getName(),
                ut.getDisplayName(),
                ut.getIcon(),
                ut.getColorHex(),
                total,
                deployed,
                total - deployed - inTransit,
                inTransit,
                ut.getAttackPower(),
                ut.getDefensePower(),
                ut.getCostGp(),
                ut.getFoodCost(),
                ut.getBuildingDamage(),
                ut.getLevel());
    }

    private SiegeEvent.SiegeStatus parseSiegeStatus(String statusParam) {
        try {
            return SiegeEvent.SiegeStatus.valueOf(statusParam.toUpperCase());
        } catch (Exception e) {
            return SiegeEvent.SiegeStatus.PENDING;
        }
    }

    private SiegeEventListResponse.SiegeDto toSiegeDto(SiegeEvent siege) {
        return new SiegeEventListResponse.SiegeDto(
                siege.getId(),
                siege.getStatus().name(),
                new SiegeEventListResponse.UserDto(
                        siege.getAttacker().getId(), siege.getAttacker().getNickname()),
                new SiegeEventListResponse.UserDto(
                        siege.getDefender().getId(), siege.getDefender().getNickname()),
                new SiegeEventListResponse.TerritoryDto(
                        siege.getTargetTerritory().getId(),
                        siege.getTargetTerritory().getCoordX(),
                        siege.getTargetTerritory().getCoordY()),
                siege.getSiegeStartAt(),
                siege.getResolveAt());
    }

    private MySiegeHistoryResponse buildHistoryResponse(
            Long userId, Page<SiegeEvent> page, String resultFilter) {
        List<MySiegeHistoryResponse.HistoryDto> history = new ArrayList<>();
        long wins = 0;
        long losses = 0;

        for (SiegeEvent siege : page.getContent()) {
            String role = siege.getAttacker().getId().equals(userId) ? "ATTACKER" : "DEFENDER";
            String result = resolveResult(siege, role);

            if ("WIN".equals(result)) wins++;
            else if ("LOSE".equals(result)) losses++;

            if (isResultFiltered(result, resultFilter)) {
                continue;
            }

            String grade =
                    siege.getTargetTerritory().getGrade() != null
                            ? siege.getTargetTerritory().getGrade().getGrade()
                            : null;
            history.add(
                    new MySiegeHistoryResponse.HistoryDto(
                            siege.getId(),
                            siege.getTargetTerritory().getId(),
                            grade,
                            role,
                            result,
                            siege.getResolveAt()));
        }
        return new MySiegeHistoryResponse(page.getTotalElements(), wins, losses, history);
    }

    private String resolveResult(SiegeEvent siege, String role) {
        return siegeResultRepository
                .findBySiegeId(siege.getId())
                .map(
                        r -> {
                            boolean attackerWin = Boolean.TRUE.equals(r.getIsAttackerWin());
                            return ("ATTACKER".equals(role) == attackerWin) ? "WIN" : "LOSE";
                        })
                .orElse("PENDING");
    }

    private boolean isResultFiltered(String result, String filter) {
        if (filter == null || "ALL".equalsIgnoreCase(filter)) {
            return false;
        }
        return !filter.equalsIgnoreCase(result);
    }
}
