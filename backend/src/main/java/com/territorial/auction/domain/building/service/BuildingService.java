package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.BuildingPolicy;
import com.territorial.auction.domain.building.ZonePolicy;
import com.territorial.auction.domain.building.dto.BuildingTypeCatalogResponse;
import com.territorial.auction.domain.building.dto.HarvestIslandGpResponse;
import com.territorial.auction.domain.building.dto.InventoryResponse;
import com.territorial.auction.domain.building.dto.InventoryResponse.InventoryItem;
import com.territorial.auction.domain.building.dto.IslandResponse;
import com.territorial.auction.domain.building.dto.MoveBuildingRequest;
import com.territorial.auction.domain.building.dto.MoveBuildingResponse;
import com.territorial.auction.domain.building.dto.PlaceBuildingRequest;
import com.territorial.auction.domain.building.dto.PlaceBuildingResponse;
import com.territorial.auction.domain.building.dto.PlaceFromInventoryRequest;
import com.territorial.auction.domain.building.dto.PlaceFromInventoryResponse;
import com.territorial.auction.domain.building.dto.PlaceOnIslandFromInventoryRequest;
import com.territorial.auction.domain.building.dto.RepairBuildingResponse;
import com.territorial.auction.domain.building.dto.StoreBuildingResponse;
import com.territorial.auction.domain.building.dto.TerritoryBuildingResponse;
import com.territorial.auction.domain.building.dto.TerritoryBuildingResponse.BuildingInfo;
import com.territorial.auction.domain.building.dto.UpgradeBuildingResponse;
import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.BuildingType;
import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.entity.IslandGrade;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.building.repository.BuildingTypeRepository;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.building.repository.IslandGradeRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.TerritoryGrade;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.notification.entity.NotificationLog.NotificationType;
import com.territorial.auction.domain.notification.service.NotificationService;
import com.territorial.auction.domain.season.entity.UserSeasonPass;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.function.IntBinaryOperator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BuildingService {

    private final BuildingInstanceRepository buildingInstanceRepository;
    private final BuildingTypeRepository buildingTypeRepository;
    private final com.territorial.auction.domain.building.repository.BuildingLevelSpecRepository
            buildingLevelSpecRepository;
    private final HomeIslandRepository homeIslandRepository;
    private final IslandGradeRepository islandGradeRepository;
    private final TerritoryRepository territoryRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final UserSeasonPassRepository userSeasonPassRepository;
    private final NotificationService notificationService;
    private final com.territorial.auction.domain.building.repository.BuildingCastleLimitRepository
            buildingCastleLimitRepository;

    public BuildingTypeCatalogResponse getBuildingTypes() {
        return BuildingTypeCatalogResponse.of(buildingTypeRepository.findAll());
    }

    public TerritoryBuildingResponse findTerritoryBuildings(Long territoryId) {
        territoryRepository
                .findById(territoryId)
                .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));

        List<BuildingInfo> buildings =
                buildingInstanceRepository.findByTerritoryId(territoryId).stream()
                        .map(BuildingInfo::from)
                        .toList();

        return new TerritoryBuildingResponse(buildings);
    }

    @Transactional
    public PlaceBuildingResponse placeOnTerritory(
            Long userId, Long territoryId, PlaceBuildingRequest request) {
        Territory territory = findTerritoryOrThrow(territoryId);
        validateTerritoryOwner(territory, userId);

        BuildingType buildingType = findBuildingTypeOrThrow(request.buildingTypeId());
        List<BuildingInstance> existing = buildingInstanceRepository.findByTerritoryId(territoryId);

        int gridSize = territory.getGrade().getGridSize();
        int zone = calculateTerritoryZone(request.posX(), request.posY(), territory.getGrade());
        validatePosition(existing, buildingType, request.posX(), request.posY(), gridSize);
        validateZoneFootprint(
                buildingType,
                request.posX(),
                request.posY(),
                (x, y) -> calculateTerritoryZone(x, y, territory.getGrade()));

        Wallet wallet = findWalletOrThrow(userId);
        validateGp(wallet, buildingType.getBaseCostGp());
        wallet.spendGp(buildingType.getBaseCostGp());

        BuildingInstance building =
                buildingInstanceRepository.save(
                        BuildingInstance.builder()
                                .territory(territory)
                                .buildingType(buildingType)
                                .posX(request.posX())
                                .posY(request.posY())
                                .hp(buildingType.getMaxHp())
                                .zone(zone)
                                .build());

        return new PlaceBuildingResponse(
                building.getId(),
                buildingType.getName(),
                building.getPosX(),
                building.getPosY(),
                wallet.getAvailableGp());
    }

    @Transactional
    public UpgradeBuildingResponse upgrade(Long userId, Long buildingId) {
        BuildingInstance building = findBuildingOrThrow(buildingId);
        validateBuildingOwner(building, userId);
        validateNotUnderConstruction(building);
        validateNotMaxLevel(building);
        validateBuilderAvailable(userId);

        int cost = resolveUpgradeCost(building);
        Wallet wallet = findWalletOrThrow(userId);
        validateGp(wallet, cost);
        wallet.spendGp(cost);

        int targetLevel = building.getLevel() + 1;
        int seconds = applyBuildTimeReduction(userId, resolveUpgradeSeconds(building, targetLevel));
        if (seconds <= 0) {
            building.startUpgrade(targetLevel, LocalDateTime.now());
            finishConstruction(building);
        } else {
            building.startUpgrade(targetLevel, LocalDateTime.now().plusSeconds(seconds));
        }

        Integer nextLevel = targetLevel < BuildingPolicy.MAX_LEVEL ? targetLevel + 1 : null;
        return new UpgradeBuildingResponse(
                building.getId(),
                targetLevel,
                nextLevel,
                BuildingPolicy.MAX_LEVEL,
                cost,
                wallet.getAvailableGp(),
                building.getBuildCompleteAt());
    }

    // 대기가 끝난 건물을 정리한다 — 업그레이드였다면 레벨·HP를 올리고, 성이면 섬을 확장한다.
    private void finishConstruction(BuildingInstance building) {
        boolean wasUpgrade = building.getUpgradeToLevel() != null;
        building.finishConstruction();
        if (!wasUpgrade) return;

        applyLevelMaxHp(building);
        expandIslandIfCastle(building);
    }

    private void settleIfFinished(BuildingInstance building) {
        if (building.isConstructionFinished(LocalDateTime.now())) finishConstruction(building);
    }

    private void applyLevelMaxHp(BuildingInstance building) {
        int maxHp =
                buildingLevelSpecRepository
                        .findByBuildingType_IdAndLevel(
                                building.getBuildingType().getId(), building.getLevel())
                        .map(
                                com.territorial.auction.domain.building.entity.BuildingLevelSpec
                                        ::getMaxHp)
                        .filter(java.util.Objects::nonNull)
                        .orElseGet(
                                () ->
                                        BuildingPolicy.scaledMaxHp(
                                                building.getBuildingType().getMaxHp(),
                                                building.getLevel()));
        building.applyLevelMaxHp(maxHp);
    }

    // 성 레벨이 오르면 섬 등급이 승격되고 그리드가 커진다.
    private void expandIslandIfCastle(BuildingInstance castle) {
        if (!castle.getBuildingType().isCastle() || castle.getIsland() == null) return;

        HomeIsland island = castle.getIsland();
        int oldGridSize = island.getGridSize();
        IslandGrade newGrade =
                islandGradeRepository
                        .findByCastleLevelRequired(castle.getLevel())
                        .orElse(island.getIslandGrade());
        island.upgradeIsland(newGrade);
        log.info(
                "섬 등급 업그레이드. islandId={}, castleLevel={}, grade={}",
                island.getId(),
                castle.getLevel(),
                newGrade.getName());

        if (island.getGridSize() != oldGridSize) {
            recenterIslandBuildings(island, oldGridSize);
        }
    }

    /**
     * 그리드는 좌상단 고정으로 커지므로 중심이 이동한다. 모든 건물을 중심 기준으로 다시 놓아 상대 위치를 보존하고, Zone 반경이 등급마다 달라 규칙을 어기게 된 건물은
     * 보관함으로 옮긴다(성은 예외 — 섬의 기준점).
     */
    private void recenterIslandBuildings(HomeIsland island, int oldGridSize) {
        int offset = (island.getGridSize() - oldGridSize) / 2;
        List<BuildingInstance> buildings =
                buildingInstanceRepository.findByIslandId(island.getId());
        int storedCount = 0;

        for (BuildingInstance building : buildings) {
            int posX = building.getPosX() + offset;
            int posY = building.getPosY() + offset;
            building.movePosition(posX, posY, calculateIslandZone(posX, posY, island));

            if (building.getBuildingType().isCastle()) continue;
            if (isZoneFootprintValid(
                    building.getBuildingType(),
                    posX,
                    posY,
                    (x, y) -> calculateIslandZone(x, y, island))) continue;

            building.store(island.getUser());
            storedCount++;
        }

        if (storedCount == 0) return;
        log.info("섬 확장으로 건물 보관 처리. islandId={}, count={}", island.getId(), storedCount);
        notificationService.sendNotification(
                island.getUser().getId(),
                NotificationType.ISLAND_EXPANDED,
                "섬이 넓어지면서 배치 규칙을 벗어난 건물 " + storedCount + "개가 보관함으로 이동했습니다.");
    }

    // 도달 레벨에 지정된 시간이 있으면 그 값을, 없으면 건물 기준값(업그레이드 시간 → 건설 시간)을 쓴다.
    private int resolveUpgradeSeconds(BuildingInstance building, int targetLevel) {
        return buildingLevelSpecRepository
                .findByBuildingType_IdAndLevel(building.getBuildingType().getId(), targetLevel)
                .map(
                        com.territorial.auction.domain.building.entity.BuildingLevelSpec
                                ::getUpgradeTimeSeconds)
                .filter(java.util.Objects::nonNull)
                .orElseGet(() -> building.getBuildingType().getUpgradeTimeBase());
    }

    // 시즌 패스의 건설 시간 감소 % 적용
    private int applyBuildTimeReduction(Long userId, int seconds) {
        if (seconds <= 0) return 0;
        int reductionPct =
                userSeasonPassRepository
                        .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                        .map(UserSeasonPass::totalBuildTimeReductionPct)
                        .orElse(0);
        if (reductionPct <= 0) return seconds;
        return Math.max(0, seconds * (100 - reductionPct) / 100);
    }

    // 도달 레벨(현재+1)에 지정된 비용이 있으면 그 값을, 없으면 공식(기준×레벨)을 사용한다.
    private int resolveUpgradeCost(BuildingInstance building) {
        int targetLevel = building.getLevel() + 1;
        return buildingLevelSpecRepository
                .findByBuildingType_IdAndLevel(building.getBuildingType().getId(), targetLevel)
                .map(
                        com.territorial.auction.domain.building.entity.BuildingLevelSpec
                                ::getUpgradeCostGp)
                .filter(java.util.Objects::nonNull)
                .orElseGet(
                        () ->
                                BuildingPolicy.upgradeCost(
                                        building.getBuildingType().getUpgradeCostBase(),
                                        building.getLevel()));
    }

    @Transactional
    public RepairBuildingResponse repair(Long userId, Long buildingId) {
        BuildingInstance building = findBuildingOrThrow(buildingId);
        validateBuildingOwner(building, userId);

        if (!building.isDestroyed()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        int repairCost = building.getBuildingType().getBaseCostGp() / 2;
        Wallet wallet = findWalletOrThrow(userId);
        validateGp(wallet, repairCost);

        wallet.spendGp(repairCost);
        building.repair();

        return new RepairBuildingResponse(
                building.getId(), building.getHp(), wallet.getAvailableGp());
    }

    // 완료된 건설/업그레이드를 여기서 정리하므로 쓰기 트랜잭션이다.
    @Transactional
    public IslandResponse getIsland(Long userId) {
        HomeIsland island =
                homeIslandRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));

        List<BuildingInstance> buildings =
                buildingInstanceRepository.findByIslandId(island.getId());
        buildings.forEach(this::settleIfFinished);
        buildings = buildingInstanceRepository.findByIslandId(island.getId());
        com.territorial.auction.domain.building.BuildingLevelSpecResolver resolver =
                com.territorial.auction.domain.building.BuildingLevelSpecResolver.of(
                        buildings, buildingLevelSpecRepository);
        return IslandResponse.of(
                island,
                buildings,
                resolver::gpPerHour,
                resolver::maxHp,
                resolveBuilderCount(userId));
    }

    public List<IslandResponse.IslandBuildingInfo> getIslandBuildings(Long userId) {
        HomeIsland island =
                homeIslandRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));

        List<BuildingInstance> buildings =
                buildingInstanceRepository.findByIslandId(island.getId());
        com.territorial.auction.domain.building.BuildingLevelSpecResolver resolver =
                com.territorial.auction.domain.building.BuildingLevelSpecResolver.of(
                        buildings, buildingLevelSpecRepository);
        return buildings.stream()
                .map(b -> IslandResponse.IslandBuildingInfo.from(b, resolver.maxHp(b)))
                .toList();
    }

    @Transactional
    public PlaceBuildingResponse placeOnIsland(Long userId, PlaceBuildingRequest request) {
        HomeIsland island =
                homeIslandRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));

        BuildingType buildingType = findBuildingTypeOrThrow(request.buildingTypeId());
        List<BuildingInstance> existing = buildingInstanceRepository.findByIslandId(island.getId());
        validateBuilderAvailable(userId);

        int gridSize = island.getGridSize();
        int zone = calculateIslandZone(request.posX(), request.posY(), island);
        validatePosition(existing, buildingType, request.posX(), request.posY(), gridSize);
        validateZoneFootprint(
                buildingType,
                request.posX(),
                request.posY(),
                (x, y) -> calculateIslandZone(x, y, island));
        validateSingleCastleOnIsland(buildingType, island);
        validateBuildingLimit(buildingType, island);

        Wallet wallet = findWalletOrThrow(userId);
        validateGp(wallet, buildingType.getBaseCostGp());
        wallet.spendGp(buildingType.getBaseCostGp());

        BuildingInstance building =
                BuildingInstance.builder()
                        .island(island)
                        .buildingType(buildingType)
                        .posX(request.posX())
                        .posY(request.posY())
                        .hp(buildingType.getMaxHp())
                        .zone(zone)
                        .build();
        startConstruction(userId, building, buildingType);
        buildingInstanceRepository.save(building);

        return new PlaceBuildingResponse(
                building.getId(),
                buildingType.getName(),
                building.getPosX(),
                building.getPosY(),
                wallet.getAvailableGp());
    }

    public InventoryResponse getInventory(Long userId) {
        List<InventoryItem> items =
                buildingInstanceRepository.findStoredByOwnerId(userId).stream()
                        .map(InventoryItem::from)
                        .toList();
        return new InventoryResponse(items);
    }

    @Transactional
    public PlaceFromInventoryResponse placeFromInventory(
            Long userId, Long inventoryId, PlaceFromInventoryRequest request) {
        BuildingInstance stored =
                buildingInstanceRepository
                        .findByIdWithLock(inventoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_NOT_FOUND));

        if (!stored.isInInventory()) {
            throw new CustomException(ErrorCode.BUILDING_NOT_FOUND);
        }
        if (!userId.equals(stored.ownerId())) {
            throw new CustomException(ErrorCode.BUILDING_NOT_FOUND);
        }

        Territory territory = findTerritoryOrThrow(request.territoryId());
        validateTerritoryOwner(territory, userId);

        List<BuildingInstance> existing =
                buildingInstanceRepository.findByTerritoryId(request.territoryId());
        int gridSize = territory.getGrade().getGridSize();
        int zone = calculateTerritoryZone(request.posX(), request.posY(), territory.getGrade());
        validatePosition(
                existing, stored.getBuildingType(), request.posX(), request.posY(), gridSize);
        validateZoneFootprint(
                stored.getBuildingType(),
                request.posX(),
                request.posY(),
                (x, y) -> calculateTerritoryZone(x, y, territory.getGrade()));

        stored.placeOnTerritory(territory, request.posX(), request.posY(), zone);

        return new PlaceFromInventoryResponse(
                stored.getId(),
                stored.getBuildingType().getName(),
                stored.getPosX(),
                stored.getPosY(),
                territory.getId());
    }

    @Transactional
    public PlaceFromInventoryResponse placeFromInventoryOnIsland(
            Long userId, Long inventoryId, PlaceOnIslandFromInventoryRequest request) {
        BuildingInstance stored =
                buildingInstanceRepository
                        .findByIdWithLock(inventoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_NOT_FOUND));

        if (!stored.isInInventory()) {
            throw new CustomException(ErrorCode.BUILDING_NOT_FOUND);
        }
        if (!userId.equals(stored.ownerId())) {
            throw new CustomException(ErrorCode.BUILDING_NOT_FOUND);
        }

        HomeIsland island =
                homeIslandRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));

        List<BuildingInstance> existing = buildingInstanceRepository.findByIslandId(island.getId());
        int gridSize = island.getGridSize();
        int zone = calculateIslandZone(request.posX(), request.posY(), island);
        validatePosition(
                existing, stored.getBuildingType(), request.posX(), request.posY(), gridSize);
        validateZoneFootprint(
                stored.getBuildingType(),
                request.posX(),
                request.posY(),
                (x, y) -> calculateIslandZone(x, y, island));
        validateSingleCastleOnIsland(stored.getBuildingType(), island);
        validateBuildingLimit(stored.getBuildingType(), island);

        stored.placeOnIsland(island, request.posX(), request.posY(), zone);

        return new PlaceFromInventoryResponse(
                stored.getId(),
                stored.getBuildingType().getName(),
                stored.getPosX(),
                stored.getPosY(),
                null);
    }

    @Transactional
    public MoveBuildingResponse move(Long userId, Long buildingId, MoveBuildingRequest request) {
        BuildingInstance building = findBuildingOrThrow(buildingId);
        validateBuildingOwner(building, userId);
        if (building.getBuildingType().isCastle()) {
            throw new CustomException(ErrorCode.CASTLE_CANNOT_BE_MOVED);
        }

        List<BuildingInstance> existing = findExistingBuildings(building);
        int gridSize = resolveGridSize(building);

        int zone = resolveZone(building, request.posX(), request.posY());
        List<BuildingInstance> othersOnly =
                existing.stream().filter(b -> !b.getId().equals(buildingId)).toList();
        validatePosition(
                othersOnly, building.getBuildingType(), request.posX(), request.posY(), gridSize);
        validateZoneFootprint(
                building.getBuildingType(),
                request.posX(),
                request.posY(),
                (x, y) -> resolveZone(building, x, y));

        building.movePosition(request.posX(), request.posY(), zone);

        return new MoveBuildingResponse(
                building.getId(),
                building.getBuildingType().getName(),
                building.getPosX(),
                building.getPosY());
    }

    @Transactional
    public StoreBuildingResponse store(Long userId, Long buildingId) {
        BuildingInstance building = findBuildingOrThrow(buildingId);
        validateBuildingOwner(building, userId);
        // 보관 후 즉시 재배치하면 건설 대기를 건너뛸 수 있으므로 건설 중에는 막는다.
        validateNotUnderConstruction(building);

        if (building.getBuildingType().isCastle()) {
            throw new CustomException(ErrorCode.CASTLE_CANNOT_BE_STORED);
        }

        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        LocalDateTime storedAt = LocalDateTime.now();
        building.store(user);

        return new StoreBuildingResponse(
                building.getId(),
                building.getBuildingType().getName(),
                building.getLevel(),
                building.getHp(),
                storedAt);
    }

    @Transactional
    public HarvestIslandGpResponse harvestIslandGp(Long userId) {
        HomeIsland island =
                homeIslandRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));

        List<BuildingInstance> buildings =
                buildingInstanceRepository.findByIslandId(island.getId());
        int productionPerHour = calculateIslandProductionPerHour(buildings);

        LocalDateTime lastHarvest = resolveLastHarvest(island);
        long minutesElapsed =
                Math.max(
                        0,
                        Math.min(
                                ChronoUnit.MINUTES.between(lastHarvest, LocalDateTime.now()),
                                BuildingPolicy.MAX_HARVEST_ACCUMULATION_MINUTES));
        // 분당으로 먼저 나누면 시간당 생산량이 60 미만인 건물은 0이 되어 버린다.
        int gpAmount = (int) (minutesElapsed * productionPerHour / 60);

        Wallet wallet = findWalletOrThrow(userId);
        if (gpAmount > 0) {
            wallet.addGp(gpAmount);
        }
        island.recordHarvest();

        log.info("섬 GP 수확 완료. userId={}, harvestedGp={}", userId, gpAmount);

        return new HarvestIslandGpResponse(
                gpAmount, wallet.getAvailableGp(), island.getLastHarvestAt());
    }

    private LocalDateTime resolveLastHarvest(HomeIsland island) {
        if (island.getLastHarvestAt() != null) return island.getLastHarvestAt();
        if (island.getCreatedAt() != null) return island.getCreatedAt();
        return LocalDateTime.now();
    }

    // 건설 중인 건물은 아직 생산하지 않는다.
    private int calculateIslandProductionPerHour(List<BuildingInstance> buildings) {
        LocalDateTime now = LocalDateTime.now();
        return buildings.stream()
                .filter(
                        b ->
                                !b.isDestroyed()
                                        && !b.isUnderConstruction(now)
                                        && b.getBuildingType().getGpProductionRate() != null)
                .mapToInt(b -> b.getLevel() * b.getBuildingType().getGpProductionRate())
                .sum();
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    // 기본 장인 1명 + 시즌 패스로 추가된 인원
    private int resolveBuilderCount(Long userId) {
        int extraBuilders =
                userSeasonPassRepository
                        .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                        .map(p -> p.getSeasonPass().getExtraBuilders())
                        .orElse(0);
        return 1 + extraBuilders;
    }

    // 건축 장인은 "짓는 중"인 건물만 점유한다 — 완성된 건물 수는 장인과 무관.
    private void validateBuilderAvailable(Long userId) {
        long buildingNow =
                buildingInstanceRepository.countUnderConstructionByOwnerId(
                        userId, LocalDateTime.now());
        if (buildingNow >= resolveBuilderCount(userId)) {
            throw new CustomException(ErrorCode.BUILDER_SLOT_FULL);
        }
    }

    // 건설 시간이 지정된 건물만 대기 시간을 갖는다 — 미지정(또는 0)이면 즉시 완성.
    private void startConstruction(Long userId, BuildingInstance building, BuildingType type) {
        Integer buildTimeSeconds = type.getBuildTimeSeconds();
        if (buildTimeSeconds == null || buildTimeSeconds <= 0) return;
        int seconds = applyBuildTimeReduction(userId, buildTimeSeconds);
        if (seconds <= 0) return;
        building.startConstruction(LocalDateTime.now().plusSeconds(seconds));
    }

    private void validateNotUnderConstruction(BuildingInstance building) {
        if (building.isUnderConstruction(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.BUILDING_UNDER_CONSTRUCTION);
        }
    }

    private Territory findTerritoryOrThrow(Long territoryId) {
        return territoryRepository
                .findById(territoryId)
                .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));
    }

    private BuildingType findBuildingTypeOrThrow(Long typeId) {
        return buildingTypeRepository
                .findById(typeId)
                .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_TYPE_NOT_FOUND));
    }

    // 모든 호출부가 쓰기 트랜잭션이라 여기서 대기 종료를 정리한다.
    private BuildingInstance findBuildingOrThrow(Long buildingId) {
        BuildingInstance building =
                buildingInstanceRepository
                        .findById(buildingId)
                        .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_NOT_FOUND));
        settleIfFinished(building);
        return building;
    }

    private Wallet findWalletOrThrow(Long userId) {
        return walletRepository
                .findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void validateTerritoryOwner(Territory territory, Long userId) {
        if (territory.getOwner() == null || !territory.getOwner().getId().equals(userId)) {
            throw new CustomException(ErrorCode.NOT_TERRITORY_OWNER);
        }
    }

    private void validateBuildingOwner(BuildingInstance building, Long userId) {
        Long ownerId = building.ownerId();
        if (ownerId == null || !ownerId.equals(userId)) {
            throw new CustomException(ErrorCode.NOT_TERRITORY_OWNER);
        }
    }

    private void validateNotMaxLevel(BuildingInstance building) {
        if (building.getLevel() >= BuildingPolicy.MAX_LEVEL) {
            throw new CustomException(ErrorCode.BUILDING_MAX_LEVEL);
        }
    }

    private void validateGp(Wallet wallet, int required) {
        if (wallet.getAvailableGp() < required) {
            throw new CustomException(ErrorCode.INSUFFICIENT_GP);
        }
    }

    private int calculateTerritoryZone(int posX, int posY, TerritoryGrade grade) {
        return ZonePolicy.calculateZone(
                posX, posY, grade.getGridSize(), grade.getZone1Radius(), grade.getZone2Radius());
    }

    private int calculateIslandZone(int posX, int posY, HomeIsland island) {
        return ZonePolicy.calculateZone(
                posX, posY, island.getGridSize(), island.getZone1Radius(), island.getZone2Radius());
    }

    private int resolveZone(BuildingInstance building, int posX, int posY) {
        if (building.getIsland() != null) {
            return calculateIslandZone(posX, posY, building.getIsland());
        }
        return calculateTerritoryZone(posX, posY, building.getTerritory().getGrade());
    }

    // 섬에는 성이 하나만 존재한다 — 시작 건물로 이미 배치되어 있다.
    /**
     * 성 레벨별로 건물 종류마다 개수 상한이 있다. 상한이 설정되지 않은 조합은 제한 없음. 성은 별도 검증(validateSingleCastleOnIsland)으로 이미
     * 1개로 묶여 있다.
     */
    private void validateBuildingLimit(BuildingType buildingType, HomeIsland island) {
        if (buildingType.isCastle()) return;

        int castleLevel =
                buildingInstanceRepository.findCastleLevelByIslandId(island.getId()).orElse(1);
        buildingCastleLimitRepository
                .findByBuildingType_IdAndCastleLevel(buildingType.getId(), castleLevel)
                .ifPresent(
                        limit -> {
                            long placed =
                                    buildingInstanceRepository.countByIslandIdAndBuildingTypeId(
                                            island.getId(), buildingType.getId());
                            if (placed >= limit.getMaxCount()) {
                                throw new CustomException(ErrorCode.BUILDING_LIMIT_EXCEEDED);
                            }
                        });
    }

    private void validateSingleCastleOnIsland(BuildingType buildingType, HomeIsland island) {
        if (!buildingType.isCastle()) return;
        if (buildingInstanceRepository.existsCastleOnIsland(island.getId())) {
            throw new CustomException(ErrorCode.CASTLE_ALREADY_EXISTS);
        }
    }

    // 건물이 차지하는 모든 칸이 Zone 제약을 만족해야 한다 — 2×2 성이 Zone1을 벗어나 걸치는 것을 막는다.
    private void validateZoneFootprint(
            BuildingType buildingType, int posX, int posY, IntBinaryOperator zoneAt) {
        if (!isZoneFootprintValid(buildingType, posX, posY, zoneAt)) {
            throw new CustomException(ErrorCode.ZONE_RESTRICTION_VIOLATED);
        }
    }

    private boolean isZoneFootprintValid(
            BuildingType buildingType, int posX, int posY, IntBinaryOperator zoneAt) {
        if (buildingType.getZoneRestriction() == null) return true;
        for (int dy = 0; dy < buildingType.getHeight(); dy++) {
            for (int dx = 0; dx < buildingType.getWidth(); dx++) {
                if (!isZoneAllowed(buildingType, zoneAt.applyAsInt(posX + dx, posY + dy)))
                    return false;
            }
        }
        return true;
    }

    private boolean isZoneAllowed(BuildingType buildingType, int zone) {
        Integer restriction = buildingType.getZoneRestriction();
        if (restriction == null) return true;
        // 양수: 정확히 해당 Zone (CASTLE = 1) / 음수: |값| 이상 (FARMLAND = -2 → Zone2·3)
        return restriction > 0 ? zone == restriction : zone >= -restriction;
    }

    private void validatePosition(
            List<BuildingInstance> existing, BuildingType bt, int posX, int posY, int gridSize) {
        int endX = posX + bt.getWidth() - 1;
        int endY = posY + bt.getHeight() - 1;

        if (posX < 0 || posY < 0 || endX >= gridSize || endY >= gridSize) {
            throw new CustomException(ErrorCode.INVALID_POSITION);
        }

        for (BuildingInstance other : existing) {
            if (other.getPosX() < 0) continue;
            int otherEndX = other.getPosX() + other.getBuildingType().getWidth() - 1;
            int otherEndY = other.getPosY() + other.getBuildingType().getHeight() - 1;
            boolean noOverlap =
                    endX < other.getPosX()
                            || posX > otherEndX
                            || endY < other.getPosY()
                            || posY > otherEndY;
            if (!noOverlap) {
                throw new CustomException(ErrorCode.INVALID_POSITION);
            }
        }
    }

    private List<BuildingInstance> findExistingBuildings(BuildingInstance building) {
        if (building.getTerritory() != null) {
            return buildingInstanceRepository.findByTerritoryId(building.getTerritory().getId());
        }
        if (building.getIsland() != null) {
            return buildingInstanceRepository.findByIslandId(building.getIsland().getId());
        }
        return List.of();
    }

    private int resolveGridSize(BuildingInstance building) {
        if (building.getTerritory() != null) {
            return building.getTerritory().getGrade().getGridSize();
        }
        if (building.getIsland() != null) {
            return building.getIsland().getGridSize();
        }
        return 10;
    }
}
