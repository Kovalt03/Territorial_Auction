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

    /** WORKSHOP 파괴 후 생산 중단 시간 (시간 단위) */
    public static final int WORKSHOP_DEBUFF_HOURS = 12;

    /** CASTLE이 없을 때 기본 유닛 슬롯 */
    public static final int DEFAULT_UNIT_SLOTS = 5;

    /** CASTLE 레벨별 유닛 슬롯 수 (index = level) */
    private static final int[] CASTLE_UNIT_SLOTS = {0, 5, 10, 15};

    public static int castleUnitSlots(int level) {
        if (level < 1 || level >= CASTLE_UNIT_SLOTS.length) {
            return DEFAULT_UNIT_SLOTS;
        }
        return CASTLE_UNIT_SLOTS[level];
    }
}
