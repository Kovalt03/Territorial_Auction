package com.territorial.auction.domain.military.repository;

import com.territorial.auction.domain.military.entity.AttackToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttackTokenRepository extends JpaRepository<AttackToken, Long> {
}
