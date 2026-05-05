package com.territorial.auction.domain.item.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Item {

    public enum ItemType {
        INVINCIBILITY,
        ATTACK_NORMAL,
        ATTACK_PRECISION,
        GP_PURCHASE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemType itemType;

    @Column(length = 200)
    private String description;

    private Integer costAp;

    private Integer costGp;

    private Integer dailyLimit;

    private Integer gpReward; // GP_PURCHASE 타입: 구매 즉시 지급할 GP 수량

    @Builder
    public Item(
            String name,
            ItemType itemType,
            String description,
            Integer costAp,
            Integer costGp,
            Integer dailyLimit,
            Integer gpReward) {
        this.name = name;
        this.itemType = itemType;
        this.description = description;
        this.costAp = costAp;
        this.costGp = costGp;
        this.dailyLimit = dailyLimit;
        this.gpReward = gpReward;
    }
}
