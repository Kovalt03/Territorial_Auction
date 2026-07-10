package com.territorial.auction.domain.military.service;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.military.MilitaryPolicy;
import com.territorial.auction.domain.military.dto.*;
import com.territorial.auction.domain.military.entity.*;
import com.territorial.auction.domain.military.repository.*;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final SiegeEventRepository siegeEventRepository;
    private final SiegeResultRepository siegeResultRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
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
        validateBarracksExists(userId);
        validateBarracksLevel(userId, unitType.getLevel());
        validateUnitCapacity(userId, request.quantity());

        Wallet wallet = findWalletWithLockOrThrow(userId);
        int gpCost = unitType.getCostGp() * request.quantity();
        int foodCost = unitType.getFoodCost() * request.quantity();
        validateGp(wallet, gpCost);
        validateFood(wallet, foodCost);
        wallet.spendGp(gpCost);
        wallet.spendFood(foodCost);

        addIdleUnits(userId, unitType, request.quantity());
        log.info(
                "유닛 생산 완료. userId={}, unitTypeId={}, quantity={}",
                userId,
                unitType.getId(),
                request.quantity());
        return ProduceUnitResponse.of(unitType, request.quantity(), wallet.getAvailableGp());
    }

    @Transactional
    public DeployUnitResponse deployUnit(Long userId, DeployUnitRequest request) {
        Territory territory = findOwnedTerritoryOrThrow(request.territoryId(), userId);
        UnitInstance idle =
                findSufficientIdleUnit(userId, request.unitTypeId(), request.quantity());

        idle.subtractQuantity(request.quantity());
        addDeployedUnits(userId, idle.getUnitType(), territory, request.quantity());
        return new DeployUnitResponse(request.quantity(), request.territoryId());
    }

    @Transactional
    public RecallUnitResponse recallUnit(Long userId, RecallUnitRequest request) {
        findOwnedTerritoryOrThrow(request.territoryId(), userId);
        UnitInstance deployed =
                findSufficientDeployedUnit(
                        userId, request.unitTypeId(), request.territoryId(), request.quantity());

        deployed.subtractQuantity(request.quantity());
        addIdleUnits(userId, deployed.getUnitType(), request.quantity());
        return new RecallUnitResponse(request.quantity(), deployed.getQuantity());
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

        findSufficientIdleUnit(userId, request.unitTypeId(), request.unitQuantity());

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
        Wallet wallet = findWalletOrThrow(userId);
        return buildUnitListResponse(instances, wallet.getAvailableFood());
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

    // --- private helpers ---

    private UnitType findUnitTypeOrThrow(Long unitTypeId) {
        return unitTypeRepository
                .findById(unitTypeId)
                .orElseThrow(() -> new CustomException(ErrorCode.UNIT_TYPE_NOT_FOUND));
    }

    private void validateBarracksExists(Long userId) {
        if (!buildingInstanceRepository.existsActiveBarracksByOwnerId(userId)) {
            throw new CustomException(ErrorCode.NO_BARRACKS);
        }
    }

    private void validateBarracksLevel(Long userId, int requiredLevel) {
        int maxLevel = buildingInstanceRepository.findMaxBarracksLevelByOwnerId(userId).orElse(0);
        if (maxLevel < requiredLevel) {
            throw new CustomException(ErrorCode.BARRACKS_LEVEL_INSUFFICIENT);
        }
    }

    private void validateUnitCapacity(Long userId, int quantity) {
        int current = nullSafe(unitInstanceRepository.sumQuantityByUserId(userId));
        int capacity = calculateTotalUnitCapacity(userId);
        if (current + quantity > capacity) {
            throw new CustomException(ErrorCode.UNIT_CAPACITY_EXCEEDED);
        }
    }

    private int calculateTotalUnitCapacity(Long userId) {
        List<Integer> castleLevels =
                buildingInstanceRepository.findActiveCastleLevelsByOwnerId(userId);
        int castleSlots = castleLevels.stream().mapToInt(MilitaryPolicy::castleUnitSlots).sum();
        int residenceSlots =
                nullSafe(
                        buildingInstanceRepository.sumResidenceCapacityByOwnerId(
                                userId, java.time.LocalDateTime.now()));
        return (castleLevels.isEmpty() ? MilitaryPolicy.DEFAULT_UNIT_SLOTS : castleSlots)
                + residenceSlots;
    }

    private int nullSafe(Integer value) {
        return value != null ? value : 0;
    }

    private void validateFood(Wallet wallet, int cost) {
        if (wallet.getAvailableFood() < cost) {
            throw new CustomException(ErrorCode.FOOD_INSUFFICIENT);
        }
    }

    private Wallet findWalletOrThrow(Long userId) {
        return walletRepository
                .findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private Wallet findWalletWithLockOrThrow(Long userId) {
        return walletRepository
                .findByIdWithLock(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void validateGp(Wallet wallet, int cost) {
        if (wallet.getAvailableGp() < cost) {
            throw new CustomException(ErrorCode.INSUFFICIENT_GP);
        }
    }

    private void addIdleUnits(Long userId, UnitType unitType, int quantity) {
        unitInstanceRepository
                .findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(userId, unitType.getId())
                .ifPresentOrElse(
                        existing -> existing.addQuantity(quantity),
                        () -> {
                            User user = findUserOrThrow(userId);
                            UnitInstance newInstance =
                                    UnitInstance.builder()
                                            .user(user)
                                            .unitType(unitType)
                                            .quantity(quantity)
                                            .build();
                            unitInstanceRepository.save(newInstance);
                        });
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

    private UnitInstance findSufficientIdleUnit(Long userId, Long unitTypeId, int required) {
        UnitInstance idle =
                unitInstanceRepository
                        .findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(userId, unitTypeId)
                        .orElseThrow(() -> new CustomException(ErrorCode.INSUFFICIENT_UNITS));
        if (idle.getQuantity() < required) {
            throw new CustomException(ErrorCode.INSUFFICIENT_UNITS);
        }
        return idle;
    }

    private UnitInstance findSufficientDeployedUnit(
            Long userId, Long unitTypeId, Long territoryId, int required) {
        UnitInstance deployed =
                unitInstanceRepository
                        .findByUserIdAndUnitTypeIdAndDeployedTerritoryId(
                                userId, unitTypeId, territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.INSUFFICIENT_UNITS));
        if (deployed.getQuantity() < required) {
            throw new CustomException(ErrorCode.INSUFFICIENT_UNITS);
        }
        return deployed;
    }

    private void addDeployedUnits(
            Long userId, UnitType unitType, Territory territory, int quantity) {
        unitInstanceRepository
                .findByUserIdAndUnitTypeIdAndDeployedTerritoryId(
                        userId, unitType.getId(), territory.getId())
                .ifPresentOrElse(
                        existing -> existing.addQuantity(quantity),
                        () -> {
                            User user = findUserOrThrow(userId);
                            UnitInstance newInstance =
                                    UnitInstance.builder()
                                            .user(user)
                                            .unitType(unitType)
                                            .quantity(quantity)
                                            .build();
                            newInstance.deployTo(territory);
                            unitInstanceRepository.save(newInstance);
                        });
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
        if (territory.getOccupiedUntil() != null
                && LocalDateTime.now().isBefore(territory.getOccupiedUntil())) {
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

    private void validateZoneCleared(Long territoryId, Long attackerId, int attackZone) {
        if (attackZone <= 1) {
            return;
        }
        List<SiegeEvent> prevZoneEvents =
                siegeEventRepository.findRecentByTerritoryAndAttacker(
                        territoryId, attackerId, SiegeEvent.SiegeStatus.RESOLVED);
        boolean cleared =
                prevZoneEvents.stream()
                        .filter(e -> e.getAttackZone() == attackZone - 1)
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

    private UnitListResponse buildUnitListResponse(
            List<UnitInstance> instances, int availableFood) {
        Map<Long, List<UnitInstance>> grouped = new LinkedHashMap<>();
        for (UnitInstance inst : instances) {
            grouped.computeIfAbsent(inst.getUnitType().getId(), k -> new ArrayList<>()).add(inst);
        }

        List<UnitListResponse.UnitDto> dtos = new ArrayList<>();

        for (Map.Entry<Long, List<UnitInstance>> entry : grouped.entrySet()) {
            UnitType unitType = entry.getValue().get(0).getUnitType();
            int total = entry.getValue().stream().mapToInt(UnitInstance::getQuantity).sum();
            int deployed =
                    entry.getValue().stream()
                            .filter(i -> i.getDeployedTerritory() != null)
                            .mapToInt(UnitInstance::getQuantity)
                            .sum();
            dtos.add(
                    new UnitListResponse.UnitDto(
                            unitType.getId(),
                            unitType.getName(),
                            total,
                            deployed,
                            total - deployed,
                            unitType.getAttackPower(),
                            unitType.getDefensePower(),
                            unitType.getFoodCost()));
        }
        return new UnitListResponse(dtos, availableFood);
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
