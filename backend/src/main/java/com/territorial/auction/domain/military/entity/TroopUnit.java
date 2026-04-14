package com.territorial.auction.domain.military.entity;

import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "troop_units")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TroopUnit extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TroopType type;

    @Column(nullable = false)
    private Integer count;

    @Builder
    public TroopUnit(User owner, TroopType type, Integer count) {
        this.owner = owner;
        this.type = type;
        this.count = count;
    }

    public enum TroopType {
        INFANTRY, CAVALRY, ARCHER, SIEGE
    }
}
