package com.territorial.auction.domain.auction.repository;

import com.territorial.auction.domain.auction.entity.Bid;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BidRepository extends JpaRepository<Bid, Long> {

    List<Bid> findByAuctionIdOrderByAmountDesc(Long auctionId);

    List<Bid> findByBidderId(Long bidderId);
}
