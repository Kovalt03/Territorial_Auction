package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.entity.BuildingType;
import com.territorial.auction.domain.building.repository.BuildingTypeRepository;
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

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (buildingTypeRepository.count() > 0) {
            log.info("building_types 이미 존재 — 건너뜀");
            return;
        }

        List<Map<String, Object>> rows = loadRows();
        List<BuildingType> types = rows.stream().map(this::toEntity).toList();
        buildingTypeRepository.saveAll(types);
        log.info("building_types 시드 완료. 건수={}", types.size());
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
