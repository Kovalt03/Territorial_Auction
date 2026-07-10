package com.territorial.auction.domain.building.service;

import com.territorial.auction.domain.building.repository.BuildingInstanceRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class FarmlandScheduler {

    private final BuildingInstanceRepository buildingInstanceRepository;
    private final WalletRepository walletRepository;

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void produceFarmlandFood() {
        List<Object[]> productions =
                buildingInstanceRepository.sumFarmlandFoodProductionGroupedByOwner(
                        java.time.LocalDateTime.now());
        for (Object[] row : productions) {
            Long ownerId = (Long) row[0];
            int foodAmount = ((Number) row[1]).intValue();
            walletRepository.findById(ownerId).ifPresent(w -> w.addFood(foodAmount));
        }
        log.info("농경지 식량 생산 완료. 대상 유저 수={}", productions.size());
    }
}
