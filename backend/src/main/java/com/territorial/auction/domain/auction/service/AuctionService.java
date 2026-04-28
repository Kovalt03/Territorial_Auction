package com.territorial.auction.domain.auction.service;

import com.territorial.auction.domain.auction.dto.AuctionBidHistoryResponse;
import com.territorial.auction.domain.auction.dto.AuctionDetailResponse;
import com.territorial.auction.domain.auction.dto.AuctionListResponse;
import com.territorial.auction.domain.auction.dto.MyBidListResponse;
import com.territorial.auction.domain.auction.dto.PlaceBidRequest;
import com.territorial.auction.domain.auction.dto.PlaceBidResponse;
import com.territorial.auction.domain.auction.dto.TerritoryAuctionHistoryResponse;
import com.territorial.auction.domain.auction.entity.Auction;
import com.territorial.auction.domain.auction.repository.AuctionBidRepository;
import com.territorial.auction.domain.auction.repository.AuctionHistoryRepository;
import com.territorial.auction.domain.auction.repository.AuctionRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.domain.user.repository.UserRepository;
import com.territorial.auction.domain.user.repository.WalletRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
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

    public AuctionListResponse getAuctions(Long continentId, String status, Pageable pageable) {
        throw new UnsupportedOperationException("TODO: implement");
    }

    public AuctionDetailResponse getAuctionDetail(Long auctionId) {
        throw new UnsupportedOperationException("TODO: implement");
    }

    @Transactional
    public PlaceBidResponse placeBid(Long userId, Long auctionId, PlaceBidRequest request) {
        throw new UnsupportedOperationException("TODO: implement");
    }

    public MyBidListResponse getMyBids(Long userId, Pageable pageable) {
        throw new UnsupportedOperationException("TODO: implement");
    }

    public AuctionBidHistoryResponse getAuctionBidHistory(Long auctionId) {
        throw new UnsupportedOperationException("TODO: implement");
    }

    public TerritoryAuctionHistoryResponse getTerritoryAuctionHistory(Long territoryId) {
        throw new UnsupportedOperationException("TODO: implement");
    }
}
