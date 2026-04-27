# Land Tax API

> 구현 상태: 🔲 미구현

---

## 토지세 현황 조회

**GET** `/api/v1/land-tax/status`

**Authorization**: Bearer `{{accessToken}}` (필수)

사용 페이지: 마이페이지

현재 보유 영토 수에 따른 일일 토지세 예상액, 면제 구간, 다음 납부일을 반환합니다.

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "territoryCount": 8,
    "taxBreakdown": {
      "exemptCount": 3,
      "taxableCount": 5,
      "dailyGP": 250
    },
    "seasonPassExemptBonus": 2,
    "effectiveExemptCount": 5,
    "finalDailyGP": 150,
    "nextChargeAt": "2026-04-28T00:00:00Z"
  }
}
```

| field | 설명 |
|---|---|
| `territoryCount` | 현재 보유 영토 수 (Home Island 제외) |
| `taxBreakdown.exemptCount` | 기본 면제 구간 내 영토 수 (최대 3) |
| `taxBreakdown.taxableCount` | 과세 영토 수 |
| `taxBreakdown.dailyGP` | 시즌 패스 보너스 전 일일 세금 |
| `seasonPassExemptBonus` | 시즌 패스 추가 면제 구간 (보유 시 2, 미보유 시 0) |
| `effectiveExemptCount` | 실제 면제 영토 수 (기본 + 시즌 패스 보너스) |
| `finalDailyGP` | 최종 일일 토지세 (GP) |
| `nextChargeAt` | 다음 세금 납부 시각 (매일 자정 KST) |

### 토지세 누진 구조

| 보유 영토 수 | 영토 1개당 일일 세율 |
|---|---|
| 1~3개 | 면제 |
| 4~6개 | 50 GP/일 |
| 7~10개 | 150 GP/일 |
| 11개 이상 | 400 GP/일 |

> 시즌 패스 보유 시 면제 기준 +2개 (3개 → 5개)

### 징수 규칙

- 매일 자정(KST) 스케줄러 자동 차감
- GP 부족 시: 경고 알림 → 24시간 내 미납 시 최저 등급 영토 강제 경매 전환
- Home Island는 과세 대상 아님

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 인증 실패 |

### 남은작업
- 서비스 구현
- Redis `land_tax:expected:{userId}` 캐시 연동 (TTL: 자정까지)
