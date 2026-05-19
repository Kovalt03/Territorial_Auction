package com.territorial.auction.domain.military.entity;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deployed_territory_id")
    private Territory deployedTerritory; // NULL이면 대기 중

    @Builder
    public UnitInstance(User user, UnitType unitType, Integer quantity) {
        this.user = user;
        this.unitType = unitType;
        this.quantity = quantity;
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
