package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.BuildingType;
import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.building.repository.BuildingTypeRepository;
import com.territorial.auction.domain.building.repository.HomeIslandRepository;
import com.territorial.auction.domain.building.repository.IslandGradeRepository;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;

@Slf4j
@Component
@Order(6)
@RequiredArgsConstructor
public class BuildingTypeSeeder implements ApplicationRunner {

    private final BuildingTypeRepository buildingTypeRepository;
    private final BuildingInstanceRepository buildingInstanceRepository;
    private final HomeIslandRepository homeIslandRepository;
    private final IslandGradeRepository islandGradeRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (buildingTypeRepository.count() > 0) {
            log.info("building_types 이미 존재 — 건너뜀");
            patchCastleGpProductionRate();
            backfillCategoryAndDisplayName();
            placeDefaultCastleOnExistingIslands();
            migrateIslandGradeAndSize();
            return;
        }

        List<Map<String, Object>> rows = loadRows();
        List<BuildingType> types = rows.stream().map(this::toEntity).toList();
        buildingTypeRepository.saveAll(types);
        backfillCategoryAndDisplayName();
        log.info("building_types 시드 완료. 건수={}", types.size());
    }

    private static final Map<String, String> KOREAN_NAMES =
            Map.of(
                    "CASTLE", "성",
                    "WORKSHOP", "생산소",
                    "BARRACKS", "병영",
                    "STORAGE", "저장소",
                    "WALL", "방벽",
                    "TOWER", "방어탑",
                    "FARMLAND", "농지",
                    "RESIDENCE", "주거지");

    // 프론트 기본 매핑(islandGrid.ts)과 동일 — 관리자/사용자 표기 일치를 위해 DB에 채운다.
    private static final Map<String, String> ICONS =
            Map.of(
                    "CASTLE", "🏰",
                    "WORKSHOP", "⚙",
                    "BARRACKS", "⚔",
                    "STORAGE", "📦",
                    "WALL", "🧱",
                    "TOWER", "🗼",
                    "FARMLAND", "🌾",
                    "RESIDENCE", "🏠");

    private static final Map<String, String> COLORS =
            Map.of(
                    "CASTLE", "#ffd700",
                    "WORKSHOP", "#00ff88",
                    "BARRACKS", "#8b50ff",
                    "STORAGE", "#00f5ff",
                    "WALL", "#e0e8ff",
                    "TOWER", "#ff8c00",
                    "FARMLAND", "#a3e635",
                    "RESIDENCE", "#44aaff");

    // 기존 건물의 분류·한글명·아이콘·색을 채운다. 이미 값이 있으면 유지.
    private void backfillCategoryAndDisplayName() {
        buildingTypeRepository
                .findAll()
                .forEach(
                        t ->
                                t.backfillMeta(
                                        com.territorial.auction.domain.building.entity
                                                .BuildingCategory.of(t.getName()),
                                        KOREAN_NAMES.get(t.getName()),
                                        ICONS.get(t.getName()),
                                        COLORS.get(t.getName())));
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

    /** 성 레벨에 따라 섬 IslandGrade FK·그리드 크기·성 위치를 일괄 동기화한다. */
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
            islandGradeRepository
                    .findByCastleLevelRequired(castleLevel)
                    .ifPresent(island::upgradeIsland);

            if (castle != null) {
                int center = (island.getGridSize() / 2) - 1;
                castle.movePosition(center, center, 1);
            }
            count++;
        }
        if (count > 0) {
            log.info("섬 IslandGrade 마이그레이션 완료. 대상 섬 수={}", count);
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
