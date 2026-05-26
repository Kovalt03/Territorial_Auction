package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.entity.IslandGrade;
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
@Order(3)
@RequiredArgsConstructor
public class IslandGradeSeeder implements ApplicationRunner {

    private final IslandGradeRepository islandGradeRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (islandGradeRepository.count() > 0) {
            log.info("island_grades 이미 존재 — 건너뜀");
            return;
        }
        List<IslandGrade> grades = loadEntries().stream().map(this::toEntity).toList();
        islandGradeRepository.saveAll(grades);
        log.info("island_grades 시드 완료. 건수={}", grades.size());
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> loadEntries() {
        Yaml yaml = new Yaml();
        try (InputStream is = getClass().getResourceAsStream("/db/island-grades.yml")) {
            Map<String, Object> root = yaml.load(is);
            return (List<Map<String, Object>>) root.get("islandGrades");
        } catch (Exception e) {
            throw new IllegalStateException("island-grades.yml 로드 실패", e);
        }
    }

    private IslandGrade toEntity(Map<String, Object> m) {
        return IslandGrade.builder()
                .name((String) m.get("name"))
                .gridSize((Integer) m.get("gridSize"))
                .zone1Radius((Integer) m.get("zone1Radius"))
                .zone2Radius((Integer) m.get("zone2Radius"))
                .castleLevelRequired((Integer) m.get("castleLevelRequired"))
                .build();
    }
}
