package com.territorial.auction.domain.map.repository;

import com.territorial.auction.domain.map.entity.Continent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContinentRepository extends JpaRepository<Continent, Long> {
    boolean existsByDisplayNameIsNull();
}
