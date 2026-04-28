package com.territorial.auction.domain.auction.repository;

import com.territorial.auction.domain.auction.entity.AuctionBid;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuctionBidRepository extends JpaRepository<AuctionBid, Long> {

    List<AuctionBid> findTop5ByAuctionIdOrderByBidAtDesc(Long auctionId);

    List<AuctionBid> findAllByAuctionIdOrderByBidAtAsc(Long auctionId);

    Optional<AuctionBid> findTopByAuctionIdAndBidderIdOrderByPriceDesc(
            Long auctionId, Long bidderId);

    @Query(
            value =
                    "SELECT ab FROM AuctionBid ab"
                            + " JOIN FETCH ab.auction a"
                            + " JOIN FETCH a.territory t"
                            + " JOIN FETCH t.continent"
                            + " JOIN FETCH t.grade"
                            + " WHERE ab.bidder.id = :userId",
            countQuery = "SELECT COUNT(ab) FROM AuctionBid ab WHERE ab.bidder.id = :userId")
    Page<AuctionBid> findAllByBidderIdWithAuction(@Param("userId") Long userId, Pageable pageable);
}
