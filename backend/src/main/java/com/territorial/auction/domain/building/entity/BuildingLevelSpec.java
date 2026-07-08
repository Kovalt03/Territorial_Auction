package com.territorial.auction.domain.building.entity;

import jakarta.persistence.*;
import lombok.*;

// 건물별·레벨별 세부 설정. 현재는 레벨별 업그레이드 비용만. (없으면 공식 폴백)
@Entity
@Table(
        name = "building_level_specs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"building_type_id", "level"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BuildingLevelSpec {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_type_id", nullable = false)
    private BuildingType buildingType;

    @Column(nullable = false)
    private Integer level; // 도달 레벨(2..MAX). 해당 레벨로 올리는 비용

    @Column private Integer upgradeCostGp; // 절대 비용. NULL이면 공식 폴백

    @Builder
    public BuildingLevelSpec(BuildingType buildingType, Integer level, Integer upgradeCostGp) {
        this.buildingType = buildingType;
        this.level = level;
        this.upgradeCostGp = upgradeCostGp;
    }

    public void updateUpgradeCostGp(Integer upgradeCostGp) {
        this.upgradeCostGp = upgradeCostGp;
    }
}
