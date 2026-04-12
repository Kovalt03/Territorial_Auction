package com.territorial.auction.domain.map.repository;

import com.territorial.auction.domain.map.entity.MapTile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MapTileRepository extends JpaRepository<MapTile, Long> {

    Optional<MapTile> findByTileXAndTileY(Integer tileX, Integer tileY);

    List<MapTile> findByOwnerId(Long ownerId);
}
