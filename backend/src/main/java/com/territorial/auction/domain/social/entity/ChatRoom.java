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

    private Long targetId; // 길드 ID (GUILD) 또는 영토 ID (TERRITORY), GLOBAL은 null

    @Builder
    public ChatRoom(ChatRoomType type, Long targetId) {
        this.type = type;
        this.targetId = targetId;
    }

    public String toRoomId() {
        return switch (type) {
            case GLOBAL -> "room_global";
            case GUILD -> "room_guild_" + targetId;
            case TERRITORY -> "room_territory_" + targetId;
        };
    }

    public enum ChatRoomType {
        GLOBAL,
        GUILD,
        TERRITORY
    }
}
