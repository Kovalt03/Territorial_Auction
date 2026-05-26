package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.BuildingType;
import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.building.repository.BuildingTypeRepository;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;

@Slf4j
@Component
@RequiredArgsConstructor
public class BuildingTypeSeeder implements ApplicationRunner {

    private final BuildingTypeRepository buildingTypeRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final HomeIslandRepository homeIslandRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (buildingTypeRepository.count() > 0) {
            log.info("building_types 이미 존재 — 건너뜀");
            patchCastleGpProductionRate();
            placeDefaultCastleOnExistingIslands();
            migrateIslandGradeAndSize();
            return;
        }

        List<Map<String, Object>> rows = loadRows();
        List<BuildingType> types = rows.stream().map(this::toEntity).toList();
        buildingTypeRepository.saveAll(types);
        log.info("building_types 시드 완료. 건수={}", types.size());
    }

    private void patchCastleGpProductionRate() {
        buildingTypeRepository
                .findByName("CASTLE")
                .ifPresent(
                        castle -> {
                            if (castle.getGpProductionRate() == null) {
                                castle.patchGpProductionRate(10);
                                log.info("CASTLE gpProductionRate 패치 완료. value=10");
                            }
                        });
    }

    /** 성 레벨에 따라 섬 등급·그리드 크기·성 위치를 일괄 동기화한다. */
    private void migrateIslandGradeAndSize() {
        List<HomeIsland> islands = homeIslandRepository.findAll();
        int count = 0;
        for (HomeIsland island : islands) {
            List<BuildingInstance> islandBuildings =
                    buildingInstanceRepository.findByIslandId(island.getId());
            BuildingInstance castle =
                    islandBuildings.stream()
                            .filter(b -> b.getBuildingType().isCastle())
                            .findFirst()
                            .orElse(null);

            int castleLevel = castle != null ? castle.getLevel() : 1;
            island.upgradeIsland(castleLevel);

            if (castle != null) {
                int center = (island.getGridSize() / 2) - 1;
                castle.movePosition(center, center, 1);
            }
            count++;
        }
        if (count > 0) {
            log.info("섬 등급·그리드 크기 마이그레이션 완료. 대상 섬 수={}", count);
        }
    }

    private void placeDefaultCastleOnExistingIslands() {
        BuildingType castleType = buildingTypeRepository.findByName("CASTLE").orElse(null);
        if (castleType == null) return;

        List<HomeIsland> islands = homeIslandRepository.findAll();
        int placed = 0;
        for (HomeIsland island : islands) {
            if (buildingInstanceRepository.existsCastleOnIsland(island.getId())) continue;
            int center = (island.getGridSize() / 2) - 1;
            buildingInstanceRepository.save(
                    BuildingInstance.builder()
                            .island(island)
                            .buildingType(castleType)
                            .posX(center)
                            .posY(center)
                            .hp(castleType.getMaxHp())
                            .zone(1)
                            .build());
            placed++;
        }
        if (placed > 0) {
            log.info("기존 섬 기본 성 배치 완료. 대상 섬 수={}", placed);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> loadRows() {
        Yaml yaml = new Yaml();
        try (InputStream is = getClass().getResourceAsStream("/db/building-types.yml")) {
            Map<String, Object> root = yaml.load(is);
            return (List<Map<String, Object>>) root.get("buildingTypes");
        } catch (Exception e) {
            throw new IllegalStateException("building-types.yml 로드 실패", e);
        }
    }

    private BuildingType toEntity(Map<String, Object> row) {
        return BuildingType.builder()
                .name((String) row.get("name"))
                .width((Integer) row.get("width"))
                .height((Integer) row.get("height"))
                .maxHp((Integer) row.get("maxHp"))
                .baseCostGp((Integer) row.get("baseCostGp"))
                .zoneRestriction((Integer) row.get("zoneRestriction"))
                .defensePower((Integer) row.get("defensePower"))
                .foodProductionRate((Integer) row.get("foodProductionRate"))
                .unitCapacityPerLevel((Integer) row.get("unitCapacityPerLevel"))
                .gpProductionRate((Integer) row.get("gpProductionRate"))
                .build();
    }
}
