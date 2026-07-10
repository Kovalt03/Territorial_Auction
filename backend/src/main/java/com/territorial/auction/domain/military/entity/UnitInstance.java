package com.territorial.auction.domain.military.entity;

import com.territorial.auction.domain.building.entity.HomeIsland;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "unit_instances")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UnitInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_type_id", nullable = false)
    private UnitType unitType;

    @Column(nullable = false)
    private Integer quantity;

    // 유닛이 귀속된 위치. 영토 또는 섬 중 하나만 설정된다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_territory_id")
    private Territory homeTerritory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_island_id")
    private HomeIsland homeIsland;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deployed_territory_id")
    private Territory deployedTerritory; // NULL이면 대기 중

    @Builder
    public UnitInstance(
            User user,
            UnitType unitType,
            Integer quantity,
            Territory homeTerritory,
            HomeIsland homeIsland) {
        this.user = user;
        this.unitType = unitType;
        this.quantity = quantity;
        this.homeTerritory = homeTerritory;
        this.homeIsland = homeIsland;
    }

    /** 귀속 위치 설정 — 영토와 섬은 배타적이다. */
    public void assignHomeTerritory(Territory territory) {
        this.homeTerritory = territory;
        this.homeIsland = null;
    }

    public void assignHomeIsland(HomeIsland island) {
        this.homeIsland = island;
        this.homeTerritory = null;
    }

    public void addQuantity(int amount) {
        this.quantity += amount;
    }

    public void subtractQuantity(int amount) {
        this.quantity -= amount;
    }

    public void deployTo(Territory territory) {
        this.deployedTerritory = territory;
    }

    public void recall() {
        this.deployedTerritory = null;
    }
}
