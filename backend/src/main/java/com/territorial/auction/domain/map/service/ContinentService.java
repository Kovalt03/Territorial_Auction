package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.map.dto.ContinentListResponse;
import com.territorial.auction.domain.map.entity.Continent;
import com.territorial.auction.domain.map.entity.Territory.TerritoryStatus;
import com.territorial.auction.domain.map.repository.ContinentRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContinentService {

    private final ContinentRepository continentRepository;
    private final TerritoryRepository territoryRepository;

    public ContinentListResponse getContinents() {
        List<Continent> continents = continentRepository.findAll();

        List<ContinentListResponse.ContinentInfo> continentInfos =
                continents.stream()
                        .map(
                                c ->
                                        ContinentListResponse.ContinentInfo.builder()
                                                .continentId(c.getId())
                                                .continentName(c.getName())
                                                .totalTerritories(
                                                        (int)
                                                                territoryRepository
                                                                        .countByContinentId(
                                                                                c.getId()))
                                                .occupiedTerritories(
                                                        (int)
                                                                territoryRepository
                                                                        .countByContinentIdAndStatus(
                                                                                c.getId(),
                                                                                TerritoryStatus
                                                                                        .OCCUPIED))
                                                .dominantGuildName(null) // TODO: Guild 도메인 구현 후 연동
                                                .avgTerritorytGrade(null) // TODO: 등급별 집계 쿼리 구현 후 연동
                                                .bonusDescription(null) // TODO: BonusTile 연동 후 구현
                                                .build())
                        .toList();

        return new ContinentListResponse(continents.size(), continentInfos);
    }
}
