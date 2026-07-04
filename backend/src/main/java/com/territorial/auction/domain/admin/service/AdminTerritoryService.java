package com.territorial.auction.domain.admin.service;

import com.territorial.auction.domain.admin.dto.AdminBulkForceStartRequest;
import com.territorial.auction.domain.admin.dto.AdminBulkGradeRequest;
import com.territorial.auction.domain.admin.dto.AdminBulkResultResponse;
import com.territorial.auction.domain.admin.dto.AdminBulkTerritoryAuctionRequest;
import com.territorial.auction.domain.admin.dto.AdminChangeGradeRequest;
import com.territorial.auction.domain.admin.dto.AdminTerritoryListResponse;
import com.territorial.auction.domain.admin.dto.AdminTerritoryResponse;
import com.territorial.auction.domain.admin.dto.AdminToggleAuctionRequest;
import com.territorial.auction.domain.auction.AuctionPolicy;
import com.territorial.auction.domain.auction.entity.Auction;
import com.territorial.auction.domain.auction.entity.AuctionBid;
import com.territorial.auction.domain.auction.repository.AuctionBidRepository;
import com.territorial.auction.domain.auction.repository.AuctionRepository;
import com.territorial.auction.domain.map.entity.Territory;
import com.territorial.auction.domain.map.entity.TerritoryGrade;
import com.territorial.auction.domain.map.repository.ContinentRepository;
import com.territorial.auction.domain.map.repository.TerritoryGradeRepository;
import com.territorial.auction.domain.map.repository.TerritoryRepository;
import com.territorial.auction.global.exception.CustomException;
import com.territorial.auction.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminTerritoryService {

    private final TerritoryRepository territoryRepository;
    private final TerritoryGradeRepository territoryGradeRepository;
    private final ContinentRepository continentRepository;
    private final AuctionRepository auctionRepository;
    private final AuctionBidRepository auctionBidRepository;
    private final AdminAuditLogger adminAuditLogger;

    public AdminTerritoryListResponse getTerritories(Long continentId) {
        if (!continentRepository.existsById(continentId)) {
            throw new CustomException(ErrorCode.CONTINENT_NOT_FOUND);
        }
        return new AdminTerritoryListResponse(
                territoryRepository.findAllByContinentIdWithDetails(continentId).stream()
                        .map(AdminTerritoryResponse::from)
                        .toList());
    }

    @Transactional
    public AdminTerritoryResponse changeGrade(
            Long adminUserId, Long territoryId, AdminChangeGradeRequest request) {
        Territory territory =
                territoryRepository
                        .findById(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));
        TerritoryGrade grade =
                territoryGradeRepository
                        .findByGrade(request.grade())
                        .orElseThrow(
                                () -> new CustomException(ErrorCode.TERRITORY_GRADE_NOT_FOUND));

        String before = territory.getGrade().getGrade();
        territory.changeGrade(grade);

        adminAuditLogger.record(
                adminUserId,
                "TERRITORY_GRADE_CHANGE",
                "TERRITORY",
                territoryId,
                Map.of(
                        "before",
                        before,
                        "after",
                        request.grade(),
                        "reason",
                        nullSafe(request.reason())));
        return AdminTerritoryResponse.from(territory);
    }

    @Transactional
    public AdminTerritoryResponse changeAuctionEnabled(
            Long adminUserId, Long territoryId, AdminToggleAuctionRequest request) {
        Territory territory =
                territoryRepository
                        .findById(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));

        boolean before = territory.getAuctionEnabled();
        territory.changeAuctionEnabled(request.enabled());

        adminAuditLogger.record(
                adminUserId,
                "TERRITORY_AUCTION_TOGGLE",
                "TERRITORY",
                territoryId,
                Map.of(
                        "before", before,
                        "after", request.enabled(),
                        "reason", nullSafe(request.reason())));
        return AdminTerritoryResponse.from(territory);
    }

    // IDLE 영토의 재경매 대기(nextAuctionAt)를 건너뛰고 즉시 경매를 시작한다.
    @Transactional
    public AdminTerritoryResponse forceStartAuction(Long adminUserId, Long territoryId) {
        Territory territory =
                territoryRepository
                        .findById(territoryId)
                        .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));
        validateIdle(territory);

        Auction auction = createAuction(territory, LocalDateTime.now());
        territory.startBidding();

        adminAuditLogger.record(
                adminUserId,
                "TERRITORY_AUCTION_FORCE_START",
                "TERRITORY",
                territoryId,
                Map.of(
                        "auctionId", auction.getId(),
                        "startingPrice", auction.getCurrentPrice()));
        return AdminTerritoryResponse.from(territory);
    }

    // 선택된 여러 영토의 등급을 일괄 변경 (all-or-nothing).
    @Transactional
    public AdminBulkResultResponse bulkChangeGrade(
            Long adminUserId, AdminBulkGradeRequest request) {
        TerritoryGrade grade =
                territoryGradeRepository
                        .findByGrade(request.grade())
                        .orElseThrow(
                                () -> new CustomException(ErrorCode.TERRITORY_GRADE_NOT_FOUND));
        List<Long> territoryIds = request.territoryIds().stream().distinct().toList();
        for (Long territoryId : territoryIds) {
            Territory territory = findTerritoryOrThrow(territoryId);
            String before = territory.getGrade().getGrade();
            territory.changeGrade(grade);
            adminAuditLogger.record(
                    adminUserId,
                    "TERRITORY_GRADE_CHANGE_BULK",
                    "TERRITORY",
                    territoryId,
                    Map.of(
                            "before", before,
                            "after", request.grade(),
                            "reason", nullSafe(request.reason())));
        }
        return new AdminBulkResultResponse(territoryIds.size());
    }

    // 선택된 여러 영토의 경매 활성/비활성을 일괄 변경 (all-or-nothing).
    @Transactional
    public AdminBulkResultResponse bulkChangeAuction(
            Long adminUserId, AdminBulkTerritoryAuctionRequest request) {
        List<Long> territoryIds = request.territoryIds().stream().distinct().toList();
        for (Long territoryId : territoryIds) {
            Territory territory = findTerritoryOrThrow(territoryId);
            boolean before = territory.getAuctionEnabled();
            territory.changeAuctionEnabled(request.enabled());
            adminAuditLogger.record(
                    adminUserId,
                    "TERRITORY_AUCTION_TOGGLE_BULK",
                    "TERRITORY",
                    territoryId,
                    Map.of(
                            "before", before,
                            "after", request.enabled(),
                            "reason", nullSafe(request.reason())));
        }
        return new AdminBulkResultResponse(territoryIds.size());
    }

    // 선택된 여러 영토 중 IDLE인 것만 즉시 경매 시작 (best-effort, 시작 개수 반환).
    @Transactional
    public AdminBulkResultResponse bulkForceStart(
            Long adminUserId, AdminBulkForceStartRequest request) {
        LocalDateTime now = LocalDateTime.now();
        List<Long> territoryIds = request.territoryIds().stream().distinct().toList();
        int started = 0;
        for (Long territoryId : territoryIds) {
            Territory territory = findTerritoryOrThrow(territoryId);
            if (territory.getStatus() != Territory.TerritoryStatus.IDLE) {
                continue;
            }
            Auction auction = createAuction(territory, now);
            territory.startBidding();
            adminAuditLogger.record(
                    adminUserId,
                    "TERRITORY_AUCTION_FORCE_START_BULK",
                    "TERRITORY",
                    territoryId,
                    Map.of(
                            "auctionId",
                            auction.getId(),
                            "startingPrice",
                            auction.getCurrentPrice()));
            started++;
        }
        return new AdminBulkResultResponse(started);
    }

    private Territory findTerritoryOrThrow(Long territoryId) {
        return territoryRepository
                .findById(territoryId)
                .orElseThrow(() -> new CustomException(ErrorCode.TERRITORY_NOT_FOUND));
    }

    private void validateIdle(Territory territory) {
        if (territory.getStatus() != Territory.TerritoryStatus.IDLE) {
            throw new CustomException(ErrorCode.TERRITORY_NOT_IDLE);
        }
    }

    private Auction createAuction(Territory territory, LocalDateTime now) {
        int startingPrice =
                AuctionPolicy.GRADE_START_PRICES.getOrDefault(
                        territory.getGrade().getGrade(), AuctionPolicy.DEFAULT_START_PRICE);
        LocalDateTime endAt = now.plusHours(AuctionPolicy.AUCTION_DURATION_HOURS);
        LocalDateTime maxExtendUntil = endAt.plusMinutes(AuctionPolicy.MAX_EXTEND_UNTIL_MINUTES);

        Auction auction =
                auctionRepository.save(
                        Auction.builder()
                                .territory(territory)
                                .currentPrice(startingPrice)
                                .startAt(now)
                                .endAt(endAt)
                                .maxExtendUntil(maxExtendUntil)
                                .build());
        auctionBidRepository.save(
                AuctionBid.builder().auction(auction).bidder(null).price(startingPrice).build());
        return auction;
    }

    private String nullSafe(String value) {
        return value != null ? value : "";
    }
}
