package com.territorial.auction.domain.military.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "unit_types")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UnitType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String name; // INFANTRY / ARCHER / KNIGHT

    @Column(nullable = false)
    private Integer attackPower;

    @Column(nullable = false)
    private Integer defensePower;

    @Column(nullable = false)
    private Integer costGp;

    @Column(nullable = false)
    private Integer foodCost;

    /** 생산에 필요한 최소 병영 레벨 */
    @Column(nullable = false, columnDefinition = "INT DEFAULT 1")
    private Integer level = 1;

    @Builder
    public UnitType(
            String name,
            Integer attackPower,
            Integer defensePower,
            Integer costGp,
            Integer foodCost,
            Integer level) {
        this.name = name;
        this.attackPower = attackPower;
        this.defensePower = defensePower;
        this.costGp = costGp;
        this.foodCost = foodCost;
        this.level = level != null ? level : 1;
    }
}
