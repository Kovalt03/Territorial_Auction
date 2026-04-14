package com.territorial.auction.domain.building.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "building_types")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BuildingType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String name; // CASTLE / STORAGE / WORKSHOP / BARRACKS / WALL / TOWER

    @Column(nullable = false)
    private Integer width;

    @Column(nullable = false)
    private Integer height;

    @Column(nullable = false)
    private Integer maxHp;

    @Column(nullable = false)
    private Integer baseCostGp;

    private Integer zoneRestriction; // 1 = Zone1에만 배치 가능

    @Builder
    public BuildingType(String name, Integer width, Integer height,
                        Integer maxHp, Integer baseCostGp, Integer zoneRestriction) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.maxHp = maxHp;
        this.baseCostGp = baseCostGp;
        this.zoneRestriction = zoneRestriction;
    }
}
