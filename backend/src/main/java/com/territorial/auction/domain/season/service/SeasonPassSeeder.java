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

    // yml을 단일 진실 공급원으로 삼는다 — 기존 행이 있으면 건너뛰지 않고 값을 맞춘다.
    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<Map<String, Object>> entries = loadEntries();
        entries.forEach(this::upsert);
        log.info("season_passes 시드 동기화 완료. 건수={}", entries.size());
    }

    private void upsert(Map<String, Object> m) {
        seasonPassRepository
                .findByName((String) m.get("name"))
                .ifPresentOrElse(
                        pass ->
                                pass.syncFromSeed(
                                        (Integer) m.get("costAp"),
                                        (Integer) m.get("durationDays"),
                                        (Integer) m.get("islandBonusPct"),
                                        (Integer) m.get("extraBuilders"),
                                        (Integer) m.get("taxExemptBonus"),
                                        (Integer) m.get("buildTimeReductionPct")),
                        () -> seasonPassRepository.save(toEntity(m)));
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
                .buildTimeReductionPct((Integer) m.get("buildTimeReductionPct"))
                .taxExemptBonus((Integer) m.get("taxExemptBonus"))
                .build();
    }
}
