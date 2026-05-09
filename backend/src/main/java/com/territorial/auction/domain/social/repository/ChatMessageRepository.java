package com.territorial.auction.domain.social.repository;

import com.territorial.auction.domain.social.entity.ChatMessage;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByRoom_IdOrderByIdDesc(Long roomId, Pageable pageable);

    List<ChatMessage> findByRoom_IdAndIdLessThanOrderByIdDesc(
            Long roomId, Long beforeId, Pageable pageable);
}
