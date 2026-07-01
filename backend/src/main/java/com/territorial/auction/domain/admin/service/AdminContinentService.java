package com.territorial.auction.domain.admin.service;

import com.territorial.auction.domain.admin.dto.AdminContinentCompositionResponse;
import com.territorial.auction.domain.admin.dto.AdminContinentCompositionResponse.ContinentComposition;
import com.territorial.auction.domain.map.entity.Continent;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.ContinentRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminContinentService {

    private final ContinentRepository continentRepository;
    private final TerritoryRepository territoryRepository;

    public AdminContinentCompositionResponse getCompositions() {
        Map<Long, Composition> byContinent = aggregate();
        List<ContinentComposition> continents =
                continentRepository.findAll().stream()
                        .sorted(
                                Comparator.comparing(
                                                Continent::getMinTrophyRequired,
                                                Comparator.nullsFirst(Comparator.naturalOrder()))
                                        .thenComparing(Continent::getId))
                        .map(c -> toComposition(c, byContinent.get(c.getId())))
                        .toList();
        return new AdminContinentCompositionResponse(continents);
    }

    private Map<Long, Composition> aggregate() {
        Map<Long, Composition> map = new HashMap<>();
        for (Object[] row : territoryRepository.aggregateCompositionGroupByContinent()) {
            Long continentId = (Long) row[0];
            String grade = (String) row[1];
            Territory.TerritoryStatus status = (Territory.TerritoryStatus) row[2];
            long count = (Long) row[3];
            map.computeIfAbsent(continentId, k -> new Composition()).add(grade, status, count);
        }
        return map;
    }

    private ContinentComposition toComposition(Continent continent, Composition comp) {
        Composition c = comp != null ? comp : new Composition();
        return new ContinentComposition(
                continent.getId(),
                continent.getName(),
                continent.getMinTrophyRequired(),
                c.total,
                c.gradeBreakdown,
                c.bidding,
                c.occupied,
                c.idle);
    }

    // 대륙별 등급·상태 집계 홀더
    private static final class Composition {
        private long total;
        private long bidding;
        private long occupied;
        private long idle;
        private final Map<String, Long> gradeBreakdown = new HashMap<>();

        private void add(String grade, Territory.TerritoryStatus status, long count) {
            total += count;
            gradeBreakdown.merge(grade, count, Long::sum);
            switch (status) {
                case BIDDING -> bidding += count;
                case OCCUPIED -> occupied += count;
                case IDLE -> idle += count;
            }
        }
    }
}
