package com.territorial.auction.domain.map.service;

import com.territorial.auction.domain.map.entity.MapTile;
import com.territorial.auction.domain.map.repository.MapTileRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MapService {

    private final MapTileRepository mapTileRepository;

    public List<MapTile> getAllTiles() {
        return mapTileRepository.findAll();
    }

    public MapTile getTile(Integer x, Integer y) {
        return mapTileRepository.findByTileXAndTileY(x, y)
                .orElseThrow(() -> new CustomException(ErrorCode.TILE_NOT_FOUND));
    }

    public List<MapTile> getUserTiles(Long userId) {
        return mapTileRepository.findByOwnerId(userId);
    }
}
