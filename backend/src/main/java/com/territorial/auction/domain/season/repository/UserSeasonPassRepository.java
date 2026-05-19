package com.territorial.auction.domain.season.repository;

import com.territorial.auction.domain.season.entity.UserSeasonPass;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSeasonPassRepository extends JpaRepository<UserSeasonPass, Long> {

    Optional<UserSeasonPass> findTopByUserIdAndIsActiveTrueOrderByStartedAtDesc(Long userId);

    List<UserSeasonPass> findByIsActiveTrueAndExpiresAtBetween(
            LocalDateTime from, LocalDateTime to);
}
