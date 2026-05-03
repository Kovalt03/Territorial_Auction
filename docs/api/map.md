# Map API

> 구현 상태: ✅ 완료

---

## 전체 그리드 맵 조회

**GET** `/api/v1/map/grid`  
**GET** `/api/v1/map/grid?continent={continentId}`

- 인증 불필요 (비로그인 접근 가능)
- `continent` 쿼리 파라미터 생략 시 전체 맵 반환

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "mapSize": 50,
    "territories": [
      {
        "territoryId": 1,
        "coordX": 0,
        "coordY": 0,
        "ownerId": 5,
        "ownerNickname": "테스트유저",
        "currentColor": "#FF4444",
        "grade": "B",
        "status": "OCCUPIED",
        "hasActiveAuction": false,
        "continentId": 1,
        "gridSize": 8
      }
    ]
  }
}
```

| field | 설명 | 출처 |
|---|---|---|
| `mapSize` | 맵 한 변 크기 (50 고정) | |
| `grade` | S / A / B / C / D | `territory_grades.grade` |
| `status` | BIDDING / OCCUPIED / IDLE | `territories.status` |
| `hasActiveAuction` | 현재 경매 진행 여부 | `auctions` 존재 여부 |
| `gridSize` | 내부 건물 배치 그리드 크기 | `territory_grades.grid_size` |

### 남은작업
- Redis 캐시 적용 (`map:grid` / `map:grid:{continentId}`)

---

## 대륙 목록 조회

**GET** `/api/v1/continents`

**Authorization**: Bearer `{{accessToken}}` (선택)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "continentId": 1,
      "name": "북부 대륙",
      "themeColor": "#4A90D9",
      "territoryCount": 50,
      "occupiedCount": 30
    }
  ]
}
```

### 남은작업
- 길드 도메인 연동 (대륙 지배 길드 정보)

---

## 영토 상세 조회

**GET** `/api/v1/map/territories/{territoryId}`

- 인증 불필요

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "territoryId": 1,
    "coordX": 0,
    "coordY": 0,
    "continentName": "북부 대륙",
    "grade": "B",
    "productionMultiplier": 1.0,
    "gridSize": 8,
    "status": "OCCUPIED",
    "owner": {
      "userId": 5,
      "nickname": "테스트유저",
      "currentColor": "#FF4444"
    },
    "baseProductionRate": 1,
    "isInvincible": false,
    "buildings": [
      {
        "buildingId": 1,
        "type": "CASTLE",
        "level": 1,
        "hp": 100,
        "maxHp": 100
      }
    ],
    "auction": {
      "auctionId": 3,
      "currentPrice": 1500,
      "endAt": "2026-04-28T12:00:00Z"
    }
  }
}
```

> `owner`: 점유자 없으면 null  
> `auction`: 경매 없으면 null  
> `isInvincible`: TODO — Redis `invincible:{territoryId}` 키 존재 여부로 교체 예정

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | TERRITORY_NOT_FOUND | 존재하지 않는 영토 |

---

## 영토 색상 변경

**PATCH** `/api/v1/map/territories/{territoryId}/color`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Request

```json
{
  "colorCode": "#FF4444"
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `colorCode` | String | Y | '#RRGGBB' 형식 |

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": null
}
```

### 비즈니스 규칙
- 현재 영토의 점유자(`owner_id`)만 변경 가능
- 점유 상태(`OCCUPIED`)이고 `occupied_until`이 유효한 경우만
- 점유 기간 내 최대 **3회** 변경 가능
- 변경 시마다 `color_histories`에 기록

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | TERRITORY_NOT_FOUND | 존재하지 않는 영토 |
| 403 | NOT_TERRITORY_OWNER | 점유자 아님 |
| 400 | TERRITORY_NOT_OCCUPIED | 점유 상태가 아니거나 만료 |
| 429 | COLOR_CHANGE_LIMIT_EXCEEDED | 변경 횟수 초과 (3회) |

### 남은작업
- Redis 카운터로 교체 (`color:change:{territoryId}:{userId}`)
- WebSocket으로 다른 유저에게 색상 변경 브로드캐스트

---

## 가격 변동 그래프 데이터

**GET** `/api/v1/map/territories/{territoryId}/price-history?days={7|30|90}`

- 인증 불필요

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "territoryId": 1,
    "bids": [
      {
        "price": 1000,
        "bidAt": "2026-04-01T00:00:00Z",
        "bidderNickname": null
      },
      {
        "price": 1200,
        "bidAt": "2026-04-01T01:00:00Z",
        "bidderNickname": "테스트유저"
      }
    ]
  }
}
```

> `bids[0]`: 경매 시작가(시스템 입찰, `bidderNickname=null`)  
> 출처: `auction_bids` (INDEX: `auction_id, bid_at ASC`)

---

## 영토 등급 시스템 (참고)

> Notion F-13 — 맵 초기화 시 부여되는 고정 등급 체계

### 등급 분류 (F-13.1)

맵 시드 초기화 시 영토별로 S/A/B/C/D 등급을 `spawn_rate` 확률에 따라 무작위 부여. **이후 변경 불가**.

| 등급 | 특징 |
|---|---|
| 🟣 S | 최고 생산 배율, 2~3개 건물 사전 배치, 높은 시작 경매가 |
| 🔵 A | 높은 생산 배율, 1개 건물 사전 배치 |
| 🟢 B | 일반 |
| 🟡 C | 낮은 생산 배율 |
| 🔴 D | 최저 생산 배율 |

### 등급 효과

- **생산 배율 (F-13.2)**: 낙찰 시 `Territory.base_production_rate × TerritoryGrade.production_multiplier`로 실질 생산량 결정
- **시작 경매가 배율 (F-13.3)**: `Auction.start_price × TerritoryGrade.auction_price_multiplier`로 초기 경매가 설정
- **사전 배치 건물 (F-13.4)**: S급 2~3개, A급 1개 건물이 낙찰 시점에 자동 생성. 낙찰자 즉시 소유

### UI 표시 (F-13.5)

- 영토 팝업 모달 상단에 등급 배지 항상 노출 (비로그인 포함 모든 유저 조회 가능)
- `GET /api/v1/map/territories/{territoryId}` 응답의 `grade` 필드로 확인
