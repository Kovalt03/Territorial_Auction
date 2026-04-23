package com.territorial.auction.domain.building.repository;

import com.territorial.auction.domain.building.entity.HomeIsland;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HomeIslandRepository extends JpaRepository<HomeIsland, Long> {

    Optional<HomeIsland> findByUserId(Long userId);
}
