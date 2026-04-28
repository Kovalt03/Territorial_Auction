package com.territorial.auction.domain.auction.repository;

import com.territorial.auction.domain.auction.entity.Auction;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuctionRepository extends JpaRepository<Auction, Long> {

    Boolean existsByTerritoryId(Long territoryId);

    Optional<Auction> findByTerritoryId(Long territoryId);

    @Query(
            value =
                    "SELECT a FROM Auction a"
                            + " JOIN FETCH a.territory t"
                            + " JOIN FETCH t.continent"
                            + " JOIN FETCH t.grade"
                            + " LEFT JOIN a.currentBidder"
                            + " WHERE (:continentId IS NULL OR t.continent.id = :continentId)"
                            + " AND (:status IS NULL"
                            + "   OR (:status = 'BIDDING' AND a.endAt > :now)"
                            + "   OR (:status = 'IDLE'    AND a.endAt <= :now))",
            countQuery =
                    "SELECT COUNT(a) FROM Auction a"
                            + " JOIN a.territory t"
                            + " WHERE (:continentId IS NULL OR t.continent.id = :continentId)"
                            + " AND (:status IS NULL"
                            + "   OR (:status = 'BIDDING' AND a.endAt > :now)"
                            + "   OR (:status = 'IDLE'    AND a.endAt <= :now))")
    Page<Auction> findAllWithFilter(
            @Param("continentId") Long continentId,
            @Param("status") String status,
            @Param("now") LocalDateTime now,
            Pageable pageable);
}
