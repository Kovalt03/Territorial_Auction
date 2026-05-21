-- =============================================
-- Territorial Auction - Dev Seed Data
-- =============================================

-- 시즌 (현재 진행 중)
INSERT INTO seasons (season_number, started_at, ended_at)
VALUES (1, '2026-01-01 00:00:00+00', '2026-12-31 23:59:59+00')
ON CONFLICT (season_number) DO NOTHING;

-- 시즌 패스 상품
INSERT INTO season_passes (name, cost_ap, duration_days, island_bonus_pct, extra_builders, tax_exempt_bonus)
VALUES ('시즌 패스 Vol.1', 1000, 30, 50, 1, 2);

-- 시즌 패스 레벨별 보상 (season_id=1)
INSERT INTO season_pass_level_rewards (season_id, level, reward_name) VALUES
(1,  5, 'GP 500'),
(1, 10, '병력 증강제 x1'),
(1, 15, '병력 증강제 x3'),
(1, 20, '전설 영토 스킨'),
(1, 25, 'GP 1000'),
(1, 30, '무적권 x2');

-- 건물 타입 (8종)
INSERT INTO building_types (name, width, height, max_hp, base_cost_gp, zone_restriction, defense_power, food_production_rate, unit_capacity_per_level, gp_production_rate)
VALUES
  ('CASTLE',    2, 2, 200,    0,  1, NULL, NULL, NULL, NULL),
  ('STORAGE',   2, 2, 100, 2000,  NULL, NULL, NULL, NULL, NULL),
  ('WORKSHOP',  2, 1,  80, 4000,  NULL, NULL, NULL, NULL,   30),
  ('BARRACKS',  2, 2, 100, 3000,  NULL, NULL, NULL, NULL, NULL),
  ('WALL',      1, 1,  60,  500,  NULL,   20, NULL, NULL, NULL),
  ('TOWER',     1, 1,  80, 1500,  NULL,   50, NULL, NULL, NULL),
  ('FARMLAND',  2, 2,  80, 2000,    -2, NULL,   10, NULL, NULL),
  ('RESIDENCE', 2, 2,  80, 2500,  NULL, NULL, NULL,    5, NULL)
ON CONFLICT DO NOTHING;

-- 테스트 유저 (password: password1!)
INSERT INTO users (username, email, password_hash, nickname)
VALUES (
    'testuser',
    'test@example.com',
    '$2a$10$HHyA9yO4qN0DhT4unVqwOOBUiQDZ6i/OhobZ0g0xFn3rB2IjaqK06',
    '테스트유저'
) ON CONFLICT DO NOTHING;

-- 테스트 유저 지갑 (AP 5000, GP 1000)
INSERT INTO wallets (user_id, available_ap, locked_ap, available_gp)
SELECT id, 5000, 0, 1000 FROM users WHERE username = 'testuser'
ON CONFLICT (user_id) DO UPDATE
    SET available_ap = 5000,
        available_gp = 1000;

-- 테스트 유저 알림 설정
INSERT INTO notification_settings (user_id)
SELECT id FROM users WHERE username = 'testuser'
ON CONFLICT (user_id) DO NOTHING;

-- 아이템 (3종)
INSERT INTO items (name, item_type, description, cost_ap, daily_limit, gp_reward) VALUES
('무적권',     'INVINCIBILITY', '영토에 1시간 동안 무적 상태를 부여합니다.',    50,  3,    NULL),
('일반 공격권', 'ATTACK_NORMAL', '대상 영토에 공성전을 선언합니다. 랜덤 건물에 피해.',  100, 5,    NULL),
('GP 구매권',  'GP_PURCHASE',   'AP 200으로 GP 1,000을 즉시 구매합니다.',        200, NULL, 1000)
ON CONFLICT DO NOTHING;
