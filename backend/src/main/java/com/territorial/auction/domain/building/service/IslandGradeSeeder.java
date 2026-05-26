package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.entity.IslandGrade;
import com.territorial.auction.domain.building.repository.IslandGradeRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Order(1)
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

        List<IslandGrade> grades =
                List.of(
                        IslandGrade.builder()
                                .name("D")
                                .gridSize(10)
                                .zone1Radius(2)
                                .zone2Radius(4)
                                .castleLevelRequired(1)
                                .build(),
                        IslandGrade.builder()
                                .name("B")
                                .gridSize(15)
                                .zone1Radius(4)
                                .zone2Radius(7)
                                .castleLevelRequired(2)
                                .build(),
                        IslandGrade.builder()
                                .name("S")
                                .gridSize(20)
                                .zone1Radius(6)
                                .zone2Radius(10)
                                .castleLevelRequired(3)
                                .build());
        islandGradeRepository.saveAll(grades);
        log.info("island_grades 시드 완료. 건수={}", grades.size());
    }
}
