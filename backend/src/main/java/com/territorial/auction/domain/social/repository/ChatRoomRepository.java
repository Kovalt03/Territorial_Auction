package com.territorial.auction.domain.social.repository;

import com.territorial.auction.domain.social.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
}
