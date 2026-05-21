package com.territorial.auction.domain.user.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "wallets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Wallet {

    @Id private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private Integer availableAp = 0;

    @Column(nullable = false)
    private Integer lockedAp = 0;

    @Column(nullable = false)
    private Integer availableGp = 0;

    @Column(nullable = false, columnDefinition = "INT DEFAULT 100")
    private Integer availableFood = 100;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Wallet(User user) {
        this.user = user;
    }

    public void lockAp(int amount) {
        this.availableAp -= amount;
        this.lockedAp += amount;
    }

    public void refundLockedAp(int amount) {
        this.lockedAp -= amount;
        this.availableAp += amount;
    }

    public void consumeLockedAp(int amount) {
        this.lockedAp -= amount;
    }

    public void spendAp(int amount) {
        this.availableAp -= amount;
    }

    public void addGp(int amount) {
        this.availableGp += amount;
    }

    public void addAp(int amount) {
        this.availableAp += amount;
    }

    public void spendGp(int amount) {
        this.availableGp -= amount;
    }

    public void addFood(int amount) {
        this.availableFood += amount;
    }

    public void spendFood(int amount) {
        this.availableFood -= amount;
    }
}
