package com.territorial.auction.domain.item.repository;

import com.territorial.auction.domain.item.entity.ItemPurchase;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemPurchaseRepository extends JpaRepository<ItemPurchase, Long> {}
