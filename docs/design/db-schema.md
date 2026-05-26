# DB 설계

> Notion 원본: https://www.notion.so/DB-3332efa4278d81c7b707e4456b25774e

---

## PostgreSQL 테이블 목록

### 👤 User Domain

#### users

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `username` | `VARCHAR(50)` | NOT NULL, UNIQUE | |
| `email` | `VARCHAR(100)` | NOT NULL, UNIQUE | |
| `password_hash` | `TEXT` | NOT NULL | |
| `nickname` | `VARCHAR(30)` | NOT NULL, UNIQUE | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | |
| `status` | `VARCHAR(10)` | NOT NULL, DEFAULT 'ACTIVE' | ACTIVE / WITHDRAWN / SUSPENDED |

#### wallets

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `user_id` | `BIGINT` | PK, FK → users.id | |
| `available_ap` | `INTEGER` | NOT NULL, DEFAULT 0 | 사용 가능 Auction Point |
| `locked_ap` | `INTEGER` | NOT NULL, DEFAULT 0 | 입찰 중 잠금 AP |
| `available_gp` | `INTEGER` | NOT NULL, DEFAULT 0 | 사용 가능 Grid Point |
| `available_food` | `INTEGER` | NOT NULL, DEFAULT 100 | 유닛 유지 식량 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | |

#### notification_settings

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `user_id` | `BIGINT` | PK, FK → users.id | |
| `is_outbid_enabled` | `BOOLEAN` | DEFAULT true | 상회 입찰 알림 |
| `is_auction_start_enabled` | `BOOLEAN` | DEFAULT true | 관심 지역 경매 시작 알림 |
| `is_marketing_enabled` | `BOOLEAN` | DEFAULT false | 마케팅 알림 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | |

#### user_profiles

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `user_id` | `BIGINT` | PK, FK → users.id | |
| `profile_image_url` | `VARCHAR(255)` | NULL 허용 | S3 오브젝트 URL |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | |

---

### 📦 Item Domain

#### items

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `name` | `VARCHAR(50)` | NOT NULL | |
| `item_type` | `VARCHAR(20)` | NOT NULL | INVINCIBILITY / ATTACK_NORMAL / ATTACK_PRECISION / GP_PURCHASE |
| `cost_ap` | `INTEGER` | NULL | NULL이면 AP로 구매 불가 |
| `cost_gp` | `INTEGER` | NULL | NULL이면 GP로 구매 불가 |
| `daily_limit` | `INTEGER` | NULL | NULL이면 무제한 |

#### item_purchases

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `user_id` | `BIGINT` | FK | |
| `item_id` | `BIGINT` | FK → items.id | |
| `quantity` | `INTEGER` | NOT NULL, DEFAULT 1 | |
| `target_territory_id` | `BIGINT` | FK, NULL | 무적권 사용 시 대상 영토 |
| `purchased_at` | `TIMESTAMPTZ` | NOT NULL | |

---

### 🏆 Season Domain

#### seasons

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `season_number` | `INTEGER` | NOT NULL, UNIQUE | |
| `started_at` | `TIMESTAMPTZ` | NOT NULL | |
| `ended_at` | `TIMESTAMPTZ` | NULL | NULL이면 진행 중 |
| `processed_at` | `TIMESTAMPTZ` | NULL | 시즌 종료 배치 완료 시각. NULL이면 미처리 |

#### season_passes

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `name` | `VARCHAR(50)` | NOT NULL | |
| `cost_ap` | `INTEGER` | NOT NULL | |
| `duration_days` | `INTEGER` | NOT NULL, DEFAULT 30 | |
| `island_bonus_pct` | `INTEGER` | NOT NULL | 섬 생산량 보너스 % |
| `extra_builders` | `INTEGER` | NOT NULL, DEFAULT 1 | 추가 건설 일꾼 |
| `tax_exempt_bonus` | `INTEGER` | NOT NULL, DEFAULT 2 | 토지세 면제 추가 구간 |

#### user_season_passes

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `user_id` | `BIGINT` | FK | |
| `season_pass_id` | `BIGINT` | FK | |
| `started_at` | `TIMESTAMPTZ` | NOT NULL | |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | 만료 시각 |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT true | |

#### user_trophies

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `user_id` | `BIGINT` | PK, FK | |
| `score` | `INTEGER` | NOT NULL, DEFAULT 0 | 현재 트로피 |
| `league` | `VARCHAR(10)` | NOT NULL, DEFAULT 'BRONZE' | BRONZE / SILVER / GOLD / DIAMOND / CHAMPION |
| `season_id` | `BIGINT` | FK | 현재 시즌 |
| `last_reset_season_id` | `BIGINT` | FK, NULL | 마지막 리셋이 적용된 시즌 ID (멱등성 체크용) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | |

#### trophy_logs

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `user_id` | `BIGINT` | FK | |
| `season_id` | `BIGINT` | FK | |
| `siege_id` | `BIGINT` | FK, NULL | 연관 전투 |
| `delta` | `INTEGER` | NOT NULL | 변동량 (+/-) |
| `reason` | `VARCHAR(30)` | NOT NULL | ATK_WIN_CASTLE / ATK_FAIL / DEF_WIN 등 |
| `score_after` | `INTEGER` | NOT NULL | 변동 후 트로피 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

#### season_rewards

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `user_id` | `BIGINT` | FK | |
| `season_id` | `BIGINT` | FK | |
| `league` | `VARCHAR(10)` | NOT NULL | |
| `gp_reward` | `INTEGER` | NOT NULL | |
| `attack_token_normal` | `INTEGER` | DEFAULT 0 | |
| `attack_token_precision` | `INTEGER` | DEFAULT 0 | |
| `title_reward` | `VARCHAR(30)` | NULL | Champion 전용 칭호 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

#### season_territory_holds (시즌 영토 등급 보유 집계)

영토 낙찰 / 점유 종료 이벤트마다 누적. 주기적 배치로 랭킹 점수를 계산한다.

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `season_id` | `BIGINT` | FK → seasons.id | |
| `user_id` | `BIGINT` | FK → users.id | |
| `territory_id` | `BIGINT` | FK → territories.id | |
| `grade` | `VARCHAR(1)` | NOT NULL | S / A / B / C / D |
| `held_from` | `TIMESTAMPTZ` | NOT NULL | 점유 시작 (낙찰 시각) |
| `held_until` | `TIMESTAMPTZ` | NULL 허용 | 점유 종료. NULL이면 현재 보유 중 |

INDEX: `(season_id, user_id)` — 랭킹 집계 최적화

---

### 🗺️ Map Domain

#### continents

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `name` | `VARCHAR(50)` | NOT NULL | |
| `theme_color` | `VARCHAR(7)` | NOT NULL | HEX 색상 코드 |

#### territory_grades

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `grade` | `VARCHAR(1)` | NOT NULL, UNIQUE | S / A / B / C / D |
| `production_multiplier` | `NUMERIC(3,1)` | NOT NULL | 생산량 배율 (0.5~2.0) |
| `auction_price_multiplier` | `NUMERIC(3,1)` | NOT NULL | 시작 경매가 배율 |
| `pre_built_count` | `INTEGER` | NOT NULL, DEFAULT 0 | 사전 배치 건물 수 |
| `spawn_rate` | `NUMERIC(4,3)` | NOT NULL | 등장 확률 |
| `grid_size` | `INTEGER` | NOT NULL | S:12 / A:10 / B:8 / C:6 |

#### territories

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `coord_x` | `INTEGER` | NOT NULL | 10×10 그리드 좌표 |
| `coord_y` | `INTEGER` | NOT NULL | |
| `continent_id` | `BIGINT` | FK → continents.id | |
| `owner_id` | `BIGINT` | FK → users.id, NULL 허용 | 현재 점유자 |
| `current_color` | `VARCHAR(7)` | NULL 허용 | HEX 색상 |
| `occupied_until` | `TIMESTAMPTZ` | NULL 허용 | 점유 만료 일시 |
| `status` | `VARCHAR(10)` | NOT NULL | BIDDING / OCCUPIED / IDLE |
| `base_production_rate` | `INTEGER` | NOT NULL, DEFAULT 1 | 분당 기본 생산량(P) |
| `last_produced_at` | `TIMESTAMPTZ` | NULL 허용 | 마지막 생산 시각 |
| `grade_id` | `BIGINT` | FK → territory_grades.id | |

#### bonus_tiles

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `territory_id` | `BIGINT` | FK, UNIQUE | |
| `multiplier` | `NUMERIC(4,2)` | NOT NULL | 생산 배율 (예: 1.5, 2.0) |
| `description` | `VARCHAR(100)` | | UI 표시용 설명 |

#### land_tax_logs

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `user_id` | `BIGINT` | FK | |
| `territory_count` | `INTEGER` | NOT NULL | 부과 시점 보유 수 |
| `gp_charged` | `INTEGER` | NOT NULL | |
| `status` | `VARCHAR(10)` | NOT NULL | PAID / FAILED / EXEMPT |
| `charged_at` | `TIMESTAMPTZ` | NOT NULL | |

#### territory_production_logs

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `territory_id` | `BIGINT` | FK | |
| `owner_id` | `BIGINT` | FK | |
| `amount` | `INTEGER` | NOT NULL | |
| `reason` | `VARCHAR(30)` | NOT NULL | BASE / ADJACENT_BONUS / BONUS_TILE |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

#### color_histories

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `territory_id` | `BIGINT` | FK | |
| `user_id` | `BIGINT` | FK | |
| `color_code` | `VARCHAR(7)` | NOT NULL | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

---

### 🔨 Auction Domain

#### auctions

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `territory_id` | `BIGINT` | FK → territories.id | |
| `current_bidder_id` | `BIGINT` | FK → users.id, NULL 허용 | |
| `current_price` | `INTEGER` | NOT NULL | |
| `start_at` | `TIMESTAMPTZ` | NOT NULL | |
| `end_at` | `TIMESTAMPTZ` | NOT NULL | |
| `max_extend_until` | `TIMESTAMPTZ` | NOT NULL | 최대 연장 한도 (Anti-Sniping) |

#### auction_bids (입찰 이력 — 가격 변동 그래프용)

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `auction_id` | `BIGINT` | FK → auctions.id | |
| `bidder_id` | `BIGINT` | FK → users.id, NULL | NULL = 시스템(시작가) |
| `price` | `INTEGER` | NOT NULL | |
| `bid_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | |

INDEX: `(auction_id, bid_at ASC)` — 그래프 조회 최적화

#### auction_histories

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `auction_id` | `BIGINT` | FK | |
| `territory_id` | `BIGINT` | FK | |
| `winner_id` | `BIGINT` | FK → users.id | |
| `final_price` | `INTEGER` | NOT NULL | |
| `won_at` | `TIMESTAMPTZ` | NOT NULL | |
| `season_id` | `BIGINT` | FK → seasons.id, NULL 허용 | 시즌 중 낙찰 시 연결 (경매 AP 소비 랭킹 집계용) |

---

### 💬 Social Domain

#### guilds

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `name` | `VARCHAR(30)` | NOT NULL, UNIQUE | |
| `description` | `VARCHAR(200)` | NULL 허용 | |
| `master_id` | `BIGINT` | FK → users.id | |
| `max_members` | `INTEGER` | NOT NULL, DEFAULT 30 | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | |

#### guild_members

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `guild_id` | `BIGINT` | PK, FK → guilds.id | |
| `user_id` | `BIGINT` | PK, FK → users.id | |
| `role` | `VARCHAR(10)` | NOT NULL | MASTER / MEMBER |
| `joined_at` | `TIMESTAMPTZ` | NOT NULL | |

#### guild_applications

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `guild_id` | `BIGINT` | FK → guilds.id | |
| `applicant_id` | `BIGINT` | FK → users.id | |
| `status` | `VARCHAR(10)` | NOT NULL, DEFAULT 'PENDING' | PENDING / APPROVED / REJECTED |
| `applied_at` | `TIMESTAMPTZ` | NOT NULL | |

#### chat_rooms

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `type` | `VARCHAR(10)` | NOT NULL | WORLD / CONTINENT / GUILD |
| `target_id` | `BIGINT` | NULL 허용 | 대륙 ID (CONTINENT 타입) 또는 길드 ID (GUILD 타입) |

#### chat_messages

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `room_id` | `BIGINT` | FK | |
| `sender_id` | `BIGINT` | FK → users.id | |
| `content` | `TEXT` | NOT NULL | |
| `sent_at` | `TIMESTAMPTZ` | NOT NULL | |

#### interest_groups

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `user_id` | `BIGINT` | FK | |
| `continent_id` | `BIGINT` | FK | 관심 대륙 |

---

### 🔔 Notification Domain

#### notification_logs

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `user_id` | `BIGINT` | FK | |
| `type` | `VARCHAR(20)` | NOT NULL | OUTBID / AUCTION_START / RESULT / INCOME |
| `message` | `TEXT` | NOT NULL | |
| `is_read` | `BOOLEAN` | DEFAULT false | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |

---

### 🏗️ Building Domain

#### building_types

| column | 자료형 | 설명 |
|---|---|---|
| `id` | `BIGSERIAL` PK | |
| `name` | `VARCHAR(30)` | CASTLE / STORAGE / WORKSHOP / BARRACKS / WALL / TOWER / FARMLAND / RESIDENCE |
| `width` | `INTEGER` | config 대응 |
| `height` | `INTEGER` | config 대응 |
| `max_hp` | `INTEGER` | |
| `base_cost_gp` | `INTEGER` | |
| `zone_restriction` | `INTEGER` NULL | 양수: 해당 Zone 전용 (1 = Zone1 전용 — CASTLE). 음수: \|값\| 이상 Zone만 허용 (-2 = Zone2/3 전용 — FARMLAND) |
| `defense_power` | `INTEGER` NULL | NULL 허용. 방어 건물(WALL, TOWER)만 값 보유. 전투 계산 시 DEF에 합산 |
| `food_production_rate` | `INTEGER` NULL | NULL 허용. FARMLAND만 값 보유. 시간당 식량 생산량 (level 배율 곱함) |
| `unit_capacity_per_level` | `INTEGER` NULL | NULL 허용. RESIDENCE만 값 보유. 레벨당 유닛 슬롯 추가 수 |
| `gp_production_rate` | `INTEGER` NULL | NULL 허용. WORKSHOP만 값 보유. 시간당 GP 생산량 (level 배율 곱함) |

#### building_instances

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `territory_id` | `BIGINT` | FK, NULL 허용 | NULL이면 섬 건물 |
| `island_id` | `BIGINT` | FK, NULL 허용 | NULL이면 영토 건물 |
| `building_type_id` | `BIGINT` | FK | |
| `pos_x` | `INTEGER` | NOT NULL | |
| `pos_y` | `INTEGER` | NOT NULL | |
| `hp` | `INTEGER` | NOT NULL | |
| `level` | `INTEGER` | NOT NULL, DEFAULT 1 | |
| `zone` | `INTEGER` | NOT NULL | 1/2/3 |
| `is_destroyed` | `BOOLEAN` | DEFAULT false | |
| `stored_gp` | `INTEGER` | NOT NULL, DEFAULT 0 | STORAGE 건물만 사용. 영토 내 적립 GP (약탈 대상) |

#### global_vaults

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `user_id` | `BIGINT` | PK, FK | |
| `stored_gp` | `INTEGER` | NOT NULL, DEFAULT 0 | |
| `capacity` | `INTEGER` | NOT NULL, DEFAULT 500 | |
| `last_transfer_at` | `TIMESTAMPTZ` | NULL | 쿨다운 계산용 |

---

### 🏝️ Island Domain

#### island_grades

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `name` | `VARCHAR(5)` | NOT NULL, UNIQUE | D / B / S |
| `grid_size` | `INTEGER` | NOT NULL | 10 / 15 / 20 |
| `zone1_radius` | `INTEGER` | NOT NULL | Zone1 Chebyshev 반경 |
| `zone2_radius` | `INTEGER` | NOT NULL | Zone2 Chebyshev 반경 |
| `castle_level_required` | `INTEGER` | NOT NULL | 해당 등급 도달에 필요한 성 레벨 (1/2/3) |

#### home_islands

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `user_id` | `BIGINT` | FK, UNIQUE | 1유저 1섬 |
| `level` | `INTEGER` | NOT NULL, DEFAULT 1 | |
| `island_grade_id` | `BIGINT` | FK → island_grades.id | |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | |
| `last_harvest_at` | `TIMESTAMPTZ` | NULL 허용 | 마지막 GP 수확 시각 |

---

### ⚔️ Military Domain

#### unit_types

| column | 자료형 | 설명 |
|---|---|---|
| `id` | `BIGSERIAL` PK | |
| `name` | `VARCHAR(30)` | INFANTRY / ARCHER / KNIGHT |
| `attack_power` | `INTEGER` | |
| `defense_power` | `INTEGER` | |
| `cost_gp` | `INTEGER` | |
| `food_cost_per_hour` | `INTEGER` | |

#### unit_instances

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `user_id` | `BIGINT` | FK | |
| `unit_type_id` | `BIGINT` | FK | |
| `quantity` | `INTEGER` | NOT NULL | |
| `deployed_territory_id` | `BIGINT` | FK, NULL | NULL이면 대기 중 |

#### attack_tokens

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `user_id` | `BIGINT` | PK FK | |
| `normal_count` | `INTEGER` | NOT NULL, DEFAULT 0 | 일반 공격권 |
| `precision_count` | `INTEGER` | NOT NULL, DEFAULT 0 | 정밀 공격권 |

#### siege_events

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `attacker_id` | `BIGINT` | FK | |
| `defender_id` | `BIGINT` | FK | |
| `target_territory_id` | `BIGINT` | FK | |
| `target_building_id` | `BIGINT` | FK | |
| `attack_zone` | `INTEGER` | NOT NULL | 1/2/3 |
| `status` | `VARCHAR(10)` | NOT NULL | PENDING / RESOLVED |
| `siege_start_at` | `TIMESTAMPTZ` | NOT NULL | |
| `resolve_at` | `TIMESTAMPTZ` | NOT NULL | |

#### siege_results

| column | 자료형 | 조건 | 설명 |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | |
| `siege_id` | `BIGINT` | FK, UNIQUE | |
| `is_attacker_win` | `BOOLEAN` | NOT NULL | |
| `attacker_units_lost` | `INTEGER` | | |
| `defender_units_lost` | `INTEGER` | | |
| `looted_gp` | `INTEGER` | DEFAULT 0 | 약탈량 |
| `result_type` | `VARCHAR(15)` | | LOOT / DEBUFF / AUCTION |

---

## Redis 구조

| Key | 타입 | TTL | 역할 |
|---|---|---|---|
| `session:jwt_refresh:{user_id}` | String | 14일 | JWT Refresh Token |
| `adjacent_bonus:{territory_id}:{user_id}` | Integer | 60초 | 인접 영토 점유 수 캐시 |
| `ranking:season:{seasonId}:territory_hold` | Sorted Set | 시즌 종료까지 | 시즌 영토 등급 보유 랭킹 (score = 가중 보유 시간) |
| `ranking:season:{seasonId}:auction_spend` | Sorted Set | 시즌 종료까지 | 시즌 경매 AP 소비 랭킹 (score = 누적 AP) |
| `auction:bid:{auctionId}` | Hash | 경매 end_at까지 | 입찰 실시간 캐시 |
| `auction:lock:{auctionId}` | String | 500ms | 동시 입찰 분산 락 |
| `invincible:{territoryId}` | String | 무적권 지속 시간 | 공격 선언 전 무적 상태 확인 |
| `global_vault:total` | String (Integer) | 영구 | INCR 원자적 GP 누적 |
| `user:item:{userId}` | Hash | 10분 | 아이템 보유 현황 캐시 |
| `season_pass:{userId}` | Hash | 30분 | 시즌 패스 상태 캐시 |
| `notification:unread:{userId}` | String (Integer) | 영구 | 미읽음 알림 카운터 |
| `siege:active:{siegeId}` | Hash | resolveAt까지 | 공성전 진행 상태 |
| `land_tax:expected:{userId}` | Hash | 자정까지 | 토지세 예상액 캐시 |
| `color:change:{territoryId}:{userId}` | Integer | occupiedUntil까지 | 색상 변경 횟수 카운터 |
