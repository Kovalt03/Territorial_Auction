package com.territorial.auction.domain.social.repository;

import com.territorial.auction.domain.social.entity.Friend;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FriendRepository extends JpaRepository<Friend, Long> {

    List<Friend> findByReceiverIdAndStatus(Long receiverId, Friend.FriendStatus status);

    Optional<Friend> findByRequesterIdAndReceiverId(Long requesterId, Long receiverId);
}
