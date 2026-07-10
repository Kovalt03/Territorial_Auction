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

    /** 유저가 지금 짓거나 업그레이드하고 있는 건물 수 — 건축 장인 슬롯 점유량 */
    @Query(
            "SELECT COUNT(b) FROM BuildingInstance b"
                    + " WHERE b.buildCompleteAt > :now"
                    + " AND (b.island.user.id = :userId OR b.territory.owner.id = :userId)")
    long countUnderConstructionByOwnerId(
            @Param("userId") Long userId, @Param("now") LocalDateTime now);

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

    /** 유저 소유 영토 건물의 유닛 수용량 합산 — 유닛 값(기본/레벨지정)이 있는 건물이면 어떤 종류든 포함 */
    @Query(
            "SELECT COALESCE(SUM(COALESCE(s.unitCapacityPerLevel, b.level * b.buildingType.unitCapacityPerLevel)), 0)"
                    + " FROM BuildingInstance b"
                    + " LEFT JOIN BuildingLevelSpec s ON s.buildingType = b.buildingType AND s.level = b.level"
                    + " WHERE b.territory.owner.id = :userId AND b.isDestroyed = false")
    Integer sumResidenceCapacityByOwnerId(@Param("userId") Long userId);

    /** 식량 생산량을 소유자별로 합산 — 식량 값(기본/레벨지정)이 있는 건물이면 어떤 종류든 포함 */
    @Query(
            "SELECT b.territory.owner.id, SUM(COALESCE(s.foodProductionRate, b.level * b.buildingType.foodProductionRate))"
                    + " FROM BuildingInstance b"
                    + " LEFT JOIN BuildingLevelSpec s ON s.buildingType = b.buildingType AND s.level = b.level"
                    + " WHERE b.isDestroyed = false AND b.territory IS NOT NULL"
                    + " AND (b.buildingType.foodProductionRate IS NOT NULL OR s.foodProductionRate IS NOT NULL)"
                    + " GROUP BY b.territory.owner.id")
    List<Object[]> sumFarmlandFoodProductionGroupedByOwner();

    /** GP 생산량을 소유자별로 합산 — GP 값(기본/레벨지정)이 있는 건물이면 어떤 종류든 포함 */
    @Query(
            "SELECT b.territory.owner.id, SUM(COALESCE(s.gpProductionRate, b.level * b.buildingType.gpProductionRate))"
                    + " FROM BuildingInstance b"
                    + " LEFT JOIN BuildingLevelSpec s ON s.buildingType = b.buildingType AND s.level = b.level"
                    + " WHERE b.isDestroyed = false AND b.territory IS NOT NULL"
                    + " AND (b.buildingType.gpProductionRate IS NOT NULL OR s.gpProductionRate IS NOT NULL)"
                    + " AND (b.workshopDebuffUntil IS NULL OR b.workshopDebuffUntil < :now)"
                    + " GROUP BY b.territory.owner.id")
    List<Object[]> sumWorkshopGpProductionGroupedByOwner(@Param("now") LocalDateTime now);

    @Query(
            "SELECT COUNT(b) > 0 FROM BuildingInstance b"
                    + " WHERE b.island.id = :islandId AND b.buildingType.name = 'CASTLE'")
    boolean existsCastleOnIsland(@Param("islandId") Long islandId);

    @Query(
            "SELECT b.level FROM BuildingInstance b"
                    + " WHERE b.island.id = :islandId AND b.buildingType.name = 'CASTLE'")
    Optional<Integer> findCastleLevelByIslandId(@Param("islandId") Long islandId);

    /** 섬에 배치된 특정 종류의 건물 수 — 건설 중인 것도 자리를 차지하므로 함께 센다. */
    @Query(
            "SELECT COUNT(b) FROM BuildingInstance b"
                    + " WHERE b.island.id = :islandId AND b.buildingType.id = :buildingTypeId")
    long countByIslandIdAndBuildingTypeId(
            @Param("islandId") Long islandId, @Param("buildingTypeId") Long buildingTypeId);

    @Query(
            "SELECT b FROM BuildingInstance b JOIN FETCH b.buildingType"
                    + " WHERE b.island IS NOT NULL AND b.buildingType.name = 'CASTLE'"
                    + " AND b.posX = :posX AND b.posY = :posY")
    List<BuildingInstance> findIslandCastlesAtPosition(
            @Param("posX") int posX, @Param("posY") int posY);
}
