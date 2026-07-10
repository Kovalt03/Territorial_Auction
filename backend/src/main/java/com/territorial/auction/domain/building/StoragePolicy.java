package com.territorial.auction.domain.building;

import com.territorial.auction.domain.building.entity.BuildingInstance;

/**
 * 한 위치(영토/섬)의 GP·식량 저장 공간을 다룬다.
 *
 * <p>저장 공간은 성(소량·안전)과 저장소(대량·약탈)에 걸쳐 있다. 적립은 저장소부터 채우고 넘치면 성으로, 소진은 반대로 성부터 빼서 저장소에 위험을 몰아준다.
 */
public final class StoragePolicy {

    private StoragePolicy() {}

    /** 성 레벨당 저장 용량 (GP·식량 각각). 성은 약탈되지 않는다. */
    public static final int CASTLE_CAPACITY_PER_LEVEL = 5_000;

    /** 저장소 레벨당 저장 용량 (GP·식량 각각). 저장소는 약탈 대상이다. */
    public static final int STORAGE_CAPACITY_PER_LEVEL = 5_000;

    public static int capacity(BuildingInstance building) {
        int perLevel =
                building.getBuildingType().isCastle()
                        ? CASTLE_CAPACITY_PER_LEVEL
                        : STORAGE_CAPACITY_PER_LEVEL;
        return building.getLevel() * perLevel;
    }
}
