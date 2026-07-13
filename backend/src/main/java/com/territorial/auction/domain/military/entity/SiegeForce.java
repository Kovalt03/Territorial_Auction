package com.territorial.auction.domain.military.entity;

import jakarta.persistence.*;
import lombok.*;

/** 한 공성전에 공격자가 커밋한 병력(유닛 타입별 수량). 선언 시 대기 풀에서 차감돼 여기 기록되고, 판정 후 생존분은 환원된다. */
@Entity
@Table(name = "siege_forces")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SiegeForce {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "siege_id", nullable = false)
    private SiegeEvent siege;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_type_id", nullable = false)
    private UnitType unitType;

    @Column(nullable = false)
    private Integer quantity;

    @Builder
    public SiegeForce(SiegeEvent siege, UnitType unitType, Integer quantity) {
        this.siege = siege;
        this.unitType = unitType;
        this.quantity = quantity;
    }

    // 전투 손실 반영 — 생존 수량으로 줄인다.
    public void subtractQuantity(int amount) {
        this.quantity -= amount;
    }
}
