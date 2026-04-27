# Building API

> 구현 상태: 🔲 미구현

---

## 영토 건물 목록 조회

**GET** `/api/v1/map/territories/{territoryId}/buildings`

- 인증 불필요

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "buildingId": 1,
      "type": "CASTLE",
      "name": "성",
      "posX": 3,
      "posY": 3,
      "width": 2,
      "height": 2,
      "hp": 100,
      "maxHp": 100,
      "level": 1,
      "zone": 1,
      "isDestroyed": false
    }
  ]
}
```

출처: `building_instances`, `building_types`, `territories`

### 남은작업
- 서비스 구현

---

## 영토 건물 배치

**POST** `/api/v1/map/territories/{territoryId}/buildings`

**Authorization**: Bearer `{{accessToken}}` (필수, 점유자만)

### Request

```json
{
  "buildingTypeId": 2,
  "posX": 0,
  "posY": 0
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `buildingTypeId` | Long | Y | 건물 타입 ID |
| `posX` | Integer | Y | 배치 시작 X 좌표 |
| `posY` | Integer | Y | 배치 시작 Y 좌표 |

### 비즈니스 규칙
- 건물 크기(`width × height`)에 맞는 연속된 빈 셀 필요
- Castle은 Zone 1에만 배치 가능
- 영토당 Castle은 반드시 1개
- GP를 `building_types.base_cost_gp` 만큼 차감

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "buildingId": 10,
    "type": "STORAGE",
    "posX": 0,
    "posY": 0,
    "gpRemaining": 11500
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 403 | NOT_TERRITORY_OWNER | 점유자 아님 |
| 400 | INVALID_POSITION | 배치 불가 위치 (셀 겹침, 범위 초과) |
| 400 | ZONE_RESTRICTION_VIOLATED | Zone 제약 위반 |
| 400 | INSUFFICIENT_GP | GP 부족 |

### 남은작업
- 서비스 구현

---

## 건물 업그레이드

**POST** `/api/v1/buildings/{buildingId}/upgrade`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "buildingId": 1,
    "newLevel": 2,
    "gpRemaining": 9000
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | BUILDING_NOT_FOUND | 존재하지 않는 건물 |
| 403 | NOT_TERRITORY_OWNER | 점유자 아님 |
| 400 | INSUFFICIENT_GP | GP 부족 |

### 남은작업
- 서비스 구현

---

## 건물 수리

**POST** `/api/v1/buildings/{buildingId}/repair`

**Authorization**: Bearer `{{accessToken}}` (필수)

파괴된 건물을 GP를 소비하여 재건. 수리 후 HP 완전 복원.

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "buildingId": 1,
    "hp": 100,
    "gpRemaining": 8000
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | BUILDING_NOT_FOUND | 존재하지 않는 건물 |
| 403 | NOT_TERRITORY_OWNER | 점유자 아님 |
| 400 | INSUFFICIENT_GP | GP 부족 |

### 남은작업
- 서비스 구현

---

## 섬 정보 조회

**GET** `/api/v1/island`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "islandId": 1,
    "gridSize": 10,
    "level": 1,
    "productionRate": 5,
    "buildings": [
      {
        "buildingId": 1,
        "type": "WORKSHOP",
        "posX": 0,
        "posY": 0,
        "hp": 100,
        "maxHp": 100,
        "level": 1
      }
    ]
  }
}
```

출처: `home_islands`, `building_instances`, `building_types`

### 남은작업
- 서비스 구현

---

## 섬 건물 목록 조회

**GET** `/api/v1/island/buildings`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "buildingId": 1,
      "type": "WORKSHOP",
      "posX": 0,
      "posY": 0,
      "hp": 100,
      "maxHp": 100,
      "level": 1,
      "isDestroyed": false
    }
  ]
}
```

### 남은작업
- 서비스 구현

---

## 섬 건물 배치

**POST** `/api/v1/island/buildings`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Request

```json
{
  "buildingTypeId": 3,
  "posX": 0,
  "posY": 0
}
```

### 비즈니스 규칙
- 일꾼 슬롯 소모 (기본 1, 시즌 패스 보유 시 2)
- GP `building_types.base_cost_gp` 차감

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "buildingId": 5,
    "type": "WORKSHOP",
    "posX": 0,
    "posY": 0,
    "gpRemaining": 9500
  }
}
```

### 남은작업
- 서비스 구현

---

## 보관함 아이템 목록 조회

**GET** `/api/v1/inventory`

**Authorization**: Bearer `{{accessToken}}` (필수)

구매했지만 아직 배치하지 않은 건물 아이템 목록을 반환합니다.

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "inventoryId": 1,
      "buildingTypeId": 3,
      "buildingTypeName": "병영",
      "buildingType": "BARRACKS",
      "quantity": 2,
      "acquiredAt": "2026-04-27T10:00:00Z"
    }
  ]
}
```

출처: `item_purchases` (미배치 건물 아이템)

### 남은작업
- 서비스 구현

---

## 보관함 아이템 배치

**POST** `/api/v1/inventory/{inventoryId}/place`

**Authorization**: Bearer `{{accessToken}}` (필수, 영토 점유자만)

보관함의 건물 아이템을 지정 영토에 배치합니다.

### Request

```json
{
  "territoryId": 5,
  "posX": 2,
  "posY": 3
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `territoryId` | Long | Y | 배치할 영토 ID |
| `posX` | Integer | Y | 배치 시작 X 좌표 |
| `posY` | Integer | Y | 배치 시작 Y 좌표 |

### 비즈니스 규칙
- 해당 영토의 점유자만 배치 가능
- 건물 크기(`width × height`)에 맞는 연속된 빈 셀 필요
- Zone 제약 규칙 동일 적용
- 배치 완료 후 보관함 수량 1 차감

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "buildingId": 15,
    "buildingType": "BARRACKS",
    "posX": 2,
    "posY": 3,
    "territoryId": 5
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | INVENTORY_ITEM_NOT_FOUND | 보관함에 없는 아이템 |
| 403 | NOT_TERRITORY_OWNER | 영토 점유자 아님 |
| 400 | INVALID_POSITION | 배치 불가 위치 |
| 400 | ZONE_RESTRICTION_VIOLATED | Zone 제약 위반 |

### 남은작업
- 서비스 구현
