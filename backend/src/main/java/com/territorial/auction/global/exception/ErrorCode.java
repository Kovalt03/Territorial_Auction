package com.territorial.auction.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Common
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "잘못된 입력입니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "리소스를 찾을 수 없습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류입니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),

    // Map
    TILE_NOT_FOUND(HttpStatus.NOT_FOUND, "타일을 찾을 수 없습니다."),

    // Auction
    AUCTION_NOT_FOUND(HttpStatus.NOT_FOUND, "경매를 찾을 수 없습니다."),
    AUCTION_ALREADY_ENDED(HttpStatus.BAD_REQUEST, "이미 종료된 경매입니다."),
    BID_AMOUNT_TOO_LOW(HttpStatus.BAD_REQUEST, "입찰 금액이 현재 최고가보다 낮습니다."),

    // Social
    FRIEND_NOT_FOUND(HttpStatus.NOT_FOUND, "친구 관계를 찾을 수 없습니다."),
    ALREADY_FRIENDS(HttpStatus.CONFLICT, "이미 친구 관계입니다."),

    // Notification
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),

    // Building
    BUILDING_NOT_FOUND(HttpStatus.NOT_FOUND, "건물을 찾을 수 없습니다."),

    // Military
    INSUFFICIENT_TROOPS(HttpStatus.BAD_REQUEST, "병력이 부족합니다."),

    // Island
    ISLAND_NOT_FOUND(HttpStatus.NOT_FOUND, "섬을 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }
}
