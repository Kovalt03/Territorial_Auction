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
    "availableAP": 5000,
    "lockedAP": 1000,
    "availableGP": 12000,
    "availableFood": 100
  }
}
```

| field | 설명 | 출처 |
|---|---|---|
| `availableAP` | 사용 가능 Auction Point | `wallets.available_ap` |
| `lockedAP` | 현재 진행 중인 경매 입찰로 묶인 AP | `wallets.locked_ap` |
| `availableGP` | 사용 가능 Grid Point | `wallets.available_gp` |
| `availableFood` | 유닛 유지 식량 | `wallets.available_food` |

---

## 나의 영토 목록 조회

**GET** `/api/v1/users/me/territories`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "territoryId": 10,
      "name": "테스트영토",
      "gridX": 2,
      "gridY": 3,
      "grade": "RARE",
      "productionRate": 12,
      "invincibleUntil": null,
      "buildingCount": 3,
      "deployedUnitCount": 20
    }
  ]
}
```

| field | 설명 | 출처 |
|---|---|---|
| `grade` | 영토 등급 (COMMON / RARE / EPIC / LEGENDARY) | `territory_grades.name` |
| `productionRate` | 분당 GP 생산량 | `building_instances` 집계 |
| `invincibleUntil` | 무적 상태 만료 시각 (null = 무적 아님) | `territories.invincible_until` |
| `buildingCount` | 배치된 건물 수 | `building_instances` 집계 |
| `deployedUnitCount` | 배치된 유닛 수 | `unit_instances` 집계 |

### 남은작업
- 서비스 구현
