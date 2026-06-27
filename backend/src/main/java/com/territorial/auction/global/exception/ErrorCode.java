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

    // Auth
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "비밀번호가 올바르지 않습니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다."),
    WITHDRAWN_USER(HttpStatus.FORBIDDEN, "탈퇴한 사용자입니다."),
    SUSPENDED_USER(HttpStatus.FORBIDDEN, "정지된 사용자입니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    DUPLICATE_USERNAME(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다."),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),

    // Wishlist
    WISHLIST_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 위시리스트에 추가된 영토입니다."),
    WISHLIST_NOT_FOUND(HttpStatus.NOT_FOUND, "위시리스트에 등록되지 않은 영토입니다."),

    // Map
    TILE_NOT_FOUND(HttpStatus.NOT_FOUND, "타일을 찾을 수 없습니다."),
    TERRITORY_NOT_FOUND(HttpStatus.NOT_FOUND, "영토를 찾을 수 없습니다."),
    NOT_TERRITORY_OWNER(HttpStatus.FORBIDDEN, "해당 영토의 점유자가 아닙니다."),
    TERRITORY_NOT_OCCUPIED(HttpStatus.BAD_REQUEST, "점유 중인 영토가 아닙니다."),
    COLOR_CHANGE_LIMIT_EXCEEDED(HttpStatus.BAD_REQUEST, "색상 변경 횟수를 초과했습니다."),

    // Auction
    AUCTION_NOT_FOUND(HttpStatus.NOT_FOUND, "경매를 찾을 수 없습니다."),
    AUCTION_ALREADY_ENDED(HttpStatus.BAD_REQUEST, "이미 종료된 경매입니다."),
    BID_AMOUNT_TOO_LOW(HttpStatus.BAD_REQUEST, "입찰 금액이 현재 최고가보다 낮습니다."),
    ALREADY_HIGHEST_BIDDER(HttpStatus.BAD_REQUEST, "이미 최고 입찰자입니다."),
    INSUFFICIENT_AP(HttpStatus.BAD_REQUEST, "AP 잔액이 부족합니다."),
    LOCK_ACQUISITION_FAILED(HttpStatus.CONFLICT, "현재 요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요."),

    // Social
    FRIEND_NOT_FOUND(HttpStatus.NOT_FOUND, "친구 관계를 찾을 수 없습니다."),
    ALREADY_FRIENDS(HttpStatus.CONFLICT, "이미 친구 관계입니다."),
    CHAT_ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "채팅방을 찾을 수 없습니다."),
    CHAT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "해당 채팅방에 접근 권한이 없습니다."),

    // Notification
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),
    NOTIFICATION_FORBIDDEN(HttpStatus.FORBIDDEN, "본인의 알림이 아닙니다."),

    // Building
    BUILDING_NOT_FOUND(HttpStatus.NOT_FOUND, "건물을 찾을 수 없습니다."),
    BUILDING_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND, "건물 타입을 찾을 수 없습니다."),
    BUILDING_MAX_LEVEL(HttpStatus.BAD_REQUEST, "이미 최대 레벨에 도달한 건물입니다."),
    INVALID_POSITION(HttpStatus.BAD_REQUEST, "배치 불가능한 위치입니다."),
    ZONE_RESTRICTION_VIOLATED(HttpStatus.BAD_REQUEST, "Zone 제약 위반입니다."),
    INSUFFICIENT_GP(HttpStatus.BAD_REQUEST, "GP 잔액이 부족합니다."),
    CASTLE_CANNOT_BE_STORED(HttpStatus.BAD_REQUEST, "Castle은 보관할 수 없습니다."),
    CASTLE_CANNOT_BE_MOVED(HttpStatus.BAD_REQUEST, "Castle은 이동할 수 없습니다."),

    // Payment
    INVALID_PAYMENT(HttpStatus.BAD_REQUEST, "결제 검증에 실패했습니다."),
    DUPLICATE_ORDER(HttpStatus.CONFLICT, "중복된 주문 ID입니다."),
    PAYMENT_AMOUNT_MISMATCH(HttpStatus.UNPROCESSABLE_ENTITY, "결제 금액이 일치하지 않습니다."),

    // Global Vault
    VAULT_CAPACITY_EXCEEDED(HttpStatus.CONFLICT, "금고 용량을 초과합니다."),
    TRANSFER_COOLDOWN_ACTIVE(HttpStatus.TOO_MANY_REQUESTS, "이전 쿨다운 중입니다. 잠시 후 다시 시도하세요."),

    // Guild
    GUILD_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 길드입니다."),
    GUILD_NAME_DUPLICATED(HttpStatus.CONFLICT, "이미 존재하는 길드명입니다."),
    ALREADY_IN_GUILD(HttpStatus.CONFLICT, "이미 길드에 소속되어 있습니다."),
    NOT_IN_GUILD(HttpStatus.NOT_FOUND, "소속된 길드가 없습니다."),
    ALREADY_APPLIED(HttpStatus.CONFLICT, "이미 가입 신청한 길드입니다."),
    NOT_GUILD_MASTER(HttpStatus.FORBIDDEN, "길드장 권한이 없습니다."),
    GUILD_FULL(HttpStatus.BAD_REQUEST, "길드 정원이 초과되었습니다."),
    APPLICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "가입 신청을 찾을 수 없습니다."),
    GUILD_MASTER_CANNOT_LEAVE(HttpStatus.FORBIDDEN, "길드장은 탈퇴할 수 없습니다. 길드장을 먼저 이전하세요."),
    CANNOT_TRANSFER_TO_SELF(HttpStatus.BAD_REQUEST, "자기 자신에게 길드장을 이전할 수 없습니다."),
    CANNOT_KICK_MASTER(HttpStatus.FORBIDDEN, "길드장은 강제 추방할 수 없습니다."),

    // Military
    INSUFFICIENT_TROOPS(HttpStatus.BAD_REQUEST, "병력이 부족합니다."),
    NO_BARRACKS(HttpStatus.BAD_REQUEST, "병영이 없습니다."),
    BARRACKS_LEVEL_INSUFFICIENT(HttpStatus.BAD_REQUEST, "병영 레벨이 부족합니다."),
    INSUFFICIENT_UNITS(HttpStatus.BAD_REQUEST, "보유 유닛이 부족합니다."),
    UNIT_CAPACITY_EXCEEDED(HttpStatus.BAD_REQUEST, "유닛 수용 한도를 초과했습니다."),
    FOOD_INSUFFICIENT(HttpStatus.BAD_REQUEST, "식량이 부족합니다."),
    NO_ATTACK_TOKEN(HttpStatus.BAD_REQUEST, "공격권이 없습니다."),
    ZONE_NOT_CLEARED(HttpStatus.BAD_REQUEST, "이전 Zone을 클리어해야 합니다."),
    TERRITORY_PROTECTED(HttpStatus.BAD_REQUEST, "보호 기간 중인 영토입니다."),
    ATTACK_COOLDOWN(HttpStatus.BAD_REQUEST, "공격 쿨다운 중입니다."),
    SIEGE_NOT_FOUND(HttpStatus.NOT_FOUND, "공성전을 찾을 수 없습니다."),
    SIEGE_FORBIDDEN(HttpStatus.FORBIDDEN, "해당 공성전의 관계자가 아닙니다."),
    UNIT_TYPE_NOT_FOUND(HttpStatus.NOT_FOUND, "유닛 타입을 찾을 수 없습니다."),
    SIEGE_RESULT_NOT_FOUND(HttpStatus.NOT_FOUND, "공성전 결과가 아직 처리되지 않았습니다."),
    CANNOT_ATTACK_OWN_TERRITORY(HttpStatus.FORBIDDEN, "자신의 영토는 공격할 수 없습니다."),

    // Island
    ISLAND_NOT_FOUND(HttpStatus.NOT_FOUND, "섬을 찾을 수 없습니다."),
    BUILDER_SLOT_FULL(HttpStatus.CONFLICT, "건설 슬롯이 가득 찼습니다. 시즌 패스로 슬롯을 추가할 수 있습니다."),

    // Season
    SEASON_NOT_FOUND(HttpStatus.NOT_FOUND, "진행 중인 시즌이 없습니다."),
    SEASON_PASS_NOT_FOUND(HttpStatus.NOT_FOUND, "시즌 패스 정보를 찾을 수 없습니다."),
    SEASON_PASS_ALREADY_OWNED(HttpStatus.CONFLICT, "이미 이번 시즌 패스를 보유하고 있습니다."),
    SEASON_MISSION_NOT_FOUND(HttpStatus.NOT_FOUND, "미션을 찾을 수 없습니다."),
    MISSION_NOT_COMPLETED(HttpStatus.BAD_REQUEST, "아직 완료하지 않은 미션입니다."),
    MISSION_ALREADY_CLAIMED(HttpStatus.CONFLICT, "이미 보상을 수령한 미션입니다."),
    SEASON_REWARD_NOT_FOUND(HttpStatus.NOT_FOUND, "보상을 찾을 수 없습니다."),
    REWARD_LEVEL_NOT_REACHED(HttpStatus.BAD_REQUEST, "아직 해당 레벨에 도달하지 않았습니다."),
    REWARD_ALREADY_CLAIMED(HttpStatus.CONFLICT, "이미 수령한 보상입니다."),
    REWARD_PREMIUM_REQUIRED(HttpStatus.FORBIDDEN, "프리미엄 패스가 필요한 보상입니다."),
    SEASON_LEVEL_MAX_REACHED(HttpStatus.CONFLICT, "이미 최고 레벨에 도달했습니다."),

    // Item
    ITEM_NOT_FOUND(HttpStatus.NOT_FOUND, "아이템을 찾을 수 없습니다."),
    ITEM_OUT_OF_STOCK(HttpStatus.CONFLICT, "보유 수량이 없습니다."),
    DAILY_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "일일 구매 한도를 초과했습니다."),
    TARGET_TERRITORY_REQUIRED(HttpStatus.BAD_REQUEST, "대상 영토를 입력해주세요."),
    ALREADY_INVINCIBLE(HttpStatus.CONFLICT, "이미 무적 상태인 영토입니다."),
    ITEM_NOT_USABLE(HttpStatus.BAD_REQUEST, "해당 아이템은 구매 시 자동으로 적용됩니다.");

    private final HttpStatus httpStatus;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }
}
