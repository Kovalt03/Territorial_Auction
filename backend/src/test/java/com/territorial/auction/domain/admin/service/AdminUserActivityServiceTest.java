package com.territorial.auction.domain.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.territorial.auction.domain.admin.dto.AdminSendNotificationRequest;
import com.territorial.auction.domain.admin.dto.AdminUserActiveBidListResponse;
import com.territorial.auction.domain.auction.entity.Auction;
import com.territorial.auction.domain.auction.entity.AuctionBid;
import com.territorial.auction.domain.auction.repository.AuctionBidRepository;
import com.territorial.auction.domain.map.entity.Continent;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.TerritoryGrade;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.notification.entity.NotificationLog.NotificationType;
import com.territorial.auction.domain.notification.service.NotificationService;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminUserActivityServiceTest {

    @InjectMocks private AdminUserActivityService adminUserActivityService;

    @Mock private UserRepository userRepository;
    @Mock private AuctionBidRepository auctionBidRepository;
    @Mock private TerritoryRepository territoryRepository;
    @Mock private NotificationService notificationService;
    @Mock private AdminAuditLogger adminAuditLogger;

    private final LocalDateTime now = LocalDateTime.now();

    private AuctionBid bid(
            long id, boolean settled, LocalDateTime endAt, int price, int currentPrice) {
        Continent c =
                Continent.builder()
                        .name("북부")
                        .themeColor("#00f5ff")
                        .displayName("크리오 행성")
                        .grade("S")
                        .description("d")
                        .build();
        TerritoryGrade g =
                TerritoryGrade.builder()
                        .grade("B")
                        .productionMultiplier(BigDecimal.ONE)
                        .auctionPriceMultiplier(BigDecimal.ONE)
                        .preBuiltCount(0)
                        .spawnRate(BigDecimal.ONE)
                        .gridSize(10)
                        .build();
        Territory t = Territory.builder().coordX(1).coordY(2).continent(c).grade(g).build();
        ReflectionTestUtils.setField(t, "id", id);
        Auction a =
                Auction.builder()
                        .territory(t)
                        .currentPrice(currentPrice)
                        .startAt(now.minusHours(2))
                        .endAt(endAt)
                        .maxExtendUntil(endAt.plusMinutes(30))
                        .build();
        ReflectionTestUtils.setField(a, "id", id);
        if (settled) a.settle();
        AuctionBid ab = AuctionBid.builder().auction(a).price(price).build();
        ReflectionTestUtils.setField(ab, "id", id);
        ReflectionTestUtils.setField(ab, "bidAt", now);
        return ab;
    }

    @Test
    @DisplayName("활성 입찰 조회 → 종료·정산된 경매는 제외, 최고가면 topBidder true")
    void getActiveBids_filtersEndedAndSettled() {
        given(userRepository.existsById(1L)).willReturn(true);
        given(auctionBidRepository.findLatestBidPerAuctionByBidder(1L))
                .willReturn(
                        List.of(
                                bid(1L, false, now.plusHours(1), 2000, 2000), // 진행중·최고가
                                bid(2L, false, now.minusHours(1), 1500, 1500), // 종료(endAt 지남)
                                bid(3L, true, now.plusHours(1), 1000, 1200))); // 정산됨

        AdminUserActiveBidListResponse res = adminUserActivityService.getActiveBids(1L);

        assertThat(res.activeBids()).hasSize(1);
        assertThat(res.activeBids().get(0).auctionId()).isEqualTo(1L);
        assertThat(res.activeBids().get(0).topBidder()).isTrue();
    }

    @Test
    @DisplayName("없는 유저의 입찰 조회 → USER_NOT_FOUND")
    void getActiveBids_userNotFound() {
        given(userRepository.existsById(9L)).willReturn(false);

        assertThatThrownBy(() -> adminUserActivityService.getActiveBids(9L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("알림 발송 → NotificationService 호출 + 감사 로그 기록")
    void sendNotification_success() {
        adminUserActivityService.sendNotification(
                10L, 1L, new AdminSendNotificationRequest("점검 안내입니다."));

        then(notificationService)
                .should()
                .sendNotification(eq(1L), eq(NotificationType.ADMIN_NOTICE), eq("점검 안내입니다."));
        then(adminAuditLogger)
                .should()
                .record(
                        eq(10L),
                        eq("USER_NOTIFICATION_SEND"),
                        eq("USER"),
                        eq(1L),
                        org.mockito.ArgumentMatchers.any());
    }
}
