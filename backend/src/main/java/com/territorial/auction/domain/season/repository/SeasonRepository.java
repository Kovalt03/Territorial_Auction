package com.territorial.auction.domain.season.repository;

import com.territorial.auction.domain.season.entity.Season;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeasonRepository extends JpaRepository<Season, Long> {
}
