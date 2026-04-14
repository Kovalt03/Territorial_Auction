package com.territorial.auction.domain.building.repository;

import com.territorial.auction.domain.building.entity.Building;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BuildingRepository extends JpaRepository<Building, Long> {

    List<Building> findByOwnerId(Long ownerId);

    List<Building> findByTileId(Long tileId);
}
