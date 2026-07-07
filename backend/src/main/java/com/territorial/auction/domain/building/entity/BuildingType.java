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
    private String name; // 영문 코드(서버 식별자). CASTLE / WORKSHOP / FARMLAND / RESIDENCE / STORAGE ...

    @Column(length = 30)
    private String displayName; // 한글 표시명 (사용자 노출). NULL이면 프론트 기본 매핑 사용

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BuildingCategory category; // FUNCTIONAL(기능) / DECORATIVE(장식)

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

    @Column(length = 10)
    private String icon; // 이모지 아이콘 (관리자 지정). NULL이면 프론트 기본 매핑 사용

    @Column(length = 7)
    private String colorHex; // #RRGGBB (관리자 지정). NULL이면 프론트 기본 매핑 사용

    public boolean isCastle() {
        return "CASTLE".equals(this.name);
    }

    public void patchGpProductionRate(int rate) {
        this.gpProductionRate = rate;
    }

    // 기존 시드 데이터 백필: 비어 있는 분류·한글명만 채운다.
    public void backfillMeta(BuildingCategory category, String displayName) {
        if (this.category == null) this.category = category;
        if (this.displayName == null) this.displayName = displayName;
    }

    // 관리자 편집: 이름(코드)·분류를 제외한 속성 갱신. 이름은 서버 식별자라 변경 불가.
    public void update(
            String displayName,
            Integer width,
            Integer height,
            Integer maxHp,
            Integer baseCostGp,
            Integer zoneRestriction,
            Integer defensePower,
            Integer foodProductionRate,
            Integer unitCapacityPerLevel,
            Integer gpProductionRate,
            String icon,
            String colorHex) {
        this.displayName = displayName;
        this.width = width;
        this.height = height;
        this.maxHp = maxHp;
        this.baseCostGp = baseCostGp;
        this.zoneRestriction = zoneRestriction;
        this.defensePower = defensePower;
        this.foodProductionRate = foodProductionRate;
        this.unitCapacityPerLevel = unitCapacityPerLevel;
        this.gpProductionRate = gpProductionRate;
        this.icon = icon;
        this.colorHex = colorHex;
    }

    @Builder
    public BuildingType(
            String name,
            String displayName,
            BuildingCategory category,
            Integer width,
            Integer height,
            Integer maxHp,
            Integer baseCostGp,
            Integer zoneRestriction,
            Integer defensePower,
            Integer foodProductionRate,
            Integer unitCapacityPerLevel,
            Integer gpProductionRate,
            String icon,
            String colorHex) {
        this.name = name;
        this.displayName = displayName;
        this.category = category != null ? category : BuildingCategory.of(name);
        this.width = width;
        this.height = height;
        this.maxHp = maxHp;
        this.baseCostGp = baseCostGp;
        this.zoneRestriction = zoneRestriction;
        this.defensePower = defensePower;
        this.foodProductionRate = foodProductionRate;
        this.unitCapacityPerLevel = unitCapacityPerLevel;
        this.gpProductionRate = gpProductionRate;
        this.icon = icon;
        this.colorHex = colorHex;
    }
}
