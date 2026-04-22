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

    private Integer costAp; // NULL이면 AP로 구매 불가

    private Integer costGp; // NULL이면 GP로 구매 불가

    private Integer dailyLimit; // NULL이면 무제한

    @Builder
    public Item(
            String name, ItemType itemType, Integer costAp, Integer costGp, Integer dailyLimit) {
        this.name = name;
        this.itemType = itemType;
        this.costAp = costAp;
        this.costGp = costGp;
        this.dailyLimit = dailyLimit;
    }
}
