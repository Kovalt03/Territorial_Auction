package com.territorial.auction.domain.building.repository;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BuildingInstanceRepository extends JpaRepository<BuildingInstance, Long> {

    @Query(
            "SELECT b FROM BuildingInstance b JOIN FETCH b.buildingType WHERE b.territory.id = :territoryId AND b.posX >= 0")
    List<BuildingInstance> findByTerritoryId(@Param("territoryId") Long territoryId);

    @Query(
            "SELECT b FROM BuildingInstance b JOIN FETCH b.buildingType WHERE b.island.id = :islandId AND b.posX >= 0")
    List<BuildingInstance> findByIslandId(@Param("islandId") Long islandId);

    @Query(
            "SELECT b FROM BuildingInstance b JOIN FETCH b.buildingType WHERE b.owner.id = :userId AND b.territory IS NULL AND b.island IS NULL")
    List<BuildingInstance> findStoredByOwnerId(@Param("userId") Long userId);

    @Query(
            "SELECT COUNT(b) > 0 FROM BuildingInstance b JOIN b.buildingType bt"
                    + " WHERE b.territory.owner.id = :userId AND bt.name = 'BARRACKS' AND b.isDestroyed = false")
    boolean existsActiveBarracksByOwnerId(@Param("userId") Long userId);

    @Query(
            "SELECT b FROM BuildingInstance b JOIN FETCH b.buildingType"
                    + " WHERE b.territory.id = :territoryId AND b.zone = :zone AND b.isDestroyed = false")
    List<BuildingInstance> findActiveByTerritoryIdAndZone(
            @Param("territoryId") Long territoryId, @Param("zone") Integer zone);
}
