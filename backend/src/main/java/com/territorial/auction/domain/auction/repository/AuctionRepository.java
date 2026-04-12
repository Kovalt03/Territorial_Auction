package com.territorial.auction.domain.auction.repository;

import com.territorial.auction.domain.auction.entity.Auction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuctionRepository extends JpaRepository<Auction, Long> {

    List<Auction> findByStatus(Auction.AuctionStatus status);

    List<Auction> findBySellerId(Long sellerId);
}
