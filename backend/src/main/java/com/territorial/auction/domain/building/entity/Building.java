package com.territorial.auction.domain.building.entity;

import com.territorial.auction.domain.map.entity.MapTile;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "buildings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Building extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tile_id", nullable = false)
    private MapTile tile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BuildingType type;

    @Column(nullable = false)
    private Integer level = 1;

    @Builder
    public Building(MapTile tile, User owner, BuildingType type) {
        this.tile = tile;
        this.owner = owner;
        this.type = type;
    }

    public enum BuildingType {
        GOLD_MINE, BARRACKS, FORTRESS, MARKET, FARM
    }
}
