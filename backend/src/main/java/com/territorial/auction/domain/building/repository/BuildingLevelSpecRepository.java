package com.territorial.auction.domain.building.repository;

import com.territorial.auction.domain.building.entity.BuildingLevelSpec;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BuildingLevelSpecRepository extends JpaRepository<BuildingLevelSpec, Long> {

    List<BuildingLevelSpec> findAllByBuildingType_Id(Long buildingTypeId);

    Optional<BuildingLevelSpec> findByBuildingType_IdAndLevel(Long buildingTypeId, Integer level);
}
