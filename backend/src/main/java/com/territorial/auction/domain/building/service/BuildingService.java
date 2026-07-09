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
        validateZoneRestriction(buildingType, zone);

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

        int cost = resolveUpgradeCost(building);
        Wallet wallet = findWalletOrThrow(userId);
        validateGp(wallet, cost);

        wallet.spendGp(cost);
        building.upgrade();
        buildingLevelSpecRepository
                .findByBuildingType_IdAndLevel(
                        building.getBuildingType().getId(), building.getLevel())
                .map(com.territorial.auction.domain.building.entity.BuildingLevelSpec::getMaxHp)
                .filter(java.util.Objects::nonNull)
                .ifPresent(building::applyLevelMaxHp);

        if (building.getBuildingType().isCastle() && building.getIsland() != null) {
            IslandGrade newGrade =
                    islandGradeRepository
                            .findByCastleLevelRequired(building.getLevel())
                            .orElse(building.getIsland().getIslandGrade());
            building.getIsland().upgradeIsland(newGrade);
            log.info(
                    "섬 등급 업그레이드. islandId={}, castleLevel={}",
                    building.getIsland().getId(),
                    building.getLevel());
        }

        Integer nextLevel =
                building.getLevel() < BuildingPolicy.MAX_LEVEL ? building.getLevel() + 1 : null;
        return new UpgradeBuildingResponse(
                building.getId(),
                building.getLevel(),
                nextLevel,
                BuildingPolicy.MAX_LEVEL,
                cost,
                wallet.getAvailableGp());
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

    public IslandResponse getIsland(Long userId) {
        HomeIsland island =
                homeIslandRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));

        List<BuildingInstance> buildings =
                buildingInstanceRepository.findByIslandId(island.getId());
        com.territorial.auction.domain.building.BuildingLevelSpecResolver resolver =
                com.territorial.auction.domain.building.BuildingLevelSpecResolver.of(
                        buildings, buildingLevelSpecRepository);
        return IslandResponse.of(island, buildings, resolver::gpPerHour, resolver::maxHp);
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
        validateBuilderSlot(userId, existing);

        int gridSize = island.getGridSize();
        int zone = calculateIslandZone(request.posX(), request.posY(), island);
        validatePosition(existing, buildingType, request.posX(), request.posY(), gridSize);
        validateZoneRestriction(buildingType, zone);

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
        startConstruction(building, buildingType);
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
        validateZoneRestriction(stored.getBuildingType(), zone);

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
        validateZoneRestriction(stored.getBuildingType(), zone);

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
        validateZoneRestriction(building.getBuildingType(), zone);

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
        int productionRatePerMinute = calculateIslandProductionRatePerMinute(buildings);

        LocalDateTime lastHarvest = resolveLastHarvest(island);
        long minutesElapsed =
                Math.max(
                        0,
                        Math.min(
                                ChronoUnit.MINUTES.between(lastHarvest, LocalDateTime.now()),
                                BuildingPolicy.MAX_HARVEST_ACCUMULATION_MINUTES));
        int gpAmount = (int) (minutesElapsed * productionRatePerMinute);

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
    private int calculateIslandProductionRatePerMinute(List<BuildingInstance> buildings) {
        LocalDateTime now = LocalDateTime.now();
        int perHour =
                buildings.stream()
                        .filter(
                                b ->
                                        !b.isDestroyed()
                                                && !b.isUnderConstruction(now)
                                                && b.getBuildingType().getGpProductionRate()
                                                        != null)
                        .mapToInt(b -> b.getLevel() * b.getBuildingType().getGpProductionRate())
                        .sum();
        return perHour / 60;
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    // 건축 장인은 "짓는 중"인 건물만 점유한다 — 완성된 건물 수는 장인과 무관.
    private void validateBuilderSlot(Long userId, List<BuildingInstance> existing) {
        int extraBuilders =
                userSeasonPassRepository
                        .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                        .map(p -> p.getSeasonPass().getExtraBuilders())
                        .orElse(0);
        int builderCount = 1 + extraBuilders;
        LocalDateTime now = LocalDateTime.now();
        long buildingNow = existing.stream().filter(b -> b.isUnderConstruction(now)).count();
        if (buildingNow >= builderCount) {
            throw new CustomException(ErrorCode.BUILDER_SLOT_FULL);
        }
    }

    // 건설 시간이 지정된 건물만 대기 시간을 갖는다 — 미지정(또는 0)이면 즉시 완성.
    private void startConstruction(BuildingInstance building, BuildingType buildingType) {
        Integer buildTimeSeconds = buildingType.getBuildTimeSeconds();
        if (buildTimeSeconds == null || buildTimeSeconds <= 0) return;
        building.startConstruction(LocalDateTime.now().plusSeconds(buildTimeSeconds));
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

    private BuildingInstance findBuildingOrThrow(Long buildingId) {
        return buildingInstanceRepository
                .findById(buildingId)
                .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_NOT_FOUND));
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

    private void validateZoneRestriction(BuildingType buildingType, int zone) {
        Integer restriction = buildingType.getZoneRestriction();
        if (restriction == null) return;
        // 양수: 정확히 해당 Zone이어야 함 (CASTLE = 1)
        if (restriction > 0 && zone != restriction) {
            throw new CustomException(ErrorCode.ZONE_RESTRICTION_VIOLATED);
        }
        // 음수: |값| 이상의 Zone이어야 함 (FARMLAND = -2 → Zone2/3만 허용)
        if (restriction < 0 && zone < -restriction) {
            throw new CustomException(ErrorCode.ZONE_RESTRICTION_VIOLATED);
        }
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
