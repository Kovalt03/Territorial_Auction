package com.territorial.auction.domain.user.repository;

import com.territorial.auction.domain.user.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WalletRepository extends JpaRepository<Wallet, Long> {}
