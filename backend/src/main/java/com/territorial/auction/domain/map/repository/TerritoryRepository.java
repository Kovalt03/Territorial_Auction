package com.territorial.auction.domain.map.repository;

import com.territorial.auction.domain.map.entity.Territory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TerritoryRepository extends JpaRepository<Territory, Long> {

    long countByOwnerId(Long ownerId);

    @Query("SELECT t FROM Territory t JOIN FETCH t.continent JOIN FETCH t.grade")
    List<Territory> findAllWithContinentAndGrade();

    List<Territory> findAllByContinentId(Long continentId);

    @Query(
            "SELECT t FROM Territory t JOIN FETCH t.continent JOIN FETCH t.grade LEFT JOIN FETCH t.owner WHERE t.id = :id")
    Optional<Territory> findByIdWithDetails(@Param("id") Long id);

    long countByContinentId(Long continentId);

    long countByContinentIdAndStatus(Long continentId, Territory.TerritoryStatus status);
}
