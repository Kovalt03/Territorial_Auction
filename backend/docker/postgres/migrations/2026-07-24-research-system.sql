-- 연구 시스템 1차: 계정 단위 유닛 연구 상태 + 연구소(RESEARCH_LAB) 건물.
-- 연구소 레벨이 연구 가능 상한(목표 레벨 = 연구소 레벨 + 1)을 결정. 연구는 금고 GP + 시간 소요.

CREATE TABLE IF NOT EXISTS unit_research (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT  NOT NULL REFERENCES users(id),
    unit_type_id          BIGINT  NOT NULL REFERENCES unit_types(id),
    researched_level      INTEGER NOT NULL DEFAULT 1,
    pending_level         INTEGER,
    research_complete_at  TIMESTAMP,
    UNIQUE (user_id, unit_type_id)
);

-- RESEARCH_LAB 건물 타입(시드). building-types.yml 시더가 신규 DB엔 자동 삽입하지만, 기존 DB용 폴백.
INSERT INTO building_types
    (name, width, height, max_hp, base_cost_gp, zone_restriction, defense_power,
     food_production_rate, unit_capacity_per_level, gp_production_rate, build_time_seconds)
SELECT 'RESEARCH_LAB', 2, 2, 120, 3500, NULL, NULL, NULL, NULL, NULL, 240
WHERE NOT EXISTS (SELECT 1 FROM building_types WHERE name = 'RESEARCH_LAB');
