package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.BuildingPolicy;
import com.territorial.auction.domain.building.dto.InventoryResponse;
import com.territorial.auction.domain.building.dto.InventoryResponse.InventoryItem;
import com.territorial.auction.domain.building.dto.IslandResponse;
import com.territorial.auction.domain.building.dto.MoveBuildingRequest;
import com.territorial.auction.domain.building.dto.MoveBuildingResponse;
import com.territorial.auction.domain.building.dto.PlaceBuildingRequest;
import com.territorial.auction.domain.building.dto.PlaceBuildingResponse;
import com.territorial.auction.domain.building.dto.PlaceFromInventoryRequest;
import com.territorial.auction.domain.building.dto.PlaceFromInventoryResponse;
import com.territorial.auction.domain.building.dto.RepairBuildingResponse;
import com.territorial.auction.domain.building.dto.StoreBuildingResponse;
import com.territorial.auction.domain.building.dto.TerritoryBuildingResponse;
import com.territorial.auction.domain.building.dto.TerritoryBuildingResponse.BuildingInfo;
import com.territorial.auction.domain.building.dto.UpgradeBuildingResponse;
import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.BuildingType;
import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.building.repository.BuildingTypeRepository;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BuildingService {

    private final BuildingInstanceRepository buildingInstanceRepository;
    private final BuildingTypeRepository buildingTypeRepository;
    private final HomeIslandRepository homeIslandRepository;
    private final TerritoryRepository territoryRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final UserSeasonPassRepository userSeasonPassRepository;

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
        int zone = calculateZone(request.posX(), request.posY(), gridSize);
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
        validateNotMaxLevel(building);

        int cost =
                BuildingPolicy.upgradeCost(
                        building.getBuildingType().getBaseCostGp(), building.getLevel());
        Wallet wallet = findWalletOrThrow(userId);
        validateGp(wallet, cost);

        wallet.spendGp(cost);
        building.upgrade();

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
        return IslandResponse.of(island, buildings);
    }

    public List<IslandResponse.IslandBuildingInfo> getIslandBuildings(Long userId) {
        HomeIsland island =
                homeIslandRepository
                        .findByUserId(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));

        return buildingInstanceRepository.findByIslandId(island.getId()).stream()
                .map(IslandResponse.IslandBuildingInfo::from)
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
        int zone = calculateZone(request.posX(), request.posY(), gridSize);
        validatePosition(existing, buildingType, request.posX(), request.posY(), gridSize);

        Wallet wallet = findWalletOrThrow(userId);
        validateGp(wallet, buildingType.getBaseCostGp());
        wallet.spendGp(buildingType.getBaseCostGp());

        BuildingInstance building =
                buildingInstanceRepository.save(
                        BuildingInstance.builder()
                                .island(island)
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
                        .findById(inventoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.BUILDING_NOT_FOUND));

        if (!stored.isInInventory() || !userId.equals(stored.ownerId())) {
            throw new CustomException(ErrorCode.BUILDING_NOT_FOUND);
        }

        Territory territory = findTerritoryOrThrow(request.territoryId());
        validateTerritoryOwner(territory, userId);

        List<BuildingInstance> existing =
                buildingInstanceRepository.findByTerritoryId(request.territoryId());
        int gridSize = territory.getGrade().getGridSize();
        int zone = calculateZone(request.posX(), request.posY(), gridSize);
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
    public MoveBuildingResponse move(Long userId, Long buildingId, MoveBuildingRequest request) {
        BuildingInstance building = findBuildingOrThrow(buildingId);
        validateBuildingOwner(building, userId);

        List<BuildingInstance> existing = findExistingBuildings(building);
        int gridSize = resolveGridSize(building);

        int zone = calculateZone(request.posX(), request.posY(), gridSize);
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

        if ("CASTLE".equals(building.getBuildingType().getName())) {
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

    // ─── private helpers ──────────────────────────────────────────────────────

    private void validateBuilderSlot(Long userId, List<BuildingInstance> existing) {
        int extraBuilders =
                userSeasonPassRepository
                        .findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(userId)
                        .map(p -> p.getSeasonPass().getExtraBuilders())
                        .orElse(0);
        int builderCount = 1 + extraBuilders;
        if (existing.size() >= builderCount) {
            throw new CustomException(ErrorCode.BUILDER_SLOT_FULL);
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

    private int calculateZone(int posX, int posY, int gridSize) {
        int center = gridSize / 2;
        int distance = Math.max(Math.abs(posX - center), Math.abs(posY - center));
        int third = gridSize / 3;
        if (distance <= third) return 1;
        if (distance <= third * 2) return 2;
        return 3;
    }

    private void validateZoneRestriction(BuildingType buildingType, int zone) {
        if (buildingType.getZoneRestriction() != null
                && buildingType.getZoneRestriction() != zone) {
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
