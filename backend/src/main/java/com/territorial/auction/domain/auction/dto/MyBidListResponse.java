package com.territorial.auction.domain.auction.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MyBidListResponse(long totalCount, int page, int size, List<MyBidItemDto> bids) {

    public record MyBidItemDto(
            Long auctionId,
            Long territoryId,
            Integer coordX,
            Integer coordY,
            Integer myBidAmount,
            Integer currentPrice,
            Boolean isHighestBidder,
            LocalDateTime endAt,
            String status) {}
}
