package com.territorial.auction.domain.season.repository;

import com.territorial.auction.domain.season.entity.UserSeasonPass;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSeasonPassRepository extends JpaRepository<UserSeasonPass, Long> {
}
