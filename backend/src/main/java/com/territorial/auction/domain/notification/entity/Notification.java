package com.territorial.auction.domain.notification.entity;

import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.global.common.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receiver_id", nullable = false)
    private User receiver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(nullable = false)
    private boolean isRead = false;

    @Builder
    public Notification(User receiver, NotificationType type, String content) {
        this.receiver = receiver;
        this.type = type;
        this.content = content;
    }

    public enum NotificationType {
        AUCTION_BID, AUCTION_WIN, AUCTION_END,
        FRIEND_REQUEST, FRIEND_ACCEPT,
        ATTACK, TILE_LOST
    }
}
