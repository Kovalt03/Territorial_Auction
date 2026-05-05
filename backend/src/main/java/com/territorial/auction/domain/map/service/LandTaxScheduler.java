package com.territorial.auction.domain.map.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class LandTaxScheduler {

    private final LandTaxService landTaxService;

    @Scheduled(cron = "0 0 4 * * *")
    public void collectDailyLandTax() {
        // TODO - 세금 관련 처리 정책 및 로직 고민 필요.
        landTaxService.processAllUsersTax();
    }
}
