# Notification API

> 구현 상태: ✅ 구현 완료

---

## 알림 목록 조회

**GET** `/api/v1/notifications?page={0}&size={20}`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "unreadCount": 3,
    "notifications": [
      {
        "notificationId": 1,
        "type": "OUTBID",
        "message": "테스트영토(2,3)에 상회 입찰이 발생했습니다. 현재가: 2,500 AP",
        "isRead": false,
        "createdAt": "2026-04-27T12:00:00"
      }
    ]
  }
}
```

### 알림 타입

`NotificationLog.NotificationType` — 전체 12종. 발송은 `NotificationService.sendNotification()`이 담당하며 `notification_logs`에 이력을 남기고 `/sub/user/{userId}/notification`으로 배지를 실시간 갱신한다.

| type | 설명 | 발송 시점 |
|---|---|---|
| `OUTBID` | 상회 입찰 — 내 입찰이 넘겨졌을 때 | 입찰 시 이전 최고 입찰자에게 (`AuctionService.placeBid`) |
| `AUCTION_WIN` | 경매 낙찰 성공 | 경매 정산 시 낙찰자에게 (`AuctionLifecycleService.settleAuction`) |
| `AUCTION_LOSE` | 경매 낙찰 실패 | 경매 정산 시 차순위 입찰자 전원에게 (`AuctionLifecycleService.settleAuction`) |
| `SIEGE_ALERT` | 공성전 공격 선언 수신 | 공성 선언 시 방어자에게 (`MilitaryService`) |
| `SIEGE_RESULT` | 공성전 결과 | 공성 정산 시 공격·방어 양측에게 (`SiegeService`) |
| `TAX_CHARGED` | 토지세 정상 납부 | 토지세 정산 성공 시 (`LandTaxService`) |
| `INCOME` | 영토 저장소 가득 참 | 수입 적립으로 저장소가 막 가득 찬 순간 (`TerritoryIncomeService`) |
| `SEASON_PASS_EXPIRING` | 시즌 패스 만료 임박 | 만료 D-3 / D-day 스케줄러 (`SeasonPassScheduler`) |
| `TAX_FAIL_WARNING` | 토지세 납부 실패 경고 | 납부 실패로 유예기간 진입 시 (`LandTaxService`) |
| `TAX_EVICTION` | 토지세 미납 강제 경매 전환 | 유예 만료 후 압류 시 (`LandTaxService`) |
| `ISLAND_EXPANDED` | 섬 확장으로 건물 보관함 이동 | 섬 확장 시 (`BuildingService`) |
| `ADMIN_NOTICE` | 관리자 공지 | 관리자 개별/일괄 발송 (`AdminUserActivityService`) |

출처: `notification_logs`  
`unreadCount`: Redis `notification:unread:{userId}`

---

## 알림 읽음 처리

**PATCH** `/api/v1/notifications/{notificationId}/read`

**Authorization**: Bearer `{{accessToken}}` (필수)

`notification_logs.is_read` → `true` 로 변경  
Redis `notification:unread:{userId}` DECR

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
| 404 | NOTIFICATION_NOT_FOUND | 알림 없음 |
| 403 | NOTIFICATION_FORBIDDEN | 본인 알림 아님 |

---

## 알림 전체 읽음

**PATCH** `/api/v1/notifications/read-all`

**Authorization**: Bearer `{{accessToken}}` (필수)

`notification_logs`에서 `is_read=false` → `true` 벌크 UPDATE  
Redis `notification:unread:{userId}` → 0으로 SET

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": null
}
```
