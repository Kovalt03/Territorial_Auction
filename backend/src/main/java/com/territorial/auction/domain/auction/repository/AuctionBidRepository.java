package com.territorial.auction.domain.auction.repository;

import com.territorial.auction.domain.auction.entity.AuctionBid;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuctionBidRepository extends JpaRepository<AuctionBid, Long> {
}
