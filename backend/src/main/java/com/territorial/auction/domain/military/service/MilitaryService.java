package com.territorial.auction.domain.military.service;

import com.territorial.auction.domain.military.repository.TroopUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MilitaryService {

    private final TroopUnitRepository troopUnitRepository;
}
