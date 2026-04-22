package com.territorial.auction.domain.notification.repository;

import com.territorial.auction.domain.notification.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {}
