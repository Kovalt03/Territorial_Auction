package com.territorial.auction.domain.map.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "territory_grades")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TerritoryGrade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 1)
    private String grade; // S / A / B / C / D

    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal productionMultiplier;

    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal auctionPriceMultiplier;

    @Column(nullable = false)
    private Integer preBuiltCount = 0;

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal spawnRate;

    @Column(nullable = false)
    private Integer gridSize;

    @Builder
    public TerritoryGrade(String grade, BigDecimal productionMultiplier,
                          BigDecimal auctionPriceMultiplier, Integer preBuiltCount,
                          BigDecimal spawnRate, Integer gridSize) {
        this.grade = grade;
        this.productionMultiplier = productionMultiplier;
        this.auctionPriceMultiplier = auctionPriceMultiplier;
        this.preBuiltCount = preBuiltCount;
        this.spawnRate = spawnRate;
        this.gridSize = gridSize;
    }
}
