package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.map.entity.TerritoryGrade;
import com.territorial.auction.domain.map.repository.TerritoryGradeRepository;
import java.io.InputStream;
import java.math.BigDecimal;
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
@Order(1)
@RequiredArgsConstructor
public class TerritoryGradeSeeder implements ApplicationRunner {

    private final TerritoryGradeRepository territoryGradeRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (territoryGradeRepository.count() > 0) {
            log.info("territory_grades 이미 존재 — 건너뜀");
            return;
        }
        List<TerritoryGrade> grades = loadEntries().stream().map(this::toEntity).toList();
        territoryGradeRepository.saveAll(grades);
        log.info("territory_grades 시드 완료. 건수={}", grades.size());
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> loadEntries() {
        Yaml yaml = new Yaml();
        try (InputStream is = getClass().getResourceAsStream("/db/territory-grades.yml")) {
            Map<String, Object> root = yaml.load(is);
            return (List<Map<String, Object>>) root.get("territoryGrades");
        } catch (Exception e) {
            throw new IllegalStateException("territory-grades.yml 로드 실패", e);
        }
    }

    private TerritoryGrade toEntity(Map<String, Object> m) {
        return TerritoryGrade.builder()
                .grade((String) m.get("grade"))
                .productionMultiplier(toBigDecimal(m.get("productionMultiplier")))
                .auctionPriceMultiplier(toBigDecimal(m.get("auctionPriceMultiplier")))
                .preBuiltCount((Integer) m.get("preBuiltCount"))
                .spawnRate(toBigDecimal(m.get("spawnRate")))
                .gridSize((Integer) m.get("gridSize"))
                .build();
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val instanceof Double d) return BigDecimal.valueOf(d);
        if (val instanceof Integer i) return BigDecimal.valueOf(i);
        return new BigDecimal(val.toString());
    }
}
