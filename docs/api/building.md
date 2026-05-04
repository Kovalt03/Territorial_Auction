# Building API

> Notion 상세 기능 명세: [F-9 건물 건설 및 관리](https://www.notion.so/Functional-Specification-Access-Control-Matrix-3332efa4278d804e8ccfdb31151e9943), [F-8 Home Island](https://www.notion.so/Functional-Specification-Access-Control-Matrix-3332efa4278d804e8ccfdb31151e9943)  
> 구현 상태: ✅ 구현 완료

---

## 목차

| Method | Endpoint | 기능 | 구현 | 남은 작업 |
|---|---|---|---|---|
| GET | `/api/v1/map/territories/{territoryId}/buildings` | [영토 건물 목록 조회](#영토-건물-목록-조회) | ✅ | - |
| POST | `/api/v1/map/territories/{territoryId}/buildings` | [영토 건물 배치](#영토-건물-배치) | ✅ | - |
| POST | `/api/v1/buildings/{buildingId}/upgrade` | [건물 업그레이드](#건물-업그레이드) | ✅ | - |
| POST | `/api/v1/buildings/{buildingId}/repair` | [건물 수리](#건물-수리) | ✅ | - |
| GET | `/api/v1/island` | [섬 정보 조회](#섬-정보-조회) | ✅ | - |
| GET | `/api/v1/island/buildings` | [섬 건물 목록 조회](#섬-건물-목록-조회) | ✅ | - |
| POST | `/api/v1/island/buildings` | [섬 건물 배치](#섬-건물-배치) | ✅ | 일꾼 슬롯 소모 미구현 |
| GET | `/api/v1/inventory` | [보관함 건물 목록 조회](#보관함-아이템-목록-조회) | ✅ | - |
| POST | `/api/v1/inventory/{inventoryId}/place` | [보관함 건물 배치](#보관함-아이템-배치) | ✅ | - |
| PATCH | `/api/v1/buildings/{buildingId}/move` | [건물 이동](#건물-이동) | ✅ | - |
| POST | `/api/v1/buildings/{buildingId}/store` | [건물 보관](#건물-보관) | ✅ | - |

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

### 남은 작업
- TODO: 일꾼 슬롯 소모 로직 미구현 (시즌 패스 연동 필요)

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

출처: `building_instances` (posX=-1, posY=-1인 보관 건물)

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
| 404 | BUILDING_NOT_FOUND | 보관함에 없는 건물 |
| 403 | NOT_TERRITORY_OWNER | 영토 점유자 아님 |
| 400 | INVALID_POSITION | 배치 불가 위치 |
| 400 | ZONE_RESTRICTION_VIOLATED | Zone 제약 위반 |

---

## 건물 이동

**PATCH** `/api/v1/buildings/{buildingId}/move`

**Authorization**: Bearer `{{accessToken}}` (필수, 점유자만)

건물을 같은 영토/섬 내 다른 빈 셀로 이동합니다. GP 소비 없음. (Notion F-9.7)

### Request

```json
{
  "posX": 4,
  "posY": 2
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `posX` | Integer | Y | 이동할 X 좌표 |
| `posY` | Integer | Y | 이동할 Y 좌표 |

### 비즈니스 규칙
- 같은 영토/섬 내 이동만 가능
- 건물 크기에 맞는 빈 셀 필요
- Castle은 Zone 1 내에서만 이동 가능
- GP 소비 없음

### Response (200 OK)

```json
{
  "buildingId": 10,
  "type": "STORAGE",
  "posX": 4,
  "posY": 2
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | `BUILDING_NOT_FOUND` | 존재하지 않는 건물 |
| 403 | `NOT_TERRITORY_OWNER` | 점유자 아님 |
| 400 | `INVALID_POSITION` | 배치 불가 위치 |
| 400 | `ZONE_RESTRICTION_VIOLATED` | Castle을 Zone 1 밖으로 이동 시도 |

---

## 건물 보관

**POST** `/api/v1/buildings/{buildingId}/store`

**Authorization**: Bearer `{{accessToken}}` (필수, 점유자만)

건물을 그리드에서 제거하여 보관함에 저장합니다. Castle은 보관 불가. 레벨 및 현재 HP 유지. (Notion F-9.8)

### 비즈니스 규칙
- Castle(`type = CASTLE`) 보관 불가
- 보관 시 건물의 레벨 및 현재 HP 그대로 유지
- GP 소비 없음

### Response (200 OK)

```json
{
  "buildingId": 10,
  "type": "STORAGE",
  "level": 2,
  "hp": 80,
  "storedAt": "2026-04-28T12:00:00Z"
}
```

| field | 타입 | 설명 |
|---|---|---|
| `buildingId` | Long | 보관된 건물 ID |
| `type` | String | 건물 타입 |
| `level` | Integer | 보관 시점 레벨 (유지됨) |
| `hp` | Integer | 보관 시점 HP (유지됨) |
| `storedAt` | DateTime | 보관 시각 |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | `BUILDING_NOT_FOUND` | 존재하지 않는 건물 |
| 403 | `NOT_TERRITORY_OWNER` | 점유자 아님 |
| 400 | `CASTLE_CANNOT_BE_STORED` | Castle은 보관 불가 |
