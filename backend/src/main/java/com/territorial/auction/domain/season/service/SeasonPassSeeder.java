package com.territorial.auction.domain.season.service;

import com.territorial.auction.domain.season.entity.SeasonPass;
import com.territorial.auction.domain.season.repository.SeasonPassRepository;
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
@Order(7)
@RequiredArgsConstructor
public class SeasonPassSeeder implements ApplicationRunner {

    private final SeasonPassRepository seasonPassRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (seasonPassRepository.count() > 0) {
            log.info("season_passes 이미 존재 — 건너뜀");
            return;
        }
        List<SeasonPass> passes = loadEntries().stream().map(this::toEntity).toList();
        seasonPassRepository.saveAll(passes);
        log.info("season_passes 시드 완료. 건수={}", passes.size());
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> loadEntries() {
        Yaml yaml = new Yaml();
        try (InputStream is = getClass().getResourceAsStream("/db/season-passes.yml")) {
            Map<String, Object> root = yaml.load(is);
            return (List<Map<String, Object>>) root.get("seasonPasses");
        } catch (Exception e) {
            throw new IllegalStateException("season-passes.yml 로드 실패", e);
        }
    }

    private SeasonPass toEntity(Map<String, Object> m) {
        return SeasonPass.builder()
                .name((String) m.get("name"))
                .costAp((Integer) m.get("costAp"))
                .durationDays((Integer) m.get("durationDays"))
                .islandBonusPct((Integer) m.get("islandBonusPct"))
                .extraBuilders((Integer) m.get("extraBuilders"))
                .taxExemptBonus((Integer) m.get("taxExemptBonus"))
                .build();
    }
}
