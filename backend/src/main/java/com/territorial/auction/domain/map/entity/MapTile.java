package com.territorial.auction.domain.map.entity;

import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "map_tiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MapTile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer tileX;

    @Column(nullable = false)
    private Integer tileY;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TileStatus status = TileStatus.EMPTY;

    @Builder
    public MapTile(Integer tileX, Integer tileY) {
        this.tileX = tileX;
        this.tileY = tileY;
    }

    public enum TileStatus {
        EMPTY, OCCUPIED, IN_AUCTION
    }
}
