package com.territorial.auction.domain.map.repository;

import com.territorial.auction.domain.map.entity.LandTaxLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LandTaxLogRepository extends JpaRepository<LandTaxLog, Long> {
}
