package com.territorial.auction.domain.building.repository;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BuildingInstanceRepository extends JpaRepository<BuildingInstance, Long> {
    List<BuildingInstance> findByTerritoryId(Long territoryId);
}
