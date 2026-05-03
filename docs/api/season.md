# Season Pass API

> Notion 상세 기능 명세: [F-16 시즌 패스](https://www.notion.so/Functional-Specification-Access-Control-Matrix-3332efa4278d804e8ccfdb31151e9943)  
> 구현 상태: 🔲 미구현

## 목차

| Method | Endpoint | 기능 |
|---|---|---|
| GET | `/api/v1/season-pass/me` | [시즌 패스 상태 조회](#시즌-패스-상태-조회) |
| GET | `/api/v1/season-pass` | [시즌 패스 현황 조회](#시즌-패스-현황-조회) |
| POST | `/api/v1/season-pass/purchase` | [시즌 패스 구매](#시즌-패스-구매) |

---

## 시즌 패스 상태 조회

**GET** `/api/v1/season-pass/me`

**Authorization**: Bearer `{{accessToken}}` (필수)

현재 시즌 패스 보유 여부, 만료일, 적용 중인 혜택을 반환합니다. (Notion F-16.2, F-16.3)

### Response (200 OK)

```json
{
  "hasSeasonPass": true,
  "seasonPass": {
    "passId": 1,
    "name": "시즌 패스 Vol.1",
    "startedAt": "2026-04-08T12:00:00Z",
    "expiresAt": "2026-05-08T12:00:00Z",
    "daysRemaining": 29,
    "benefits": {
      "islandBonusPct": 50,
      "extraBuilders": 1,
      "taxExemptBonus": 2
    }
  }
}
```

> 미보유 시: `{ "hasSeasonPass": false, "seasonPass": null }`

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `hasSeasonPass` | Boolean | 시즌 패스 보유 여부 | `user_season_passes.is_active` AND `expires_at > now()` |
| `seasonPass.passId` | Long (nullable) | 패스 ID | `user_season_passes.season_pass_id` |
| `seasonPass.name` | String (nullable) | 패스 이름 | `season_passes.name` |
| `seasonPass.startedAt` | DateTime (nullable) | 패스 시작 시각 | `user_season_passes.started_at` |
| `seasonPass.expiresAt` | DateTime (nullable) | 패스 만료 시각 | `user_season_passes.expires_at` |
| `seasonPass.daysRemaining` | Integer (nullable) | 남은 일수 | `expires_at - now()` 계산값 |
| `seasonPass.benefits.islandBonusPct` | Integer (nullable) | 섬 GP 생산 보너스 (%) | `season_passes.island_bonus_pct` |
| `seasonPass.benefits.extraBuilders` | Integer (nullable) | 추가 건설 슬롯 수 | `season_passes.extra_builders` |
| `seasonPass.benefits.taxExemptBonus` | Integer (nullable) | 세금 면제 보너스 영토 수 | `season_passes.tax_exempt_bonus` |

### 비즈니스 규칙

- `is_active = true` AND `expires_at > now()` 조건으로 유효 패스 조회
- Redis `season_pass:{userId}` 캐시 우선 조회 → 미존재 시 DB 조회 후 캐싱
- **만료 알림 (F-16.4)**: `expires_at` 3일 전 및 당일 08:00에 알림 발송 (스케줄러 처리)
- **패스 만료 후 (F-16.5)**: 다음 토지세 징수 시점부터 `LAND_TAX_EXEMPT_COUNT` 기본값으로 복구

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 인증 실패 |

### 남은 작업
- ⬜ `SeasonPassService.getMyPass()` 구현
- ⬜ Redis `season_pass:{userId}` 캐시 (TTL 30분)

---

## 시즌 패스 현황 조회

**GET** `/api/v1/season-pass`

**Authorization**: Bearer `{{accessToken}}` (필수)

현재 시즌의 패스 등급과 보상 수령 여부를 조회합니다.

### Response (200 OK)

```json
{
  "seasonId": 3,
  "seasonName": "Season 3 - Iron Age",
  "passType": "PREMIUM",
  "currentLevel": 18,
  "currentXp": 4200,
  "nextLevelXp": 5000,
  "rewards": [
    {
      "level": 15,
      "rewardName": "병력 증강제 x3",
      "claimed": true
    },
    {
      "level": 20,
      "rewardName": "전설 영토 스킨",
      "claimed": false
    }
  ],
  "seasonEndsAt": "2026-05-31T23:59:59Z"
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `seasonId` | Long | 시즌 ID | `seasons.id` |
| `seasonName` | String | 시즌 이름 | `seasons.name` |
| `passType` | String | `FREE` / `PREMIUM` | `user_season_passes.is_active` 기반 |
| `currentLevel` | Integer | 현재 시즌패스 레벨 | `season_pass_progress.level` |
| `currentXp` | Integer | 현재 경험치 | `season_pass_progress.xp` |
| `nextLevelXp` | Integer | 다음 레벨까지 필요 경험치 | 시즌 정책 기준 |
| `rewards[].level` | Integer | 보상 해금 레벨 | `season_rewards.level` |
| `rewards[].rewardName` | String | 보상 이름 | `season_rewards` |
| `rewards[].claimed` | Boolean | 보상 수령 여부 | `season_pass_progress` |
| `seasonEndsAt` | DateTime | 시즌 종료 시각 | `seasons.ended_at` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 인증 실패 |

### 남은 작업
- ⬜ `SeasonPassService.getProgress()` 구현
- ⬜ Redis `season_pass:{userId}` 캐시 연동

---

## 시즌 패스 구매

**POST** `/api/v1/season-pass/purchase`

**Authorization**: Bearer `{{accessToken}}` (필수)

`SEASON_PASS_AP_COST`(config, 기본 1,000) AP를 소모하여 `SEASON_PASS_DURATION_DAYS`(config, 기본 30)일간 시즌 패스를 활성화합니다. (Notion F-16.1)

### Request Body

없음

### 비즈니스 규칙

- `wallets.available_ap` `SEASON_PASS_AP_COST` 차감 후 `user_season_passes` INSERT
- **중복 구매 시 기간 누적**: 기존 패스 보유 중 재구매 가능. 기존 `expires_at`에서 `SEASON_PASS_DURATION_DAYS`만큼 추가 연장
- 구매 즉시 혜택 적용 (섬 GP 보너스 `+SEASON_PASS_ISLAND_BONUS_PCT`%, 일꾼 `+SEASON_PASS_EXTRA_BUILDERS`, 세금 면제 `+SEASON_PASS_TAX_EXEMPT_BONUS`개)
- 구매 후 Redis `season_pass:{userId}` 캐시 갱신

### 혜택 상세

| benefit | 설명 |
|---|---|
| `islandBonusPct` | Home Island GP 생산량 `+SEASON_PASS_ISLAND_BONUS_PCT`% (기본 +50%) |
| `extraBuilders` | 건설 일꾼 `+SEASON_PASS_EXTRA_BUILDERS`명 (기본 +1, 동시 건설 2개) |
| `taxExemptBonus` | 토지세 면제 구간 `+SEASON_PASS_TAX_EXEMPT_BONUS`개 (기본 +2, 3개 → 5개) |

### Response (201 Created)

```json
{
  "passId": 1,
  "name": "시즌 패스 Vol.1",
  "startedAt": "2026-04-08T12:00:00Z",
  "expiresAt": "2026-05-08T12:00:00Z",
  "costAP": 1000,
  "remainingAP": 500,
  "benefits": {
    "islandBonusPct": 50,
    "extraBuilders": 1,
    "taxExemptBonus": 2
  }
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `passId` | Long | 구매한 시즌 패스 ID | `season_passes.id` |
| `name` | String | 시즌 패스 이름 | `season_passes.name` |
| `startedAt` | DateTime | 패스 시작 시각 | `user_season_passes.started_at` |
| `expiresAt` | DateTime | 패스 만료 시각 | `user_season_passes.expires_at` |
| `costAP` | Integer | 차감된 AP | `season_passes.cost_ap` |
| `remainingAP` | Integer | 구매 후 잔여 AP | `wallets.available_ap` |
| `benefits.islandBonusPct` | Integer | 섬 GP 생산 보너스 (%) | `season_passes.island_bonus_pct` |
| `benefits.extraBuilders` | Integer | 추가 건설 슬롯 수 | `season_passes.extra_builders` |
| `benefits.taxExemptBonus` | Integer | 세금 면제 보너스 영토 수 | `season_passes.tax_exempt_bonus` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 402 | `INSUFFICIENT_AP` | AP 잔액 부족 |

### 남은 작업
- ⬜ `SeasonPassService.purchase()` 구현
- ⬜ Redis `season_pass:{userId}` 캐시 생성/갱신 (TTL 30분)
