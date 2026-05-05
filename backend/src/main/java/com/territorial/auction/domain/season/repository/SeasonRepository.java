package com.territorial.auction.domain.season.repository;

import com.territorial.auction.domain.season.entity.Season;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SeasonRepository extends JpaRepository<Season, Long> {

    @Query("SELECT s FROM Season s WHERE :now BETWEEN s.startedAt AND s.endedAt")
    Optional<Season> findActiveSeason(@Param("now") LocalDateTime now);
}
