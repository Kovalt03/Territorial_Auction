package com.territorial.auction.domain.auction.entity;

import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bids")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Bid extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false)
    private Auction auction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bidder_id", nullable = false)
    private User bidder;

    @Column(nullable = false)
    private Long amount;

    @Builder
    public Bid(Auction auction, User bidder, Long amount) {
        this.auction = auction;
        this.bidder = bidder;
        this.amount = amount;
    }
}
