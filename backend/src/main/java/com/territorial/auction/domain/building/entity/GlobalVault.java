package com.territorial.auction.domain.building.entity;

import com.territorial.auction.domain.user.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "global_vaults")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GlobalVault {

    @Id private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private Integer storedGp = 0;

    @Column(nullable = false)
    private Integer capacity = 500;

    private LocalDateTime lastTransferAt;

    @Builder
    public GlobalVault(User user) {
        this.user = user;
    }

    public void receiveGp(int amount) {
        this.storedGp += amount;
    }

    public void withdrawGp(int amount) {
        this.storedGp -= amount;
    }

    public void recordTransfer() {
        this.lastTransferAt = java.time.LocalDateTime.now();
    }
}
