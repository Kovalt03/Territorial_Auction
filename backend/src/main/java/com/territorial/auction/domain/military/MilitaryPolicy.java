package com.territorial.auction.domain.military;

public final class MilitaryPolicy {

    private MilitaryPolicy() {}

    public static final int SIEGE_COUNTDOWN_MINUTES = 30;
    public static final int ATTACK_COOLDOWN_HOURS = 2;
    public static final double ATTACKER_LOSS_RATE = 0.3;
    public static final double ATTACKER_FAIL_LOSS_RATE = 0.5;
    public static final double DEFENDER_LOSS_RATE = 0.3;

    /** Zone 3 약탈률 (STORAGE storedGp의 50%) */
    public static final double LOOT_RATE = 0.5;

    /** 건물 HP가 이 비율 이하일 때 Zone 클리어 판정 */
    public static final double ZONE_CLEAR_THRESHOLD = 0.5;
}
