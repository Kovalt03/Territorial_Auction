package com.territorial.auction.domain.auction.repository;

import com.territorial.auction.domain.auction.entity.Auction;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuctionRepository extends JpaRepository<Auction, Long> {

    Boolean existsByTerritoryId(Long territoryId);

    Optional<Auction> findByTerritoryId(Long territoryId);
}
