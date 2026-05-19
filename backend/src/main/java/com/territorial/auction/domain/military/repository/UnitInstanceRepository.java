package com.territorial.auction.domain.military.repository;

import com.territorial.auction.domain.military.entity.UnitInstance;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnitInstanceRepository extends JpaRepository<UnitInstance, Long> {

    List<UnitInstance> findByUserId(Long userId);

    Optional<UnitInstance> findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(
            Long userId, Long unitTypeId);

    Optional<UnitInstance> findByUserIdAndUnitTypeIdAndDeployedTerritoryId(
            Long userId, Long unitTypeId, Long territoryId);
}
