package com.territorial.auction.domain.island.repository;

import com.territorial.auction.domain.island.entity.Island;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface IslandRepository extends JpaRepository<Island, Long> {

    Optional<Island> findByOwnerId(Long ownerId);
}
