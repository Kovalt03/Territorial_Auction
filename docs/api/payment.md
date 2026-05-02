# Payment API

> 구현 상태: 🔲 미구현

## 목차

| Method | Endpoint | 기능 | 구현 | 남은 작업 |
|---|---|---|---|---|
| POST | `/api/v1/users/me/ap/charge` | [AP 충전](#ap-충전) | ⬜ | 서비스 구현, PG 연동 |
| GET | `/api/v1/land-tax/status` | [토지세 현황 조회](#토지세-현황-조회) | ⬜ | 서비스 구현 |
| GET | `/api/v1/land-tax/logs` | [납세 내역 조회](#납세-내역-조회) | ⬜ | 서비스 구현 |
| POST | `/api/v1/global-vault/donate` | [글로벌 금고 이전](#글로벌-금고-이전) | ⬜ | 서비스 구현 |
| GET | `/api/v1/items` | [아이템 목록 조회](#아이템-목록-조회) | ⬜ | 서비스 구현 |
| POST | `/api/v1/items/purchase` | [아이템 구매](#아이템-구매) | ⬜ | 서비스 구현 |
| POST | `/api/v1/items/use` | [아이템 사용](#아이템-사용) | ⬜ | 서비스 구현, Redis invincible, Redis 무효화 |
| GET | `/api/v1/items/inventory` | [보유 아이템 목록 조회](#보유-아이템-목록-조회) | ⬜ | 서비스 구현 |
| GET | `/api/v1/season-pass/me` | [시즌 패스 상태 조회](#시즌-패스-상태-조회) | ⬜ | 서비스 구현, 시즌패스 Redis 캐시 |
| GET | `/api/v1/season-pass` | [시즌 패스 현황 조회](#시즌-패스-현황-조회) | ⬜ | 서비스 구현 |
| POST | `/api/v1/season-pass/purchase` | [시즌 패스 구매](#시즌-패스-구매) | ⬜ | 서비스 구현, 시즌패스 Redis 캐시 |

---

## AP 충전

**POST** `/api/v1/users/me/ap/charge`

**Authorization**: Bearer `{{accessToken}}` (필수)

외부 결제(PG)를 통해 AP 포인트를 충전합니다.

### Request

```json
{
  "amount": 1000,
  "paymentKey": "tgen_20260408...",
  "orderId": "order_user1_1744113600"
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `amount` | Integer | Y | 충전할 AP 수량 |
| `paymentKey` | String | Y | PG사 결제 키 (검증용) |
| `orderId` | String | Y | 주문 ID (멱등성 보장) |

### 비즈니스 규칙
- PG사 API 검증 후 `wallets.available_ap` 원자적 증가
- `orderId` 기반 멱등성 처리 (중복 요청 방지)
- AP:원화 환율은 서버 config 기준

### Response (200 OK)

```json
{
  "availableAP": 1300,
  "chargedAmount": 1000,
  "chargedAt": "2026-04-08T12:00:00Z"
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `availableAP` | Integer | 충전 후 사용 가능 AP 잔액 | `wallets.available_ap` |
| `chargedAmount` | Integer | 이번에 충전된 AP 수량 | 요청 `amount` |
| `chargedAt` | String (ISO 8601) | 충전 완료 시각 | `wallets.updated_at` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | `INVALID_PAYMENT` | PG 검증 실패 |
| 409 | `DUPLICATE_ORDER` | 중복 주문 ID |
| 422 | `PAYMENT_AMOUNT_MISMATCH` | 결제 금액 불일치 |

### 남은 작업
- ⬜ `PaymentService.chargeAp()` 구현
- ⬜ PG 연동 (Toss Payments 등)

---

## 토지세 현황 조회

**GET** `/api/v1/land-tax/status`

**Authorization**: Bearer `{{accessToken}}` (필수)

현재 보유 영토 수에 따른 일일 토지세 예상액, 면제 구간, 다음 납부일을 반환합니다.

### Response (200 OK)

```json
{
  "territoryCount": 8,
  "taxBreakdown": {
    "exemptCount": 3,
    "taxableCount": 5,
    "dailyGP": 250
  },
  "seasonPassExemptBonus": 2,
  "effectiveExemptCount": 5,
  "finalDailyGP": 150,
  "nextChargeAt": "2026-04-09T00:00:00Z"
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `territoryCount` | Integer | 현재 보유 영토 수 | `territories` COUNT |
| `taxBreakdown.exemptCount` | Integer | 기본 면제 영토 수 | 누진 정책 기준 |
| `taxBreakdown.taxableCount` | Integer | 과세 영토 수 | `territoryCount - exemptCount` |
| `taxBreakdown.dailyGP` | Integer | 시즌패스 미적용 일일 세금 | 누진 정책 계산값 |
| `seasonPassExemptBonus` | Integer | 시즌패스로 추가 면제되는 영토 수 | `season_passes.tax_exempt_bonus` |
| `effectiveExemptCount` | Integer | 실제 면제 영토 수 | `exemptCount + seasonPassExemptBonus` |
| `finalDailyGP` | Integer | 최종 일일 세금 (GP) | 누진 정책 재계산값 |
| `nextChargeAt` | String (ISO 8601) | 다음 세금 납부 시각 | 매일 자정 KST |

### 토지세 누진 구조

| 보유 영토 수 | 일일 세금 |
|---|---|
| 1~3개 | 면제 |
| 4~6개 | 50 GP/일 |
| 7~10개 | 150 GP/일 |
| 11개↑ | 400 GP/일 |

> 시즌 패스 보유 시 면제 기준 +2개 적용

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 인증 실패 |

### 남은 작업
- ⬜ `LandTaxService.getStatus()` 구현
- ⬜ Redis `land_tax:expected:{userId}` 캐시 (TTL: 자정까지)

---

## 납세 내역 조회

**GET** `/api/v1/land-tax/logs?page={0}&size={20}&status={ALL}`

**Authorization**: Bearer `{{accessToken}}` (필수)

토지세 부과 및 납부 이력을 페이징하여 반환합니다.

### Query Parameters

| parameter | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `page` | Integer | N | 0 | 페이지 번호 (0-based) |
| `size` | Integer | N | 20 | 페이지 크기 |
| `status` | String | N | ALL | `ALL` / `PAID` / `FAILED` / `EXEMPT` |

### Response (200 OK)

```json
{
  "totalCount": 15,
  "logs": [
    {
      "logId": 33,
      "chargedAt": "2026-04-08T00:00:00Z",
      "territoryCount": 8,
      "gpCharged": 150,
      "status": "PAID"
    },
    {
      "logId": 30,
      "chargedAt": "2026-04-07T00:00:00Z",
      "territoryCount": 3,
      "gpCharged": 0,
      "status": "EXEMPT"
    }
  ]
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `totalCount` | Integer | 전체 납세 이력 수 | `land_tax_logs` COUNT |
| `logs[].logId` | Long | 납세 이력 ID | `land_tax_logs.id` |
| `logs[].chargedAt` | String (ISO 8601) | 세금 부과 시각 | `land_tax_logs.charged_at` |
| `logs[].territoryCount` | Integer | 부과 시점 보유 영토 수 | `land_tax_logs.territory_count` |
| `logs[].gpCharged` | Integer | 차감된 GP (면제 시 0) | `land_tax_logs.gp_charged` |
| `logs[].status` | String | `PAID` / `FAILED` / `EXEMPT` | `land_tax_logs.status` |

> `FAILED`: GP 부족으로 차감 실패 → 영토 강제 반환 트리거 가능 / `charged_at` 내림차순 정렬

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 인증 실패 |

### 남은 작업
- ⬜ `LandTaxService.getLogs()` 구현

---

## 글로벌 금고 이전

**POST** `/api/v1/global-vault/donate`

**Authorization**: Bearer `{{accessToken}}` (필수)

점유 중인 임시 영토의 창고에 있는 GP를 홈 아일랜드의 글로벌 금고(개인 금고)로 이전합니다.

영토 창고의 GP는 공격으로 탈취당할 수 있지만, 글로벌 금고로 이전한 GP는 계정에 귀속되어 안전하게 보관됩니다. 이전한 GP는 건물 건설·업그레이드·병력 훈련 등에 사용되며, 자산가 랭킹 집계에도 포함됩니다.

> 쿨다운: 이전 후 10분 (`VAULT_TRANSFER_COOLDOWN_MINUTES: 10`) 간 재이전 불가

### Request

```json
{
  "sourceTerritoryId": 42,
  "amount": 5000
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `sourceTerritoryId` | Long | Y | GP를 꺼낼 영토 ID |
| `amount` | Long | Y | 이전할 GP 수량 (1 이상) |

### 비즈니스 규칙
- 본인 점유 영토(`territories.owner_id = userId`)에서만 이전 가능
- 영토 창고 잔여 GP 이상 이전 불가 (`territory_storages.stored_gp >= amount`)
- 금고 용량 초과 불가 (`global_vaults.stored_gp + amount <= global_vaults.capacity`)
- 이전 성공 시 `territory_storages.stored_gp` 차감, `global_vaults.stored_gp` 증가 (원자적)
- `global_vaults.last_transfer_at` 갱신 → 10분 쿨다운 계산 기준

### Response (200 OK)

```json
{
  "transferredAmount": 5000,
  "sourceTerritoryId": 42,
  "territoryStorageAfter": 3200,
  "vaultStoredAfter": 18500,
  "vaultCapacity": 50000,
  "nextTransferAvailableAt": "2026-04-08T12:10:00Z"
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `transferredAmount` | Long | 이번에 이전된 GP 수량 | 요청 `amount` |
| `sourceTerritoryId` | Long | 출처 영토 ID | 요청 `sourceTerritoryId` |
| `territoryStorageAfter` | Long | 이전 후 영토 창고 잔여 GP | `territory_storages.stored_gp` |
| `vaultStoredAfter` | Long | 이전 후 글로벌 금고 잔액 | `global_vaults.stored_gp` |
| `vaultCapacity` | Long | 글로벌 금고 최대 용량 | `global_vaults.capacity` |
| `nextTransferAvailableAt` | String (ISO 8601) | 다음 이전 가능 시각 (10분 후) | `global_vaults.last_transfer_at + 10분` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | `INVALID_AMOUNT` | 이전 수량 1 미만 |
| 400 | `INSUFFICIENT_GP` | 영토 창고 GP 부족 |
| 403 | `NOT_TERRITORY_OWNER` | 본인 점유 영토가 아님 |
| 404 | `TERRITORY_NOT_FOUND` | 존재하지 않는 영토 |
| 409 | `VAULT_CAPACITY_EXCEEDED` | 금고 용량 초과 |
| 429 | `TRANSFER_COOLDOWN_ACTIVE` | 쿨다운 중 (10분 대기) |

### 남은 작업
- ⬜ `GlobalVaultService.transfer()` 구현
- ⬜ 영토 창고 ↔ 금고 원자적 GP 이동 트랜잭션
- ⬜ 쿨다운 검증 (`last_transfer_at + 10분 > now()` 체크)

---

## 아이템 목록 조회

**GET** `/api/v1/items`

**Authorization**: Bearer `{{accessToken}}` (필수)

아이템 샵에서 구매 가능한 아이템 목록과 가격을 반환합니다.

### Response (200 OK)

```json
{
  "items": [
    {
      "itemId": 1,
      "name": "무적권",
      "itemType": "INVINCIBILITY",
      "description": "영토에 1시간 동안 무적 상태를 부여합니다.",
      "costAP": 50,
      "costGP": null,
      "dailyLimit": 3,
      "myInventory": 2
    },
    {
      "itemId": 2,
      "name": "일반 공격권",
      "itemType": "ATTACK_NORMAL",
      "description": "대상 영토에 공성전을 선언합니다. 랜덤 건물에 피해.",
      "costAP": 100,
      "costGP": null,
      "dailyLimit": 5,
      "myInventory": 1
    },
    {
      "itemId": 3,
      "name": "GP 구매권",
      "itemType": "GP_PURCHASE",
      "description": "AP 200으로 GP 1,000을 즉시 구매합니다.",
      "costAP": 200,
      "costGP": null,
      "dailyLimit": null,
      "myInventory": 0
    }
  ]
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `items[].itemId` | Long | 아이템 ID | `items.id` |
| `items[].name` | String | 아이템 이름 | `items.name` |
| `items[].itemType` | String | 아이템 종류 — `INVINCIBILITY` / `ATTACK_NORMAL` / `GP_PURCHASE` | `items.item_type` |
| `items[].description` | String | 아이템 설명 | `items.description` |
| `items[].costAP` | Integer (nullable) | AP 구매 비용 — `null`이면 AP로 구매 불가 | `items.cost_ap` |
| `items[].costGP` | Integer (nullable) | GP 구매 비용 — `null`이면 GP로 구매 불가 | `items.cost_gp` |
| `items[].dailyLimit` | Integer (nullable) | 일일 구매 한도 — `null`이면 무제한 | `items.daily_limit` |
| `items[].myInventory` | Integer | 내 보유 수량 | `user_items.quantity` (Redis 캐시 우선) |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 인증 실패 |

### 남은 작업
- ⬜ `PaymentService.getItems()` 구현
- ⬜ `items` 테이블 초기 데이터 시딩 (위 3종 아이템)
- ⬜ Redis `user:item:{userId}` 캐시에서 `myInventory` 조회

---

## 아이템 구매

**POST** `/api/v1/items/purchase`

**Authorization**: Bearer `{{accessToken}}` (필수)

AP를 소모하여 아이템을 구매합니다. 구매 즉시 인벤토리에 추가됩니다.

### Request

```json
{
  "itemId": 1,
  "quantity": 2
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `itemId` | Long | Y | 아이템 ID |
| `quantity` | Integer | Y | 구매 수량 (1 이상) |

### 비즈니스 규칙
- AP 차감 후 `item_purchases`에 이력 기록, `user_items`에 수량 적립
- `GP_PURCHASE` 타입 구매 시 즉시 `wallets.available_gp` 증가
- 일일 한도 초과 체크: `item_purchases` 당일 구매 이력 집계
- 구매 후 Redis `user:item:{userId}` 무효화

### Response (200 OK)

```json
{
  "itemId": 1,
  "itemType": "INVINCIBILITY",
  "purchased": 2,
  "totalOwned": 4,
  "costAP": 100,
  "remainingAP": 200
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `itemId` | Long | 구매한 아이템 ID | `items.id` |
| `itemType` | String | 아이템 종류 | `items.item_type` |
| `purchased` | Integer | 구매 수량 | 요청 `quantity` |
| `totalOwned` | Integer | 구매 후 총 보유 수량 | `user_items.quantity` |
| `costAP` | Integer | 차감된 AP (수량 × 단가) | `items.cost_ap × quantity` |
| `remainingAP` | Integer | 구매 후 잔여 AP | `wallets.available_ap` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | `INVALID_QUANTITY` | 수량 1 미만 |
| 402 | `INSUFFICIENT_AP` | AP 잔액 부족 |
| 404 | `ITEM_NOT_FOUND` | 존재하지 않는 아이템 |
| 429 | `DAILY_LIMIT_EXCEEDED` | 일일 구매 한도 초과 |

### 남은 작업
- ⬜ `PaymentService.purchaseItem()` 구현
- ⬜ 일일 한도 체크 로직 (`item_purchases` 당일 집계)
- ⬜ Redis `user:item:{userId}` 무효화

---

## 아이템 사용

**POST** `/api/v1/items/use`

**Authorization**: Bearer `{{accessToken}}` (필수)

보유 중인 아이템을 사용합니다. 아이템 종류에 따라 영토 지정이 필요합니다.

### Request

```json
{
  "itemId": 1,
  "targetTerritoryId": 15
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `itemId` | Long | Y | 아이템 ID |
| `targetTerritoryId` | Long | N | 무적권·공격권 사용 시 대상 영토 |

### 비즈니스 규칙
- `INVINCIBILITY`: 대상 영토에 Redis 키 생성 (`invincible:{territoryId}`, TTL=1시간)
- `ATTACK_NORMAL` / `ATTACK_PRECISION`: 공성전 자동 선언 (내부적으로 siege 처리)
- `GP_PURCHASE`: 구매 시점에 이미 GP 지급 완료 → 별도 사용 불필요
- 사용 후 `user_items.quantity` -1, `item_purchases.used_at` 업데이트
- 사용 후 Redis `user:item:{userId}` 무효화

### Response (200 OK)

```json
{
  "itemId": 1,
  "itemType": "INVINCIBILITY",
  "result": {
    "territoryId": 15,
    "invincibleUntil": "2026-04-08T16:00:00Z"
  },
  "remainingCount": 1
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `itemId` | Long | 사용한 아이템 ID | `items.id` |
| `itemType` | String | 아이템 종류 | `items.item_type` |
| `result.territoryId` | Long (nullable) | 적용된 영토 ID | `siege_events.target_territory_id` |
| `result.invincibleUntil` | String (nullable, ISO 8601) | 무적 만료 시각 | Redis TTL 기준 |
| `remainingCount` | Integer | 사용 후 보유 수량 | `user_items.quantity` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | `TARGET_REQUIRED` | 무적권·공격권 — 대상 영토 필수 |
| 403 | `NOT_TERRITORY_OWNER` | 무적권 — 본인 영토가 아님 |
| 404 | `ITEM_NOT_FOUND` | 아이템 없음 (보유하지 않음) |
| 409 | `ITEM_OUT_OF_STOCK` | 보유 수량 0 |
| 409 | `ALREADY_INVINCIBLE` | 이미 무적 상태인 영토 |

### 남은 작업
- ⬜ `PaymentService.useItem()` 구현
- ⬜ Redis `invincible:{territoryId}` 생성 (TTL 3600s)
- ⬜ Redis `user:item:{userId}` 무효화

---

## 보유 아이템 목록 조회

**GET** `/api/v1/items/inventory?page={0}&size={20}&type={INVINCIBILITY}`

**Authorization**: Bearer `{{accessToken}}` (필수)

현재 로그인한 사용자의 보유 아이템 목록을 조회합니다.

### Query Parameters

| parameter | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `page` | Integer | N | 0 | 페이지 번호 (0-based) |
| `size` | Integer | N | 20 | 페이지당 항목 수 |
| `type` | String | N | - | 아이템 타입 필터 |

### Response (200 OK)

```json
{
  "totalCount": 5,
  "items": [
    {
      "userItemId": 301,
      "itemId": 1,
      "itemName": "무적권",
      "itemType": "INVINCIBILITY",
      "description": "영토에 1시간 동안 무적 상태를 부여합니다.",
      "quantity": 2,
      "acquiredAt": "2026-04-01T12:00:00Z"
    }
  ]
}
```

| field | 타입 | 설명 | 출처 |
|---|---|---|---|
| `totalCount` | Integer | 전체 보유 아이템 수 | `item_purchases` COUNT |
| `items[].userItemId` | Long | 보유 아이템 레코드 ID | `item_purchases.id` |
| `items[].itemId` | Long | 아이템 ID | `items.id` |
| `items[].itemName` | String | 아이템 이름 | `items.name` |
| `items[].itemType` | String | 아이템 종류 | `items.item_type` |
| `items[].description` | String | 아이템 설명 | `items.description` |
| `items[].quantity` | Integer | 보유 수량 | `item_purchases.quantity` |
| `items[].acquiredAt` | String (ISO 8601) | 아이템 획득 시각 | `item_purchases.purchased_at` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | `UNAUTHORIZED` | 인증 토큰 없음 또는 만료 |

### 남은 작업
- ⬜ `PaymentService.getInventory()` 구현

---

## 시즌 패스 상태 조회

**GET** `/api/v1/season-pass/me`

**Authorization**: Bearer `{{accessToken}}` (필수)

현재 시즌 패스 보유 여부와 만료일, 적용 중인 혜택을 반환합니다.

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
| `hasSeasonPass` | Boolean | 시즌 패스 보유 여부 | `user_season_passes.is_active` |
| `seasonPass.passId` | Long (nullable) | 시즌 패스 ID | `user_season_passes.season_pass_id` |
| `seasonPass.name` | String (nullable) | 시즌 패스 이름 | `season_passes.name` |
| `seasonPass.startedAt` | String (nullable, ISO 8601) | 패스 시작 시각 | `user_season_passes.started_at` |
| `seasonPass.expiresAt` | String (nullable, ISO 8601) | 패스 만료 시각 | `user_season_passes.expires_at` |
| `seasonPass.daysRemaining` | Integer (nullable) | 남은 일수 | `expires_at - now()` 계산값 |
| `seasonPass.benefits.islandBonusPct` | Integer (nullable) | 섬 GP 생산 보너스 (%) | `season_passes.island_bonus_pct` |
| `seasonPass.benefits.extraBuilders` | Integer (nullable) | 추가 건설 슬롯 수 | `season_passes.extra_builders` |
| `seasonPass.benefits.taxExemptBonus` | Integer (nullable) | 세금 면제 보너스 영토 수 | `season_passes.tax_exempt_bonus` |

### 비즈니스 규칙
- `is_active=true` AND `expires_at > now()` 조건으로 유효 패스 조회
- Redis `season_pass:{userId}` 캐시 우선 조회 → 미존재 시 DB 조회 후 캐싱
- 만료된 패스는 스케줄러가 `is_active=false` 처리

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
| `seasonEndsAt` | String (ISO 8601) | 시즌 종료 시각 | `seasons.ended_at` |

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

1,000 AP를 소모하여 30일간 시즌 패스를 활성화합니다.

### Request

없음 (Request Body 불필요)

### 비즈니스 규칙
- `wallets.available_ap` 1,000 차감 후 `user_season_passes` INSERT
- 기존 패스 만료 전 재구매 불가 (만료 후 갱신 가능)
- 구매 즉시 혜택 적용 (섬 GP 보너스 +50%, 일꾼 +1, 세금 면제 +2)
- 구매 후 Redis `season_pass:{userId}` 캐시 갱신

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
| `startedAt` | String (ISO 8601) | 패스 시작 시각 | `user_season_passes.started_at` |
| `expiresAt` | String (ISO 8601) | 패스 만료 시각 (`startedAt + 30일`) | `user_season_passes.expires_at` |
| `costAP` | Integer | 차감된 AP | `season_passes.cost_ap` |
| `remainingAP` | Integer | 구매 후 잔여 AP | `wallets.available_ap` |
| `benefits.islandBonusPct` | Integer | 섬 GP 생산 보너스 (%) | `season_passes.island_bonus_pct` |
| `benefits.extraBuilders` | Integer | 추가 건설 슬롯 수 | `season_passes.extra_builders` |
| `benefits.taxExemptBonus` | Integer | 세금 면제 보너스 영토 수 | `season_passes.tax_exempt_bonus` |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 402 | `INSUFFICIENT_AP` | AP 잔액 부족 (1,000 AP 필요) |
| 409 | `SEASON_PASS_ACTIVE` | 이미 활성 시즌 패스 보유 중 |

### 남은 작업
- ⬜ `SeasonPassService.purchase()` 구현
- ⬜ Redis `season_pass:{userId}` 캐시 생성 (TTL 30분)
