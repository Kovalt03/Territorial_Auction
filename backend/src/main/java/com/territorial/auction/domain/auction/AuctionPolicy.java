package com.territorial.auction.domain.auction;

public final class AuctionPolicy {

    /** 입찰 최소 인상률 (현재가 × 이 값 이상) */
    public static final double BID_MIN_PERCENT_RATE = 1.05;

    /** 입찰 최소 고정 인상액 (현재가 + 이 값 이상) */
    public static final int BID_MIN_FLAT_INCREMENT = 10;

    /** Anti-sniping 감지 구간 (종료까지 이 시간 이내면 연장 트리거) */
    public static final int ANTI_SNIPE_WINDOW_SECONDS = 60;

    /** Anti-sniping 연장 시간 (엔티티에서 maxExtendUntil 상한으로 cap) */
    public static final int ANTI_SNIPE_EXTEND_SECONDS = 30;

    private AuctionPolicy() {}
}
