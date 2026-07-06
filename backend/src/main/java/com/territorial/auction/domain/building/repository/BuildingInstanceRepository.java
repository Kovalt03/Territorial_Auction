package com.territorial.auction.domain.building.repository;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BuildingInstanceRepository extends JpaRepository<BuildingInstance, Long> {

    long countByBuildingType_Id(Long buildingTypeId);

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

    @Query(
            "SELECT b FROM BuildingInstance b JOIN FETCH b.buildingType"
                    + " WHERE b.territory.id = :territoryId"
                    + " AND b.buildingType.name = 'STORAGE'"
                    + " AND b.posX >= 0"
                    + " AND b.isDestroyed = false")
    Optional<BuildingInstance> findActiveStorageByTerritoryId(
            @Param("territoryId") Long territoryId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BuildingInstance b JOIN FETCH b.buildingType WHERE b.id = :id")
    Optional<BuildingInstance> findByIdWithLock(@Param("id") Long id);

    // 파괴 여부 무관 조회 + 비관적 락 — collect() 전용
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
            "SELECT b FROM BuildingInstance b JOIN FETCH b.buildingType"
                    + " WHERE b.territory.id = :territoryId"
                    + " AND b.buildingType.name = 'STORAGE'"
                    + " AND b.posX >= 0")
    Optional<BuildingInstance> findStorageByTerritoryIdWithLock(
            @Param("territoryId") Long territoryId);

    /** 유저 소유 영토의 활성 BARRACKS 중 최고 레벨 반환 */
    @Query(
            "SELECT MAX(b.level) FROM BuildingInstance b"
                    + " WHERE b.territory.owner.id = :userId AND b.buildingType.name = 'BARRACKS' AND b.isDestroyed = false")
    Optional<Integer> findMaxBarracksLevelByOwnerId(@Param("userId") Long userId);

    /** 유저 소유 영토의 활성 CASTLE 레벨 목록 반환 */
    @Query(
            "SELECT b.level FROM BuildingInstance b"
                    + " WHERE b.territory.owner.id = :userId AND b.buildingType.name = 'CASTLE' AND b.isDestroyed = false")
    List<Integer> findActiveCastleLevelsByOwnerId(@Param("userId") Long userId);

    /** 유저 소유 영토의 활성 RESIDENCE 유닛 슬롯 합산 (level × unitCapacityPerLevel) */
    @Query(
            "SELECT COALESCE(SUM(b.level * b.buildingType.unitCapacityPerLevel), 0) FROM BuildingInstance b"
                    + " WHERE b.territory.owner.id = :userId AND b.buildingType.name = 'RESIDENCE' AND b.isDestroyed = false")
    Integer sumResidenceCapacityByOwnerId(@Param("userId") Long userId);

    /** 농경지 식량 생산량을 소유자별로 합산 — FarmlandScheduler 전용 */
    @Query(
            "SELECT b.territory.owner.id, SUM(b.level * b.buildingType.foodProductionRate)"
                    + " FROM BuildingInstance b"
                    + " WHERE b.buildingType.name = 'FARMLAND' AND b.isDestroyed = false AND b.territory IS NOT NULL"
                    + " GROUP BY b.territory.owner.id")
    List<Object[]> sumFarmlandFoodProductionGroupedByOwner();

    /** 영토 WORKSHOP GP 생산량을 소유자별로 합산 — WorkshopScheduler 전용 */
    @Query(
            "SELECT b.territory.owner.id, SUM(b.level * b.buildingType.gpProductionRate)"
                    + " FROM BuildingInstance b"
                    + " WHERE b.buildingType.name = 'WORKSHOP' AND b.isDestroyed = false AND b.territory IS NOT NULL"
                    + " AND (b.workshopDebuffUntil IS NULL OR b.workshopDebuffUntil < :now)"
                    + " GROUP BY b.territory.owner.id")
    List<Object[]> sumWorkshopGpProductionGroupedByOwner(@Param("now") LocalDateTime now);

    @Query(
            "SELECT COUNT(b) > 0 FROM BuildingInstance b"
                    + " WHERE b.island.id = :islandId AND b.buildingType.name = 'CASTLE'")
    boolean existsCastleOnIsland(@Param("islandId") Long islandId);

    @Query(
            "SELECT b FROM BuildingInstance b JOIN FETCH b.buildingType"
                    + " WHERE b.island IS NOT NULL AND b.buildingType.name = 'CASTLE'"
                    + " AND b.posX = :posX AND b.posY = :posY")
    List<BuildingInstance> findIslandCastlesAtPosition(
            @Param("posX") int posX, @Param("posY") int posY);
}
