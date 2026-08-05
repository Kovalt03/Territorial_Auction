# WebSocket — Notification

> 구현 상태: ✅ 구현 완료

---

## 채널

| Destination | 인증 | 설명 |
|---|---|---|
| `/sub/user/{userId}/notification` | 필수 | 개인 알림 수신 |
| `/sub/user/{userId}/siege-alert` | 필수 | 공성전 공격 선언 알림 |
| `/sub/user/{userId}/auction-result` | 필수 | 경매 낙찰/실패 알림 |

---

## 메시지 형식

### 개인 알림

**Destination**: `/sub/user/{userId}/notification`

```json
{
  "notificationId": 42,
  "type": "OUTBID",
  "message": "테스트영토(2,3)에 상회 입찰이 발생했습니다. 현재가: 2,500 AP",
  "createdAt": "2026-05-08T12:01:00"
}
```

모든 개인 알림(`NotificationType` 12종)은 `NotificationService.sendNotification()`이 이 채널로 발행한다. 전체 타입·설명은 [Notification API](../notification.md#알림-타입) 참조.

| `type` | 설명 | 발행 위치 |
|---|---|---|
| `OUTBID` | 내 입찰이 상회 입찰로 넘겨짐 | `AuctionService.placeBid()` |
| `AUCTION_WIN` | 경매 낙찰 성공 (낙찰자) | `AuctionLifecycleService.settleAuction()` |
| `AUCTION_LOSE` | 경매 낙찰 실패 (차순위 입찰자 전원) | `AuctionLifecycleService.settleAuction()` |
| `SIEGE_ALERT` | 공성전 공격 선언 수신 (방어자) | `MilitaryService` |
| `SIEGE_RESULT` | 공성전 결과 (공격·방어 양측) | `SiegeService` |
| `TAX_CHARGED` | 토지세 정상 납부 | `LandTaxService` |
| `INCOME` | 수입 적립으로 영토 저장소가 가득 참 | `TerritoryIncomeService` |
| `SEASON_PASS_EXPIRING` | 시즌 패스 만료 임박 (D-3 / D-day) | `SeasonPassScheduler` |
| `TAX_FAIL_WARNING` | 토지세 납부 실패 경고 (유예 진입) | `LandTaxService` |
| `TAX_EVICTION` | 토지세 미납 강제 경매 전환 | `LandTaxService` |
| `ISLAND_EXPANDED` | 섬 확장으로 건물 보관함 이동 | `BuildingService` |
| `ADMIN_NOTICE` | 관리자 공지 | `AdminUserActivityService` |

---

### 공성전 공격 선언 알림

**Destination**: `/sub/user/{userId}/siege-alert`

내 영토에 공성전이 선언되면 방어자에게 전송.

```json
{
  "siegeId": 1,
  "attackerNickname": "공격왕",
  "targetTerritoryId": 10,
  "attackZone": 2,
  "resolveAt": "2026-05-08T15:30:00"
}
```

---

### 경매 결과 알림

**Destination**: `/sub/user/{userId}/auction-result`

경매 종료 시 낙찰자 및 낙찰 실패 입찰자 각각에게 전송.

```json
{
  "auctionId": 1,
  "type": "AUCTION_WIN",
  "territoryId": 10,
  "finalPrice": 3000
}
```
