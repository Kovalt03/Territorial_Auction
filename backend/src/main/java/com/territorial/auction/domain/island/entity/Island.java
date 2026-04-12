package com.territorial.auction.domain.island.entity;

import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "islands")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Island extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false)
    private Integer tileCount = 0;

    @Column(nullable = false)
    private Long totalGoldProduction = 0L;

    @Builder
    public Island(User owner, String name) {
        this.owner = owner;
        this.name = name;
    }
}
