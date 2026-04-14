package com.territorial.auction.domain.building.repository;

import com.territorial.auction.domain.building.entity.BuildingType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BuildingTypeRepository extends JpaRepository<BuildingType, Long> {
}
