# Payment API

> 구현 상태: 🔲 미구현

---

## AP 충전

**POST** `/api/v1/payment/charge`

**Authorization**: Bearer `{{accessToken}}` (필수)

외부 결제 API(가상)를 통해 AP를 충전합니다.

### Request

```json
{
  "amount": 10000,
  "paymentMethod": "VIRTUAL"
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `amount` | Integer | Y | 충전할 AP 수량 |
| `paymentMethod` | String | Y | 결제 수단 (현재: VIRTUAL) |

### 비즈니스 규칙
- 결제 성공 시 `wallets.available_ap` 즉시 증가
- `ap_charge_logs`에 충전 이력 기록

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "chargedAmount": 10000,
    "availableAP": 15000
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | PAYMENT_FAILED | 결제 실패 |
| 400 | INVALID_AMOUNT | 유효하지 않은 충전 금액 |

### 남은작업
- 서비스 구현
- PG 연동

---

## 아이템 목록 조회

**GET** `/api/v1/items`

- 인증 불필요

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "itemId": 1,
      "name": "무적 시간 추가권",
      "itemType": "INVINCIBILITY",
      "description": "지정 영토의 공격 보호 시간을 +12시간 연장합니다.",
      "costAP": 200,
      "costGP": null,
      "dailyLimit": null
    },
    {
      "itemId": 2,
      "name": "일반 공격권",
      "itemType": "ATTACK_NORMAL",
      "description": "대상 영토에 공성전을 선언합니다. 랜덤 건물에 피해.",
      "costAP": 100,
      "costGP": 500,
      "dailyLimit": null
    },
    {
      "itemId": 3,
      "name": "정밀 공격권",
      "itemType": "ATTACK_PRECISION",
      "description": "목표 건물을 지정하여 공성전을 선언합니다.",
      "costAP": 300,
      "costGP": null,
      "dailyLimit": null
    },
    {
      "itemId": 4,
      "name": "GP 구매권",
      "itemType": "GP_PURCHASE",
      "description": "500 GP를 즉시 지급합니다.",
      "costAP": 50,
      "costGP": null,
      "dailyLimit": 5
    }
  ]
}
```

출처: `items`

### 남은작업
- 서비스 구현

---

## 아이템 구매

**POST** `/api/v1/items/{itemId}/purchase`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Request

```json
{
  "quantity": 1,
  "targetTerritoryId": 5
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `quantity` | Integer | Y | 구매 수량 (기본 1) |
| `targetTerritoryId` | Long | N | 무적 시간 추가권 사용 시 대상 영토 |

### 비즈니스 규칙
- `items.cost_ap` 또는 `cost_gp` 차감
- `item_purchases`에 구매 이력 기록
- GP 구매권: 일일 최대 5회 제한 (`items.daily_limit`)
- 무적 시간 추가권: 대상 영토의 점유자만 사용 가능

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "itemId": 1,
    "itemName": "무적 시간 추가권",
    "quantity": 1,
    "apRemaining": 4800,
    "gpRemaining": 12000
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | ITEM_NOT_FOUND | 존재하지 않는 아이템 |
| 400 | INSUFFICIENT_AP | AP 잔액 부족 |
| 400 | INSUFFICIENT_GP | GP 잔액 부족 |
| 429 | DAILY_LIMIT_EXCEEDED | 일일 구매 한도 초과 |
| 403 | NOT_TERRITORY_OWNER | 무적권 — 점유자 아님 |

### 남은작업
- 서비스 구현

---

## 보유 아이템 목록 조회

**GET** `/api/v1/items/inventory?page={0}&size={20}&type={INVINCIBILITY}`

**Authorization**: Bearer `{{accessToken}}` (필수)

현재 로그인한 유저가 구매하여 보유 중인 소모성 아이템 목록을 조회합니다.

> 건물 배치 보관함(`/api/v1/inventory`)과 다른 엔드포인트입니다. 이 API는 무적권·공격권·GP 구매권 등 소모성 아이템을 반환합니다.

### Query Parameters

| parameter | 타입 | 필수 | 설명 |
|---|---|---|---|
| `page` | Integer | N | 페이지 번호 (기본 0) |
| `size` | Integer | N | 페이지당 항목 수 (기본 20) |
| `type` | String | N | 아이템 타입 필터 (INVINCIBILITY / ATTACK_NORMAL / ATTACK_PRECISION / GP_PURCHASE) |

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "totalCount": 5,
    "items": [
      {
        "userItemId": 301,
        "itemId": 1,
        "itemName": "무적 시간 추가권",
        "itemType": "INVINCIBILITY",
        "description": "지정 영토의 공격 보호 시간을 +12시간 연장합니다.",
        "quantity": 2,
        "acquiredAt": "2026-04-27T10:00:00Z"
      }
    ]
  }
}
```

출처: `item_purchases` JOIN `items`

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 인증 토큰 없음 또는 만료 |

### 남은작업
- 서비스 구현
