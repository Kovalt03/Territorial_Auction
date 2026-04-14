package com.territorial.auction.domain.military.repository;

import com.territorial.auction.domain.military.entity.SiegeEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiegeEventRepository extends JpaRepository<SiegeEvent, Long> {
}
