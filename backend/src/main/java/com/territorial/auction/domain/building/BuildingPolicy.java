package com.territorial.auction.domain.building;

public final class BuildingPolicy {

    private BuildingPolicy() {}

    public static final int MAX_LEVEL = 3;

    /** 섬 GP 수확 최대 누적 시간 (분 단위) — 24시간 초과분은 소멸 */
    public static final long MAX_HARVEST_ACCUMULATION_MINUTES = 24 * 60L;

    /** 레벨별 최대 HP = baseMaxHp × level */
    public static int scaledMaxHp(int baseMaxHp, int level) {
        return baseMaxHp * level;
    }

    /** 레벨업 비용 = baseCostGp × 현재 레벨 */
    public static int upgradeCost(int baseCostGp, int currentLevel) {
        return baseCostGp * currentLevel;
    }

    /** 성 레벨에 따른 섬 그리드 크기: Lv1→10, Lv2→15, Lv3→20 */
    public static int islandGridSizeForCastleLevel(int castleLevel) {
        return switch (castleLevel) {
            case 1 -> 10;
            case 2 -> 15;
            case 3 -> 20;
            default -> 20;
        };
    }

    /** 성 레벨에 따른 섬 등급: Lv1→D, Lv2→B, Lv3→S */
    public static String islandGradeForCastleLevel(int castleLevel) {
        return switch (castleLevel) {
            case 1 -> "D";
            case 2 -> "B";
            case 3 -> "S";
            default -> "S";
        };
    }
}
