package com.territorial.auction.domain.auction.service;

import com.territorial.auction.domain.auction.AuctionPolicy;
import com.territorial.auction.domain.auction.dto.AuctionBidHistoryResponse;
import com.territorial.auction.domain.auction.dto.AuctionDetailResponse;
import com.territorial.auction.domain.auction.dto.AuctionListResponse;
import com.territorial.auction.domain.auction.dto.MyBidListResponse;
import com.territorial.auction.domain.auction.dto.PlaceBidRequest;
import com.territorial.auction.domain.auction.dto.PlaceBidResponse;
import com.territorial.auction.domain.auction.dto.TerritoryAuctionHistoryResponse;
import com.territorial.auction.domain.auction.entity.Auction;
import com.territorial.auction.domain.auction.entity.AuctionBid;
import com.territorial.auction.domain.auction.entity.AuctionHistory;
import com.territorial.auction.domain.auction.entity.AuctionStatus;
import com.territorial.auction.domain.auction.repository.AuctionBidRepository;
import com.territorial.auction.domain.auction.repository.AuctionHistoryRepository;
import com.territorial.auction.domain.auction.repository.AuctionRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.user.entity.User;
import com.territorial.auction.domain.user.entity.Wallet;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import com.territorial.auction.global.lock.DistributedLock;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuctionService {

    private final AuctionRepository auctionRepository;
    private final AuctionBidRepository auctionBidRepository;
    private final AuctionHistoryRepository auctionHistoryRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TerritoryRepository territoryRepository;

    public Auction findById(Long auctionId) {
        return auctionRepository
                .findById(auctionId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUCTION_NOT_FOUND));
    }

    public AuctionListResponse getAuctions(
            Long continentId, AuctionStatus status, Pageable pageable) {
        LocalDateTime now = LocalDateTime.now();
        String statusName = status != null ? status.name() : null;
        Page<Auction> page =
                auctionRepository.findAllWithFilter(continentId, statusName, now, pageable);
        List<AuctionListResponse.AuctionItemDto> items =
                page.getContent().stream()
                        .map(
                                a ->
                                        new AuctionListResponse.AuctionItemDto(
                                                a.getId(),
                                                a.getTerritory().getId(),
                                                a.getTerritory().getCoordX(),
                                                a.getTerritory().getCoordY(),
                                                a.getTerritory().getContinent().getName(),
                                                a.getTerritory().getGrade().getGrade(),
                                                a.getCurrentPrice(),
                                                a.getCurrentBidder() != null
                                                        ? a.getCurrentBidder().getNickname()
                                                        : null,
                                                a.getEndAt(),
                                                AuctionStatus.from(a.getEndAt(), now)))
                        .toList();

        return new AuctionListResponse(
                page.getTotalElements(), page.getNumber(), page.getSize(), items);
    }

    public AuctionDetailResponse getAuctionDetail(Long auctionId) {
        Auction auction =
                auctionRepository
                        .findById(auctionId)
                        .orElseThrow(() -> new CustomException(ErrorCode.AUCTION_NOT_FOUND));
        List<AuctionBid> recentBids =
                auctionBidRepository.findTop5ByAuctionIdOrderByBidAtDesc(auctionId);
        List<AuctionDetailResponse.RecentBidDto> recentBidDtos =
                recentBids.stream()
                        .map(
                                b ->
                                        new AuctionDetailResponse.RecentBidDto(
                                                b.getBidder() != null
                                                        ? b.getBidder().getNickname()
                                                        : null,
                                                b.getPrice(),
                                                b.getBidAt()))
                        .toList();
        return new AuctionDetailResponse(
                auction.getId(),
                auction.getTerritory().getId(),
                auction.getTerritory().getCoordX(),
                auction.getTerritory().getCoordY(),
                auction.getTerritory().getGrade().getGrade(),
                auction.getCurrentPrice(),
                auction.getCurrentBidder() != null
                        ? auction.getCurrentBidder().getNickname()
                        : null,
                auction.getStartAt(),
                auction.getEndAt(),
                recentBidDtos);
    }

    @Transactional
    @DistributedLock(key = "'lock:auction:' + #auctionId")
    public PlaceBidResponse placeBid(Long userId, Long auctionId, PlaceBidRequest request) {
        LocalDateTime now = LocalDateTime.now();
        Auction auction =
                auctionRepository
                        .findById(auctionId)
                        .orElseThrow(() -> new CustomException(ErrorCode.AUCTION_NOT_FOUND));

        if (now.isAfter(auction.getEndAt())) {
            throw new CustomException(ErrorCode.AUCTION_ALREADY_ENDED);
        }
        if (auction.getCurrentBidder() != null
                && auction.getCurrentBidder().getId().equals(userId)) {
            throw new CustomException(ErrorCode.ALREADY_HIGHEST_BIDDER);
        }
        validateBidAmount(auction.getCurrentPrice(), request.bidAmount());

        User bidder =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        Wallet bidderWallet =
                walletRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (bidderWallet.getAvailableAp() < request.bidAmount()) {
            throw new CustomException(ErrorCode.INSUFFICIENT_AP);
        }

        refundPreviousBidder(auction, auctionId);
        bidderWallet.lockAp(request.bidAmount());
        auction.updateBid(bidder, request.bidAmount());

        auctionBidRepository.save(
                AuctionBid.builder()
                        .auction(auction)
                        .bidder(bidder)
                        .price(request.bidAmount())
                        .build());

        applyAntiSniping(auction, now);

        return new PlaceBidResponse(auction.getId(), request.bidAmount(), auction.getEndAt());
    }

    public MyBidListResponse getMyBids(Long userId, Pageable pageable) {
        LocalDateTime now = LocalDateTime.now();
        Page<AuctionBid> page = auctionBidRepository.findAllByBidderIdWithAuction(userId, pageable);
        List<MyBidListResponse.MyBidItemDto> bids =
                page.getContent().stream()
                        .map(
                                b -> {
                                    Auction a = b.getAuction();
                                    boolean isHighest =
                                            a.getCurrentBidder() != null
                                                    && a.getCurrentBidder()
                                                            .getId()
                                                            .equals(b.getBidder().getId());
                                    return new MyBidListResponse.MyBidItemDto(
                                            a.getId(),
                                            a.getTerritory().getId(),
                                            a.getTerritory().getCoordX(),
                                            a.getTerritory().getCoordY(),
                                            b.getPrice(),
                                            a.getCurrentPrice(),
                                            isHighest,
                                            a.getEndAt(),
                                            AuctionStatus.from(a.getEndAt(), now));
                                })
                        .toList();
        return new MyBidListResponse(
                page.getTotalElements(), page.getNumber(), page.getSize(), bids);
    }

    public AuctionBidHistoryResponse getAuctionBidHistory(Long auctionId) {
        Auction auction =
                auctionRepository
                        .findById(auctionId)
                        .orElseThrow(() -> new CustomException(ErrorCode.AUCTION_NOT_FOUND));
        List<AuctionBid> bids = auctionBidRepository.findAllByAuctionIdOrderByBidAtAsc(auctionId);
        List<AuctionBidHistoryResponse.BidDto> bidDtos =
                bids.stream()
                        .map(
                                b ->
                                        new AuctionBidHistoryResponse.BidDto(
                                                b.getPrice(),
                                                b.getBidAt(),
                                                b.getBidder() != null
                                                        ? b.getBidder().getNickname()
                                                        : null))
                        .toList();
        return new AuctionBidHistoryResponse(auction.getId(), bidDtos);
    }

    public TerritoryAuctionHistoryResponse getTerritoryAuctionHistory(Long territoryId) {
        Territory territory =
                territoryRepository
                        .findById(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));
        List<AuctionHistory> histories =
                auctionHistoryRepository.findAllByTerritoryIdOrderByWonAtDesc(territoryId);
        List<TerritoryAuctionHistoryResponse.HistoryDto> historyDtos =
                histories.stream()
                        .map(
                                h ->
                                        new TerritoryAuctionHistoryResponse.HistoryDto(
                                                h.getAuction().getId(),
                                                h.getWinner().getNickname(),
                                                h.getFinalPrice(),
                                                h.getWonAt()))
                        .toList();
        return new TerritoryAuctionHistoryResponse(territory.getId(), historyDtos);
    }

    private void validateBidAmount(int currentPrice, int bidAmount) {
        int minByPercent = (int) Math.ceil(currentPrice * AuctionPolicy.BID_MIN_PERCENT_RATE);
        int minByFlat = currentPrice + AuctionPolicy.BID_MIN_FLAT_INCREMENT;
        if (bidAmount < Math.max(minByPercent, minByFlat)) {
            throw new CustomException(ErrorCode.BID_AMOUNT_TOO_LOW);
        }
    }

    private void refundPreviousBidder(Auction auction, Long auctionId) {
        User prevBidder = auction.getCurrentBidder();
        if (prevBidder == null) return;
        auctionBidRepository
                .findTopByAuctionIdAndBidderIdOrderByPriceDesc(auctionId, prevBidder.getId())
                .ifPresent(
                        prevBid -> {
                            Wallet prevWallet =
                                    walletRepository
                                            .findById(prevBidder.getId())
                                            .orElseThrow(
                                                    () ->
                                                            new CustomException(
                                                                    ErrorCode.USER_NOT_FOUND));
                            prevWallet.refundLockedAp(prevBid.getPrice());
                        });
    }

    private void applyAntiSniping(Auction auction, LocalDateTime now) {
        LocalDateTime endAt = auction.getEndAt();
        // 종료 AuctionPolicy.ANTI_SNIPE_WINDOW_SECONDS 이내 입찰 시 연장
        // (엔티티 내에서 maxExtendUntil 상한 처리)
        if (!endAt.isAfter(now.plusSeconds(AuctionPolicy.ANTI_SNIPE_WINDOW_SECONDS))) {
            auction.extendEndAt(endAt.plusSeconds(AuctionPolicy.ANTI_SNIPE_EXTEND_SECONDS));
        }
    }
}
