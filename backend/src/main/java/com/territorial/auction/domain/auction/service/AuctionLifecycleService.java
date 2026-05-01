package com.territorial.auction.domain.auction.service;

import com.territorial.auction.domain.auction.AuctionPolicy;
import com.territorial.auction.domain.auction.entity.Auction;
import com.territorial.auction.domain.auction.entity.AuctionBid;
import com.territorial.auction.domain.auction.entity.AuctionHistory;
import com.territorial.auction.domain.auction.repository.AuctionBidRepository;
import com.territorial.auction.domain.auction.repository.AuctionHistoryRepository;
import com.territorial.auction.domain.auction.repository.AuctionRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.repository.WalletRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AuctionLifecycleService {

    private final AuctionRepository auctionRepository;
    private final AuctionBidRepository auctionBidRepository;
    private final AuctionHistoryRepository auctionHistoryRepository;
    private final TerritoryRepository territoryRepository;
    private final WalletRepository walletRepository;

    /** 종료된 미정산 경매를 일괄 정산 */
    public void settlePendingAuctions() {
        LocalDateTime now = LocalDateTime.now();
        List<Auction> expired = auctionRepository.findAllExpiredUnsettled(now);
        for (Auction auction : expired) {
            try {
                settleAuction(auction, now);
            } catch (Exception e) {
                log.error("[AuctionLifecycle] 경매 정산 실패 auctionId={}", auction.getId(), e);
            }
        }
    }

    /** 점유 기간이 만료된 영토를 IDLE로 전환 */
    public void releaseExpiredTerritories() {
        LocalDateTime now = LocalDateTime.now();
        List<Territory> expired =
                territoryRepository.findAllExpiredOccupied(Territory.TerritoryStatus.OCCUPIED, now);
        for (Territory territory : expired) {
            // 점유 만료 즉시 재경매 예약
            territory.release(now);
            log.info("[AuctionLifecycle] 영토 점유 만료 territoryId={}", territory.getId());
        }
    }

    /** nextAuctionAt이 도달한 IDLE 영토에 신규 경매 생성 */
    public void createPendingAuctions() {
        LocalDateTime now = LocalDateTime.now();
        List<Territory> ready =
                territoryRepository.findAllReadyForAuction(Territory.TerritoryStatus.IDLE, now);
        for (Territory territory : ready) {
            try {
                createAuction(territory, now);
            } catch (Exception e) {
                log.error("[AuctionLifecycle] 경매 생성 실패 territoryId={}", territory.getId(), e);
            }
        }
    }

    // ── private ───────────────────────────────────────────────────────────────

    private void settleAuction(Auction auction, LocalDateTime now) {
        Territory territory = auction.getTerritory();
        User winner = auction.getCurrentBidder();

        if (winner != null) {
            LocalDateTime occupiedUntil = now.plusDays(AuctionPolicy.OCCUPATION_DURATION_DAYS);
            territory.occupy(winner, occupiedUntil);

            // 낙찰자 lockedAp 소비
            walletRepository
                    .findById(winner.getId())
                    .ifPresent(wallet -> wallet.consumeLockedAp(auction.getCurrentPrice()));

            auctionHistoryRepository.save(
                    AuctionHistory.builder()
                            .auction(auction)
                            .territory(territory)
                            .winner(winner)
                            .finalPrice(auction.getCurrentPrice())
                            .wonAt(now)
                            .build());

            log.info(
                    "[AuctionLifecycle] 낙찰 정산 auctionId={} winner={} price={}",
                    auction.getId(),
                    winner.getNickname(),
                    auction.getCurrentPrice());
        } else {
            // 무낙찰: 일정 시간 후 재경매
            LocalDateTime nextAuctionAt = now.plusHours(AuctionPolicy.IDLE_REAUCTION_DELAY_HOURS);
            territory.release(nextAuctionAt);

            log.info(
                    "[AuctionLifecycle] 무낙찰 정산 auctionId={} nextAuctionAt={}",
                    auction.getId(),
                    nextAuctionAt);
        }

        auction.settle();
    }

    private void createAuction(Territory territory, LocalDateTime now) {
        int startingPrice =
                AuctionPolicy.GRADE_START_PRICES.getOrDefault(
                        territory.getGrade().getGrade(), AuctionPolicy.DEFAULT_START_PRICE);

        LocalDateTime endAt = now.plusHours(AuctionPolicy.AUCTION_DURATION_HOURS);
        LocalDateTime maxExtendUntil = endAt.plusMinutes(AuctionPolicy.MAX_EXTEND_UNTIL_MINUTES);

        Auction auction =
                Auction.builder()
                        .territory(territory)
                        .currentPrice(startingPrice)
                        .startAt(now)
                        .endAt(endAt)
                        .maxExtendUntil(maxExtendUntil)
                        .build();
        auctionRepository.save(auction);

        // 시작가 레코드 (bidder = null → 그래프 상 시작점)
        auctionBidRepository.save(
                AuctionBid.builder().auction(auction).bidder(null).price(startingPrice).build());

        territory.startBidding();

        log.info(
                "[AuctionLifecycle] 경매 생성 auctionId={} territoryId={} startingPrice={}",
                auction.getId(),
                territory.getId(),
                startingPrice);
    }
}
