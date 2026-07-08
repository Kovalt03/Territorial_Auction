package com.territorial.auction.domain.building;

import com.territorial.auction.domain.building.entity.BuildingInstance;
import com.territorial.auction.domain.building.entity.BuildingLevelSpec;
import com.territorial.auction.domain.building.repository.BuildingLevelSpecRepository;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

// 건물 인스턴스의 레벨별 지정값(있으면)을 적용해 유효 스탯을 계산한다. 지정값이 없으면 기본 공식으로 폴백.
public final class BuildingLevelSpecResolver {

    private final Map<String, BuildingLevelSpec> specByKey;

    private BuildingLevelSpecResolver(Map<String, BuildingLevelSpec> specByKey) {
        this.specByKey = specByKey;
    }

    public static BuildingLevelSpecResolver of(
            List<BuildingInstance> buildings, BuildingLevelSpecRepository repository) {
        Set<Long> typeIds =
                buildings.stream()
                        .map(b -> b.getBuildingType().getId())
                        .collect(Collectors.toSet());
        Map<String, BuildingLevelSpec> map =
                typeIds.isEmpty()
                        ? Map.of()
                        : repository.findAllByBuildingType_IdIn(typeIds).stream()
                                .collect(
                                        Collectors.toMap(
                                                s -> key(s.getBuildingType().getId(), s.getLevel()),
                                                Function.identity()));
        return new BuildingLevelSpecResolver(map);
    }

    private static String key(Long typeId, int level) {
        return typeId + "#" + level;
    }

    private BuildingLevelSpec specFor(BuildingInstance b) {
        return specByKey.get(key(b.getBuildingType().getId(), b.getLevel()));
    }

    /** GP 생산량/시간 — 지정값 우선, 없으면 level × 기본. GP 건물이 아니면 0. */
    public int gpPerHour(BuildingInstance b) {
        Integer base = b.getBuildingType().getGpProductionRate();
        if (base == null) return 0;
        BuildingLevelSpec s = specFor(b);
        return (s != null && s.getGpProductionRate() != null)
                ? s.getGpProductionRate()
                : b.getLevel() * base;
    }

    /** 방어력 — 지정값 우선, 없으면 기본(레벨 무관). 방어 건물이 아니면 0. */
    public int defense(BuildingInstance b) {
        Integer base = b.getBuildingType().getDefensePower();
        if (base == null) return 0;
        BuildingLevelSpec s = specFor(b);
        return (s != null && s.getDefensePower() != null) ? s.getDefensePower() : base;
    }
}
