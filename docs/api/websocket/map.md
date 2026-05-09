# WebSocket — Map

> 구현 상태: ⬜ 미구현

---

## 채널

| 방향 | Destination | 인증 | 설명 |
|---|---|---|---|
| 서버 → 클라이언트 | `/sub/map/update` | 불필요 | 영토 상태 변경 브로드캐스트 |

---

## 메시지 형식

**Destination**: `/sub/map/update`

경매 낙찰 또는 공성전 종료로 영토 점유자가 변경될 때 전송.

```json
{
  "eventType": "TERRITORY_OCCUPIED",
  "territoryId": 10,
  "newOwnerId": 5,
  "newOwnerNickname": "픽셀전사",
  "colorHex": "#FF5733",
  "updatedAt": "2026-05-08T15:30:00"
}
```

| `eventType` | 설명 |
|---|---|
| `TERRITORY_OCCUPIED` | 영토 점유자 변경 (낙찰 / 공성 승리) |
| `TERRITORY_RELEASED` | 영토 반환 (무낙찰로 경매 재전환) |
| `TERRITORY_INVINCIBLE` | 무적 상태 전환 |

---

## 발행 위치

`AuctionLifecycleService.settleAuction()` — 낙찰/무낙찰 처리 직후 `SimpMessagingTemplate.convertAndSend()` 호출.
