package com.territorial.auction.domain.social.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "chat_rooms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ChatRoomType type;

    private Long targetId; // 대륙 ID (CONTINENT 타입일 때)

    @Builder
    public ChatRoom(ChatRoomType type, Long targetId) {
        this.type = type;
        this.targetId = targetId;
    }

    public enum ChatRoomType {
        WORLD,
        CONTINENT
    }
}
