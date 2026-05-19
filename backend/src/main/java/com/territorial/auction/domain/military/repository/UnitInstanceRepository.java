package com.territorial.auction.domain.military.repository;

import com.territorial.auction.domain.military.entity.UnitInstance;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UnitInstanceRepository extends JpaRepository<UnitInstance, Long> {

    List<UnitInstance> findByUserId(Long userId);

    Optional<UnitInstance> findByUserIdAndUnitTypeIdAndDeployedTerritoryIsNull(
            Long userId, Long unitTypeId);

    Optional<UnitInstance> findByUserIdAndUnitTypeIdAndDeployedTerritoryId(
            Long userId, Long unitTypeId, Long territoryId);

    List<UnitInstance> findByUserIdAndDeployedTerritoryId(Long userId, Long territoryId);

    @Query(
            "SELECT u.deployedTerritory.id, SUM(u.quantity) FROM UnitInstance u"
                    + " WHERE u.deployedTerritory.id IN :territoryIds"
                    + " GROUP BY u.deployedTerritory.id")
    List<Object[]> sumQuantityGroupByTerritoryIds(@Param("territoryIds") List<Long> territoryIds);
}
