package com.territorial.auction.domain.building.entity;

import com.territorial.auction.domain.map.entity.Territory;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "building_instances")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BuildingInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "territory_id")
    private Territory territory; // NULL이면 섬 건물

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "island_id")
    private HomeIsland island; // NULL이면 영토 건물

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_type_id", nullable = false)
    private BuildingType buildingType;

    @Column(nullable = false)
    private Integer posX;

    @Column(nullable = false)
    private Integer posY;

    @Column(nullable = false)
    private Integer hp;

    @Column(nullable = false)
    private Integer level = 1;

    @Column(nullable = false)
    private Integer zone; // 1 / 2 / 3

    @Column(nullable = false)
    private boolean isDestroyed = false;

    @Builder
    public BuildingInstance(
            Territory territory,
            HomeIsland island,
            BuildingType buildingType,
            Integer posX,
            Integer posY,
            Integer hp,
            Integer zone) {
        this.territory = territory;
        this.island = island;
        this.buildingType = buildingType;
        this.posX = posX;
        this.posY = posY;
        this.hp = hp;
        this.zone = zone;
    }
}
