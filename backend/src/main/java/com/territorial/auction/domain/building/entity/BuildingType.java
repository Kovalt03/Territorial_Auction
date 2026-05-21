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
    private String
            name; // CASTLE / STORAGE / WORKSHOP / BARRACKS / WALL / TOWER / FARMLAND / RESIDENCE

    @Column(nullable = false)
    private Integer width;

    @Column(nullable = false)
    private Integer height;

    @Column(nullable = false)
    private Integer maxHp;

    @Column(nullable = false)
    private Integer baseCostGp;

    // 양수: 해당 Zone에만 배치 가능 (예: 1 = Zone1 전용 — CASTLE)
    // 음수: |값| 이상 Zone에만 배치 가능 (예: -2 = Zone2/3 전용 — FARMLAND)
    private Integer zoneRestriction;

    @Column private Integer defensePower; // NULL 허용 — 방어 건물(WALL, TOWER)만 값 있음

    @Column private Integer foodProductionRate; // NULL 허용 — FARMLAND만 값 있음

    @Column private Integer unitCapacityPerLevel; // NULL 허용 — RESIDENCE만 값 있음

    @Column private Integer gpProductionRate; // NULL 허용 — WORKSHOP만 값 있음

    @Builder
    public BuildingType(
            String name,
            Integer width,
            Integer height,
            Integer maxHp,
            Integer baseCostGp,
            Integer zoneRestriction,
            Integer defensePower,
            Integer foodProductionRate,
            Integer unitCapacityPerLevel,
            Integer gpProductionRate) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.maxHp = maxHp;
        this.baseCostGp = baseCostGp;
        this.zoneRestriction = zoneRestriction;
        this.defensePower = defensePower;
        this.foodProductionRate = foodProductionRate;
        this.unitCapacityPerLevel = unitCapacityPerLevel;
        this.gpProductionRate = gpProductionRate;
    }
}
