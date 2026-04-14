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
    private Integer foodCostPerHour;

    @Builder
    public UnitType(String name, Integer attackPower, Integer defensePower,
                    Integer costGp, Integer foodCostPerHour) {
        this.name = name;
        this.attackPower = attackPower;
        this.defensePower = defensePower;
        this.costGp = costGp;
        this.foodCostPerHour = foodCostPerHour;
    }
}
