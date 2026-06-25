package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.auction.repository.AuctionRepository;
import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.map.TerritoryIncomePolicy;
import com.territorial.auction.domain.map.dto.GridMapResponse;
import com.territorial.auction.domain.map.dto.TerritoryDetailResponse;
import com.territorial.auction.domain.map.entity.ColorHistory;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.Territory.TerritoryStatus;
import com.territorial.auction.domain.map.repository.ColorHistoryRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MapService {

    private static final int COLOR_CHANGE_LIMIT = 3;

    private final TerritoryRepository territoryRepository;
    private final AuctionRepository auctionRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final ColorHistoryRepository colorHistoryRepository;
    private final TerritoryIncomeService territoryIncomeService;

    @Cacheable(value = "territory-grid", key = "#continentId ?: 'all'")
    public GridMapResponse getGridMap(Long continentId) {
        List<Territory> territories =
                (continentId == null)
                        ? territoryRepository.findAllWithContinentAndGrade()
                        : territoryRepository.findAllByContinentId(continentId);

        List<Long> territoryIds = territories.stream().map(Territory::getId).toList();
        Set<Long> activeAuctionTerritoryIds =
                new HashSet<>(
                        auctionRepository.findActiveAuctionTerritoryIds(
                                territoryIds, LocalDateTime.now()));

        List<GridMapResponse.GridTerritoryDto> gridMapDtos =
                territories.stream()
                        .map(
                                t ->
                                        new GridMapResponse.GridTerritoryDto(
                                                t.getId(),
                                                t.getCoordX(),
                                                t.getCoordY(),
                                                t.getOwner() != null ? t.getOwner().getId() : null,
                                                t.getOwner() != null
                                                        ? t.getOwner().getNickname()
                                                        : null,
                                                t.getCurrentColor(),
                                                t.getGrade().getGrade(),
                                                t.getStatus().name(),
                                                activeAuctionTerritoryIds.contains(t.getId()),
                                                t.getContinent().getId(),
                                                t.getGrade().getGridSize()))
                        .toList();
        return new GridMapResponse(50, gridMapDtos);
    }

    public TerritoryDetailResponse getTerritoryDetail(Long territoryId) {
        Territory territory =
                territoryRepository
                        .findByIdWithDetails(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));

        List<TerritoryDetailResponse.BuildingInfo> buildingInfos =
                buildingInstanceRepository.findByTerritoryId(territoryId).stream()
                        .map(
                                b ->
                                        new TerritoryDetailResponse.BuildingInfo(
                                                b.getId(),
                                                b.getBuildingType().getName(),
                                                b.getLevel(),
                                                b.getHp(),
                                                b.getBuildingType().getMaxHp()))
                        .toList();

        TerritoryDetailResponse.OwnerInfo owner =
                (territory.getOwner() == null)
                        ? null
                        : new TerritoryDetailResponse.OwnerInfo(
                                territory.getOwner().getId(),
                                territory.getOwner().getNickname(),
                                territory.getCurrentColor());

        TerritoryDetailResponse.AuctionInfo auction =
                auctionRepository
                        .findFirstByTerritoryIdAndSettledFalseOrderByEndAtDesc(territoryId)
                        .map(
                                a ->
                                        new TerritoryDetailResponse.AuctionInfo(
                                                a.getId(), a.getCurrentPrice(), a.getEndAt()))
                        .orElse(null);

        Optional<BuildingInstance> storageOpt =
                (territory.getStatus() == TerritoryStatus.OCCUPIED)
                        ? buildingInstanceRepository.findActiveStorageByTerritoryId(territoryId)
                        : Optional.empty();

        Integer productionRatePerMin =
                storageOpt
                        .map(s -> territoryIncomeService.calculateEffectiveRate(territory))
                        .orElse(null);
        LocalDateTime lastProducedAt =
                storageOpt.isPresent() ? territory.getLastProducedAt() : null;
        Integer storedGp = storageOpt.map(BuildingInstance::getStoredGp).orElse(null);
        Integer storageCapacity =
                storageOpt
                        .map(s -> s.getLevel() * TerritoryIncomePolicy.STORAGE_CAPACITY_PER_LEVEL)
                        .orElse(null);

        return new TerritoryDetailResponse(
                territory.getId(),
                territory.getCoordX(),
                territory.getCoordY(),
                territory.getContinent().getDisplayName(),
                territory.getGrade().getGrade(),
                territory.getGrade().getProductionMultiplier(),
                territory.getGrade().getGridSize(),
                territory.getStatus().name(),
                owner,
                territory.getBaseProductionRate(),
                false, // TODO: Redis invincible:{territoryId} 키 존재 여부로 교체
                buildingInfos,
                auction,
                productionRatePerMin,
                lastProducedAt,
                storedGp,
                storageCapacity);
    }

    @Transactional
    public void changeColor(Long territoryId, Long userId, String colorCode) {
        Territory territory =
                territoryRepository
                        .findByIdWithDetails(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));

        validateOwner(territory, userId);
        validateOccupied(territory);
        validateColorChangeCount(territoryId, userId);

        territory.updateColor(colorCode);

        colorHistoryRepository.save(
                ColorHistory.builder()
                        .territory(territory)
                        .user(territory.getOwner())
                        .colorCode(colorCode)
                        .build());
    }

    private void validateOwner(Territory territory, Long userId) {
        if (territory.getOwner() == null || !territory.getOwner().getId().equals(userId)) {
            throw new CustomException(ErrorCode.NOT_TERRITORY_OWNER);
        }
    }

    private void validateOccupied(Territory territory) {
        if (territory.getStatus() != TerritoryStatus.OCCUPIED
                || territory.getOccupiedUntil() == null
                || territory.getOccupiedUntil().isBefore(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.TERRITORY_NOT_OCCUPIED);
        }
    }

    private void validateColorChangeCount(Long territoryId, Long userId) {
        // TODO: Redis 카운터로 교체 필요
        //       키: color:change:{territoryId}:{userId}, TTL = occupiedUntil까지 남은 시간
        //       Redis 우선 조회 → 미존재 시 DB 집계 후 Redis에 세팅
        //       동일 유저가 재점유 시 이전 이력이 합산되는 문제 → occupiedSince 컬럼 추가 후 개선
        long changeCount = colorHistoryRepository.countByTerritoryIdAndUserId(territoryId, userId);
        if (changeCount >= COLOR_CHANGE_LIMIT) {
            throw new CustomException(ErrorCode.COLOR_CHANGE_LIMIT_EXCEEDED);
        }
    }
}
