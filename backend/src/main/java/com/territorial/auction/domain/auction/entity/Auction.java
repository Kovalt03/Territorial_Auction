package com.territorial.auction.domain.auction.entity;

import com.territorial.auction.domain.map.entity.MapTile;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "auctions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Auction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tile_id", nullable = false)
    private MapTile tile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id")
    private User seller;

    @Column(nullable = false)
    private Long startPrice;

    @Column(nullable = false)
    private Long currentPrice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "highest_bidder_id")
    private User highestBidder;

    @Column(nullable = false)
    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuctionStatus status = AuctionStatus.ONGOING;

    @Builder
    public Auction(MapTile tile, User seller, Long startPrice, LocalDateTime endAt) {
        this.tile = tile;
        this.seller = seller;
        this.startPrice = startPrice;
        this.currentPrice = startPrice;
        this.endAt = endAt;
    }

    public enum AuctionStatus {
        ONGOING, ENDED, CANCELLED
    }
}
