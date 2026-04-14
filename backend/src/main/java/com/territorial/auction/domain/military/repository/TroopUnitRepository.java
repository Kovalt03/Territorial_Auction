package com.territorial.auction.domain.military.repository;

import com.territorial.auction.domain.military.entity.TroopUnit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TroopUnitRepository extends JpaRepository<TroopUnit, Long> {

    List<TroopUnit> findByOwnerId(Long ownerId);
}
