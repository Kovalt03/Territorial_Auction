package com.territorial.auction.domain.building.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "island_grades")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class IslandGrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 5)
    private String name;

    @Column(nullable = false)
    private Integer gridSize;

    @Column(nullable = false)
    private Integer zone1Radius;

    @Column(nullable = false)
    private Integer zone2Radius;

    @Column(nullable = false)
    private Integer castleLevelRequired;

    @Builder
    public IslandGrade(
            String name,
            Integer gridSize,
            Integer zone1Radius,
            Integer zone2Radius,
            Integer castleLevelRequired) {
        this.name = name;
        this.gridSize = gridSize;
        this.zone1Radius = zone1Radius;
        this.zone2Radius = zone2Radius;
        this.castleLevelRequired = castleLevelRequired;
    }
}
