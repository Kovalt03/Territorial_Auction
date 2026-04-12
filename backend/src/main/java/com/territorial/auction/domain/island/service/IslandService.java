package com.territorial.auction.domain.island.service;

import com.territorial.auction.domain.island.entity.Island;
import com.territorial.auction.domain.island.repository.IslandRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IslandService {

    private final IslandRepository islandRepository;

    public Island findByOwnerId(Long userId) {
        return islandRepository.findByOwnerId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.ISLAND_NOT_FOUND));
    }
}
