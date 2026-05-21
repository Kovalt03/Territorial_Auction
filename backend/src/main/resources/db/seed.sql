-- ============================================================
-- Territorial Auction — 개발용 시드 데이터
-- 실행 조건: 각 테이블이 비어 있을 때만 삽입 (idempotent)
-- ============================================================

-- 1. 영토 등급
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM territory_grades) = 0 THEN
    INSERT INTO territory_grades (grade, production_multiplier, auction_price_multiplier, pre_built_count, spawn_rate, grid_size)
    VALUES
      ('S', 3.0, 3.0, 3, 0.050, 20),
      ('A', 2.0, 2.0, 2, 0.150, 16),
      ('B', 1.5, 1.5, 1, 0.350, 12),
      ('C', 1.0, 1.0, 0, 0.450, 8);
    RAISE NOTICE 'territory_grades 시드 완료 (4건)';
  ELSE
    RAISE NOTICE 'territory_grades 이미 존재 — 건너뜀';
  END IF;
END $$;

-- 2. 대륙 (8개)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM continents) = 0 THEN
    INSERT INTO continents (name, theme_color)
    VALUES
      ('북부 대륙',      '#00f5ff'),
      ('북서부',         '#44aaff'),
      ('북동부',         '#ff8c00'),
      ('서부 대륙',      '#00ff88'),
      ('중앙 자유 구역', '#8b50ff'),
      ('동부 대륙',      '#ff1493'),
      ('남부 대륙',      '#ffd700'),
      ('남동부',         '#ff6644');
    RAISE NOTICE 'continents 시드 완료 (8건)';
  ELSE
    RAISE NOTICE 'continents 이미 존재 — 건너뜀';
  END IF;
END $$;

-- 3. 영토 (50×50 = 2,500개)
-- 대륙 배치: x=1-12/y=1-25 → 북부, x=13-25/y=1-25 → 북서부, ...
-- 등급 배치: (x*97 + y*43) % 100 < 5→S, <25→A, <65→B, 나머지→C
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM territories) = 0 THEN
    INSERT INTO territories (coord_x, coord_y, continent_id, grade_id, status, base_production_rate)
    SELECT
      x,
      y,
      (SELECT id FROM continents WHERE name =
        CASE
          WHEN x BETWEEN 1  AND 12 AND y BETWEEN 1  AND 25 THEN '북부 대륙'
          WHEN x BETWEEN 13 AND 25 AND y BETWEEN 1  AND 25 THEN '북서부'
          WHEN x BETWEEN 26 AND 37 AND y BETWEEN 1  AND 25 THEN '북동부'
          WHEN x BETWEEN 38 AND 50 AND y BETWEEN 1  AND 25 THEN '서부 대륙'
          WHEN x BETWEEN 1  AND 12 AND y BETWEEN 26 AND 50 THEN '중앙 자유 구역'
          WHEN x BETWEEN 13 AND 25 AND y BETWEEN 26 AND 50 THEN '동부 대륙'
          WHEN x BETWEEN 26 AND 37 AND y BETWEEN 26 AND 50 THEN '남부 대륙'
          ELSE '남동부'
        END
      ),
      (SELECT id FROM territory_grades WHERE grade =
        CASE
          WHEN (x * 97 + y * 43) % 100 < 5  THEN 'S'
          WHEN (x * 97 + y * 43) % 100 < 25 THEN 'A'
          WHEN (x * 97 + y * 43) % 100 < 65 THEN 'B'
          ELSE 'C'
        END
      ),
      'IDLE',
      1
    FROM generate_series(1, 50) AS x
    CROSS JOIN generate_series(1, 50) AS y;
    RAISE NOTICE 'territories 시드 완료 (2500건)';
  ELSE
    RAISE NOTICE 'territories 이미 존재 — 건너뜀';
  END IF;
END $$;

-- 4. 건물 타입
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM building_types) = 0 THEN
    INSERT INTO building_types (name, width, height, max_hp, base_cost_gp, zone_restriction, defense_power, food_production_rate, unit_capacity_per_level, gp_production_rate)
    VALUES
      ('CASTLE',    2, 2, 200,    0,  1, NULL, NULL, NULL, NULL),
      ('STORAGE',   2, 2, 100, 2000,  NULL, NULL, NULL, NULL, NULL),
      ('WORKSHOP',  2, 1,  80, 4000,  NULL, NULL, NULL, NULL,   30),
      ('BARRACKS',  2, 2, 100, 3000,  NULL, NULL, NULL, NULL, NULL),
      ('WALL',      1, 1,  60,  500,  NULL,   20, NULL, NULL, NULL),
      ('TOWER',     1, 1,  80, 1500,  NULL,   50, NULL, NULL, NULL),
      ('FARMLAND',  2, 2,  80, 2000,    -2, NULL,   10, NULL, NULL),
      ('RESIDENCE', 2, 2,  80, 2500,  NULL, NULL, NULL,    5, NULL);
    RAISE NOTICE 'building_types 시드 완료 (8건)';
  ELSE
    RAISE NOTICE 'building_types 이미 존재 — 건너뜀';
  END IF;
END $$;

-- 5. 아이템 상점
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM items) = 0 THEN
    INSERT INTO items (name, item_type, description, cost_ap, cost_gp, daily_limit, gp_reward)
    VALUES
      ('무적 시간 추가권', 'INVINCIBILITY',   '영토 보호 시간 +4시간',       200, NULL, NULL, NULL),
      ('일반 공격권',     'ATTACK_NORMAL',   'Zone 단계별 공격 허용',        100,  500, NULL, NULL),
      ('정밀 공격권',     'ATTACK_PRECISION','목표 건물 직접 지정 공격',     300, NULL, NULL, NULL),
      ('GP 구매권',       'GP_PURCHASE',     'GP 1,000 즉시 획득',           50,  NULL,    5, 1000);
    RAISE NOTICE 'items 시드 완료 (4건)';
  ELSE
    RAISE NOTICE 'items 이미 존재 — 건너뜀';
  END IF;
END $$;
