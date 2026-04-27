# User API

> 구현 상태: ✅ 완료

---

## 유저 프로필 조회

**GET** `/api/v1/users/{userId}`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "userId": 1,
    "username": "testuser",
    "nickname": "테스트유저",
    "profileImageUrl": null,
    "joinedAt": "2026-04-01T00:00:00Z"
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | USER_NOT_FOUND | 존재하지 않는 유저 |

---

## 내 프로필 조회

**GET** `/api/v1/users/me`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "userId": 1,
    "username": "testuser",
    "nickname": "테스트유저",
    "profileImageUrl": null,
    "joinedAt": "2026-04-01T00:00:00Z",
    "wallet": {
      "availableAP": 5000,
      "lockedAP": 1000,
      "availableGP": 12000
    },
    "island": {
      "islandId": 1,
      "gridSize": 10,
      "productionRate": 5
    },
    "seasonPass": {
      "isActive": true,
      "expiresAt": "2026-05-01T00:00:00Z"
    }
  }
}
```

> `island.productionRate`: 섬 건물 합산 분당 GP 생산량  
> `seasonPass`: 없으면 null

### 남은작업
- 섬 도메인 연동 (island 필드)
- 시즌 패스 Redis 캐시 연동

---

## 알림 설정 조회

**GET** `/api/v1/users/me/settings`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "isOutbidEnabled": true,
    "isAuctionStartEnabled": true,
    "isMarketingEnabled": false
  }
}
```

| field | 설명 | 출처 |
|---|---|---|
| `isOutbidEnabled` | 상회 입찰 알림 | `notification_settings.is_outbid_enabled` |
| `isAuctionStartEnabled` | 관심 대륙 경매 시작 알림 | `notification_settings.is_auction_start_enabled` |
| `isMarketingEnabled` | 마케팅 알림 | `notification_settings.is_marketing_enabled` |

---

## 알림 수신 설정 변경

**PATCH** `/api/v1/users/me/settings`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Request

```json
{
  "isOutbidEnabled": false,
  "isAuctionStartEnabled": true,
  "isMarketingEnabled": false
}
```

요청 body에 포함된 필드만 UPDATE, 나머지는 기존 값 유지

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": null
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | NOTIFICATION_SETTING_NOT_FOUND | 설정 레코드 없음 (데이터 정합성 오류) |

---

## GP/AP 잔액 조회

**GET** `/api/v1/users/me/wallet`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "availableGP": 12000,
    "availableAP": 5000,
    "lockedAP": 1000
  }
}
```

> `availableFood` 필드는 미군사 도메인 구현 후 추가 예정

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `availableGP` | int | 사용 가능 Grid Point | `wallets.available_gp` |
| `availableAP` | int | 사용 가능 Auction Point | `wallets.available_ap` |
| `lockedAP` | int | 진행 중인 경매 입찰로 묶인 AP | `wallets.locked_ap` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | USER_NOT_FOUND | 존재하지 않는 유저 |

---

## 나의 영토 목록 조회

**GET** `/api/v1/users/me/territories`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Query Parameters

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| `page` | 0 | 페이지 번호 (0-based) |
| `size` | 10 | 페이지 크기 |
| `sort` | `id,DESC` | 정렬 기준 |

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "totalCount": 3,
    "territories": [
      {
        "territoryId": 10,
        "grade": "A",
        "position": { "x": 2, "y": 3 },
        "continentName": "아시아",
        "occupiedAt": null,
        "militaryCount": 0,
        "isInvincible": false
      }
    ]
  }
}
```

> `occupiedAt`, `militaryCount`, `isInvincible`은 군사 도메인 구현 후 연동 예정 (현재 각각 null / 0 / false 반환)

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `totalCount` | int | 보유 영토 전체 개수 | `territories` 집계 |
| `territories[]` | array | 페이지 단위 영토 목록 | - |
| `territories[].territoryId` | Long | 영토 ID | `territories.id` |
| `territories[].grade` | String | 영토 등급 (S/A/B/C/D) | `territory_grades.grade` |
| `territories[].position.x` | int | 그리드 X 좌표 | `territories.coord_x` |
| `territories[].position.y` | int | 그리드 Y 좌표 | `territories.coord_y` |
| `territories[].continentName` | String | 소속 대륙 이름 | `continents.name` |
| `territories[].occupiedAt` | String (ISO 8601) | 점령 시각 (미구현, null) | - |
| `territories[].militaryCount` | int | 배치된 유닛 수 (미구현, 0) | - |
| `territories[].isInvincible` | boolean | 무적 상태 여부 (미구현, false) | - |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 인증 토큰 없음 또는 만료 |
