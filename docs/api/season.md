# Season Pass API

> 구현 상태: 🔲 미구현

---

## 시즌 패스 현황 조회

**GET** `/api/v1/season-pass`

**Authorization**: Bearer `{{accessToken}}` (필수)

현재 시즌의 패스 등급과 보상 수령 여부를 조회합니다.

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
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
}
```

| field | 설명 | 출처 |
|---|---|---|
| `passType` | `FREE` (무료) / `PREMIUM` (유료 구매) | `user_season_passes` |
| `currentLevel` | 현재 시즌 패스 레벨 | Redis `season_pass:{userId}` 캐시 |
| `rewards[].claimed` | 해당 레벨 보상 수령 여부 | `season_pass_progress` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 인증 토큰 없음 또는 만료 |

### 남은작업
- 서비스 구현
- Redis `season_pass:{userId}` 캐시 연동

---

## 시즌 패스 구매

**POST** `/api/v1/season-pass/purchase`

**Authorization**: Bearer `{{accessToken}}` (필수)

1,000 AP를 소모하여 30일간 시즌 패스를 활성화합니다.

### Request Body

없음

### 비즈니스 규칙

- `wallets.available_ap` 1,000 차감 후 `user_season_passes` INSERT
- 구매 즉시 혜택 적용 (섬 GP 보너스, 일꾼 +1, 세금 면제 +2)
- 기존 패스 만료 전 재구매 불가 (만료 후 갱신 가능)

### Response (201 Created)

```json
{
  "status": 201,
  "message": "Created",
  "data": {
    "passId": 1,
    "name": "시즌 패스 Vol.1",
    "startedAt": "2026-04-27T12:00:00Z",
    "expiresAt": "2026-05-27T12:00:00Z",
    "costAP": 1000,
    "remainingAP": 500,
    "benefits": {
      "islandBonusPct": 50,
      "extraBuilders": 1,
      "taxExemptBonus": 2
    }
  }
}
```

| benefit | 설명 |
|---|---|
| `islandBonusPct` | Home Island GP 생산량 +50% |
| `extraBuilders` | 건설 일꾼 +1 (동시 건설 2개) |
| `taxExemptBonus` | 토지세 면제 구간 +2 (3개 → 5개) |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | INSUFFICIENT_AP | AP 부족 (1,000 AP 필요) |
| 409 | SEASON_PASS_ACTIVE | 이미 활성 시즌 패스 보유 중 |

### 남은작업
- 서비스 구현
- Redis `season_pass:{userId}` 신규 생성 연동
