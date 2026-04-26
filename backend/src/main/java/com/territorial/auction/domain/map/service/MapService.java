package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.auction.repository.AuctionRepository;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.map.dto.GridMapResponse;
import com.territorial.auction.domain.map.dto.TerritoryDetailResponse;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MapService {

    private final TerritoryRepository territoryRepository;
    private final AuctionRepository auctionRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;

    public GridMapResponse getGridMap(Long continentId) {
        List<Territory> territories =
                (continentId == null)
                        ? territoryRepository.findAllWithContinentAndGrade()
                        : territoryRepository.findAllByContinentId(continentId);

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
                                                auctionRepository.existsByTerritoryId(t.getId()),
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
                        .findByTerritoryId(territoryId)
                        .map(
                                a ->
                                        new TerritoryDetailResponse.AuctionInfo(
                                                a.getId(), a.getCurrentPrice(), a.getEndAt()))
                        .orElse(null);

        return new TerritoryDetailResponse(
                territory.getId(),
                territory.getCoordX(),
                territory.getCoordY(),
                territory.getContinent().getName(),
                territory.getGrade().getGrade(),
                territory.getGrade().getProductionMultiplier(),
                territory.getGrade().getGridSize(),
                territory.getStatus().name(),
                owner,
                territory.getBaseProductionRate(),
                false, // TODO: Redis invincible:{territoryId} 키 존재 여부로 교체
                buildingInfos,
                auction);
    }
}
