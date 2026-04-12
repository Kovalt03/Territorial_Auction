package com.territorial.auction.domain.auction.service;

import com.territorial.auction.domain.auction.entity.Auction;
import com.territorial.auction.domain.auction.repository.AuctionRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuctionService {

    private final AuctionRepository auctionRepository;

    public Auction findById(Long auctionId) {
        return auctionRepository.findById(auctionId)
                .orElseThrow(() -> new CustomException(ErrorCode.AUCTION_NOT_FOUND));
    }

    public List<Auction> getOngoingAuctions() {
        return auctionRepository.findByStatus(Auction.AuctionStatus.ONGOING);
    }
}
