package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.map.dto.TaxLogResponse;
import com.territorial.auction.domain.map.dto.TaxStatusResponse;
import com.territorial.auction.domain.map.entity.LandTaxLog.TaxStatus;
import com.territorial.auction.domain.map.repository.LandTaxLogRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.season.repository.UserSeasonPassRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LandTaxService {

    private final TerritoryRepository territoryRepository;
    private final LandTaxLogRepository landTaxLogRepository;
    private final UserSeasonPassRepository userSeasonPassRepository;

    public TaxStatusResponse getLandTaxStatus(Long userId) {
        // TODO
        return null;
    }

    public TaxLogResponse getLandTaxLogs(Long userId, int page, int size, TaxStatus status) {
        // TODO
        return null;
    }
}
