package com.territorial.auction.domain.building.repository;

import com.territorial.auction.domain.building.entity.GlobalVault;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface GlobalVaultRepository extends JpaRepository<GlobalVault, Long> {

    @Query("SELECT COALESCE(SUM(v.storedGp), 0) FROM GlobalVault v")
    long sumStoredGp();
}
