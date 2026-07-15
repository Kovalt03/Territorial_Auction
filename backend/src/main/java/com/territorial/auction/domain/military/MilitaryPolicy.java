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

    /** 최외곽 Zone 번호. 공략은 이 Zone부터 중심(1)으로 진행한다. */
    public static final int OUTERMOST_ZONE = 3;

    /** WORKSHOP 파괴 후 생산 중단 시간 (시간 단위) */
    public static final int WORKSHOP_DEBUFF_HOURS = 12;

    // ── 건물별 주둔 수용량(레벨당) — 위치 총 슬롯 = 방어 가능 건물들의 이 값 합 ──────────────
    public static final int GARRISON_CAP_CASTLE = 5;
    public static final int GARRISON_CAP_RESIDENCE = 5;
    public static final int GARRISON_CAP_TOWER = 3;
    public static final int GARRISON_CAP_WALL = 2;

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

    /** 유닛 1기당 위치 간 이동 비용(GP) — 출발지 저장소에서 차감 */
    public static final int UNIT_MOVE_COST_GP = 10;

    /** 유닛 위치 간 이동 소요 시간(분) — 도착 전까지 방어·배치·재이동 불가 */
    public static final int UNIT_MOVE_MINUTES = 10;
}
