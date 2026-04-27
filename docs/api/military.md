# Military API

> 구현 상태: 🔲 미구현

---

## 공격권 보유 조회

**GET** `/api/v1/military/attack-tokens`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "normalCount": 3,
    "precisionCount": 1
  }
}
```

| field | 설명 |
|---|---|
| `normalCount` | 일반 공격권 (랜덤 건물 피해) |
| `precisionCount` | 정밀 공격권 (목표 건물 지정) |

출처: `attack_tokens`

---

## 유닛 생산

**POST** `/api/v1/military/units`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Request

```json
{
  "unitTypeId": 1,
  "quantity": 10
}
```

### 비즈니스 규칙
- 병영(Barracks)이 있는 영토에서만 생산 가능
- GP `unit_types.cost_gp × quantity` 차감

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "unitTypeId": 1,
    "unitName": "INFANTRY",
    "quantity": 10,
    "gpRemaining": 7000
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | NO_BARRACKS | 병영 없음 |
| 400 | INSUFFICIENT_GP | GP 부족 |

---

## 병력 배치

**POST** `/api/v1/military/units/deploy`

**Authorization**: Bearer `{{accessToken}}` (필수)

점유 중인 영토에 유닛을 방어 배치합니다.

### Request

```json
{
  "territoryId": 5,
  "unitTypeId": 1,
  "quantity": 20
}
```

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "deployedCount": 20,
    "territoryId": 5
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 403 | NOT_TERRITORY_OWNER | 배치 권한 없음 |
| 400 | INSUFFICIENT_UNITS | 보유 유닛 부족 |

---

## 병력 교환 (회수)

**POST** `/api/v1/military/units/recall`

**Authorization**: Bearer `{{accessToken}}` (필수)

배치된 유닛을 회수합니다.

### Request

```json
{
  "territoryId": 5,
  "unitTypeId": 1,
  "quantity": 10
}
```

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "recalledCount": 10,
    "remainingDeployed": 10
  }
}
```

---

## 공격 선언

**POST** `/api/v1/military/siege`

**Authorization**: Bearer `{{accessToken}}` (필수, 공격권 보유자)

### Request

```json
{
  "targetTerritoryId": 10,
  "targetBuildingId": 5,
  "attackZone": 3,
  "unitTypeId": 1,
  "unitQuantity": 30
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `targetTerritoryId` | Long | Y | 공격 대상 영토 |
| `targetBuildingId` | Long | N | 정밀 공격권 사용 시 목표 건물 |
| `attackZone` | Integer | Y | 1/2/3 |
| `unitTypeId` | Long | Y | 파견 유닛 종류 |
| `unitQuantity` | Integer | Y | 파견 유닛 수 |

### 비즈니스 규칙
- 공격권 1개 자동 소모
- Zone 순서 제약: 이전 Zone 미클리어 시 다음 Zone 공격 불가
- `SIEGE_COUNTDOWN_MINUTES`(30분) 후 자동 전투 계산
- 방어자에게 즉시 WebSocket 알림 발송

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "siegeId": 1,
    "resolveAt": "2026-04-27T15:30:00Z",
    "attackTokenRemaining": 2
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | NO_ATTACK_TOKEN | 공격권 없음 |
| 400 | ZONE_NOT_CLEARED | 이전 Zone 미클리어 |
| 400 | TERRITORY_INVINCIBLE | 무적 상태 영토 |
| 400 | ATTACK_COOLDOWN | 공격 쿨다운 중 |

---

## 공성전 결과 조회

**GET** `/api/v1/military/siege/{siegeId}/result`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "siegeId": 1,
    "isAttackerWin": true,
    "attackerUnitsLost": 5,
    "defenderUnitsLost": 20,
    "lootedGp": 500,
    "resultType": "LOOT",
    "resolvedAt": "2026-04-27T15:30:00Z"
  }
}
```

| `resultType` | 설명 |
|---|---|
| `LOOT` | GP 약탈 |
| `DEBUFF` | 건물 피해 (생산/병영 디버프) |
| `AUCTION` | 성 파괴 → 영토 강제 경매 전환 |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | SIEGE_NOT_FOUND | 존재하지 않는 공성전 |
| 403 | FORBIDDEN | 관계없는 유저 조회 시도 |

---

## 유닛 현황 조회

**GET** `/api/v1/military/units`

**Authorization**: Bearer `{{accessToken}}` (필수)

사용 페이지: 영토 관리 화면

사용자가 보유한 군사 유닛 목록과 수량을 반환합니다.

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "units": [
      {
        "unitTypeId": 1,
        "name": "INFANTRY",
        "typeName": "보병",
        "quantity": 50,
        "deployedCount": 20,
        "idleCount": 30,
        "attackPower": 10,
        "defensePower": 8,
        "foodCostPerHour": 1
      },
      {
        "unitTypeId": 2,
        "name": "ARCHER",
        "typeName": "궁수",
        "quantity": 30,
        "deployedCount": 0,
        "idleCount": 30,
        "attackPower": 15,
        "defensePower": 5,
        "foodCostPerHour": 2
      }
    ],
    "totalFoodCostPerHour": 110
  }
}
```

| field | 설명 |
|---|---|
| `deployedCount` | `deployed_territory_id`가 NOT NULL인 유닛 수 |
| `idleCount` | 대기 중인 유닛 수 |
| `totalFoodCostPerHour` | 전체 유닛 시간당 식량 소모 합산 |

출처: `unit_instances` JOIN `unit_types`

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 인증 실패 |

### 남은작업
- 서비스 구현

---

## 공성 이벤트 조회

**GET** `/api/v1/siege/events?page={0}&size={20}&status={PENDING}`

- 인증 불필요

사용 페이지: 메인 맵, 공성전 화면

현재 진행 중이거나 최근 종료된 공성전 목록을 반환합니다. 메인 맵에서 진행 중인 공성전 좌표 하이라이트에 활용됩니다.

### Query Parameters

| parameter | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `page` | Integer | N | 0 | 페이지 번호 |
| `size` | Integer | N | 20 | 페이지 크기 |
| `status` | String | N | PENDING | PENDING / RESOLVED |

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "totalCount": 5,
    "sieges": [
      {
        "siegeId": 44,
        "status": "PENDING",
        "attacker": { "userId": 3, "nickname": "공격자" },
        "defender": { "userId": 8, "nickname": "방어자" },
        "targetTerritory": { "id": 12, "coordX": 4, "coordY": 6 },
        "siegeStartAt": "2026-04-27T14:00:00Z",
        "resolveAt": "2026-04-27T14:30:00Z"
      }
    ]
  }
}
```

출처: `siege_events` (PENDING 상태는 Redis `siege:active:{siegeId}` 우선 조회)

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | INVALID_PARAM | 잘못된 쿼리 파라미터 |

### 남은작업
- 서비스 구현
- Redis `siege:active:{siegeId}` 연동

---

## 나의 공성전 이력

**GET** `/api/v1/siege/my-history?page={0}&size={20}&result={ALL}`

**Authorization**: Bearer `{{accessToken}}` (필수)

내가 공격자 또는 방어자로 참여한 공성전 이력을 조회합니다.

### Query Parameters

| parameter | 타입 | 필수 | 설명 |
|---|---|---|---|
| `page` | Integer | N | 페이지 번호 (기본 0) |
| `size` | Integer | N | 페이지당 항목 수 (기본 20) |
| `result` | String | N | 결과 필터 (WIN / LOSE / ALL, 기본 ALL) |

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "totalCount": 14,
    "wins": 9,
    "losses": 5,
    "history": [
      {
        "siegeId": 301,
        "territoryId": 28,
        "territoryGrade": "A",
        "role": "ATTACKER",
        "result": "WIN",
        "attackerMilitary": 200,
        "defenderMilitary": 150,
        "occurredAt": "2026-04-25T18:00:00Z"
      }
    ]
  }
}
```

| field | 설명 |
|---|---|
| `role` | `ATTACKER` (공격자) / `DEFENDER` (방어자) |
| `result` | `WIN` / `LOSE` |

출처: `siege_events` JOIN `siege_results`

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 인증 실패 |

### 남은작업
- 서비스 구현
