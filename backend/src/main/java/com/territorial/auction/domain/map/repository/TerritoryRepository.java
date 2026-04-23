package com.territorial.auction.domain.map.repository;

import com.territorial.auction.domain.map.entity.Territory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TerritoryRepository extends JpaRepository<Territory, Long> {

    long countByOwnerId(Long ownerId);
}
