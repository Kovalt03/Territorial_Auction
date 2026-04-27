# Global Vault API

> Notion 원본: https://www.notion.so/33c2efa4278d813a9cd8ddedef8e7ed7  
> 구현 상태: 🔲 미구현

---

## 글로벌 금고 조회

**GET** `/api/v1/global-vault`

**Authorization**: Bearer `{{accessToken}}` (선택 — 로그인 시 `myStoredGP` 포함)

사용 페이지: 메인 화면 (금고 현황 + 기부 랭킹 위젯)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "totalGP": 1250000,
    "myStoredGP": 500,
    "topDonors": [
      { "rank": 1, "userId": 5, "nickname": "기부왕", "storedGP": 12000 },
      { "rank": 2, "userId": 9, "nickname": "선한전사", "storedGP": 8500 }
    ],
    "lastUpdatedAt": "2026-04-08T12:00:00Z"
  }
}
```

| field | 설명 | 출처 |
|---|---|---|
| `totalGP` | 누적 글로벌 금고 GP | Redis `global_vault:total` (실시간) |
| `myStoredGP` | 내가 기부한 GP (로그인 시만) | `global_vaults.stored_gp` |
| `topDonors` | 기부 순위 상위 5명 | `global_vaults.stored_gp` 기준 DB 직접 조회 |
| `lastUpdatedAt` | 마지막 업데이트 시각 | Redis 시각 또는 스케줄러 기록 |

> 비로그인 시 `myStoredGP` 필드 없음

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 500 | INTERNAL_ERROR | 서버 오류 |

### 남은작업
- 서비스 구현
- Redis `global_vault:total` 연동

---

## 글로벌 금고 기부

**POST** `/api/v1/global-vault/donate`

**Authorization**: Bearer `{{accessToken}}` (필수)

유저의 GP를 글로벌 금고에 기부합니다.

### Request

```json
{
  "amount": 5000
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `amount` | Long | Y | 기부할 GP 수량 (최소 100) |

### 비즈니스 규칙
- 유저 `available_gp` 차감
- Redis `global_vault:total` INCR (원자적 누적)
- `global_vaults.stored_gp` 업데이트
- `global_vault_logs`에 기부 이력 저장

> 기부금은 글로벌 금고 목표 달성 시 전체 유저에게 비율 분배됩니다.

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "donatedAmount": 5000,
    "userGoldAfter": 12000,
    "globalVaultTotal": 2450000,
    "myTotalDonated": 8500,
    "message": "글로벌 금고에 5000 GP를 기부했습니다."
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | INSUFFICIENT_GP | 보유 GP 부족 |
| 400 | DONATION_AMOUNT_TOO_LOW | 최소 금액 미달 (100 GP) |
| 401 | UNAUTHORIZED | 인증 토큰 없음 또는 만료 |

### 남은작업
- 서비스 구현
- Redis `global_vault:total` INCR 연동
