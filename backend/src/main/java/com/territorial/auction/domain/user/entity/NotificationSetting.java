package com.territorial.auction.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationSetting {

    @Id private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private boolean isOutbidEnabled = true;

    @Column(nullable = false)
    private boolean isAuctionStartEnabled = true;

    @Column(nullable = false)
    private boolean isMarketingEnabled = false;

    @Builder
    public NotificationSetting(User user) {
        this.user = user;
    }
}
