package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class WorkshopScheduler {

    private final BuildingInstanceRepository buildingInstanceRepository;
    private final WalletRepository walletRepository;

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void produceWorkshopGp() {
        LocalDateTime now = LocalDateTime.now();

        List<Object[]> territoryProductions =
                buildingInstanceRepository.sumWorkshopGpProductionGroupedByOwner(now);
        List<Object[]> islandProductions =
                buildingInstanceRepository.sumIslandWorkshopGpProductionGroupedByOwner(now);

        produceGp(territoryProductions);
        produceGp(islandProductions);

        log.info(
                "생산소 GP 생산 완료. 영토 대상 유저 수={}, 섬 대상 유저 수={}",
                territoryProductions.size(),
                islandProductions.size());
    }

    private void produceGp(List<Object[]> productions) {
        for (Object[] row : productions) {
            Long ownerId = (Long) row[0];
            int gpAmount = ((Number) row[1]).intValue();
            walletRepository.findById(ownerId).ifPresent(w -> w.addGp(gpAmount));
        }
    }
}
