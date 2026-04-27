# WebSocket API

> 구현 상태: 🔲 미구현

실시간 이벤트 전달을 위해 STOMP over WebSocket을 사용합니다.

---

## 연결

### Endpoint

```
ws://localhost:8080/ws
```

환경변수: `{{wsUrl}}`

### 연결 방식

STOMP 프로토콜 사용 (SockJS fallback 지원)

```javascript
const socket = new SockJS('/ws');
const stompClient = Stomp.over(socket);
stompClient.connect({ Authorization: `Bearer ${accessToken}` }, callback);
```

### 인증

STOMP CONNECT 헤더에 JWT Bearer 토큰 포함

```
CONNECT
Authorization: Bearer {accessToken}
```

- 토큰 없이 연결 시 채팅 등 인증 필요 채널 구독 불가
- 비인증 연결은 공개 구독 채널(맵 업데이트 등)만 수신 가능

---

## Pub/Sub 채널

### 클라이언트 → 서버 (발행)

| Destination | 설명 | 인증 |
|---|---|---|
| `/pub/chat/{roomId}` | 채팅 메시지 전송 | 필수 |
| `/pub/auction/{auctionId}/bid` | 실시간 입찰 (REST 대체 가능) | 필수 |

### 서버 → 클라이언트 (구독)

#### 공개 채널 (인증 불필요)

| Destination | 설명 | 발행 시점 |
|---|---|---|
| `/sub/map/update` | 맵 전체 영토 상태 변경 | 경매 낙찰, 공성전 종료 시 |
| `/sub/auction/{auctionId}` | 특정 경매 실시간 입찰 현황 | 새 입찰 발생 시 |
| `/sub/chat/{roomId}` | 대륙 채팅방 메시지 수신 | 메시지 전송 시 |

#### 개인 채널 (인증 필수)

| Destination | 설명 | 발행 시점 |
|---|---|---|
| `/sub/user/{userId}/notification` | 개인 알림 수신 | 각종 이벤트 발생 시 |
| `/sub/user/{userId}/siege-alert` | 공성전 공격 선언 알림 | 내 영토 공격 선언 시 |
| `/sub/user/{userId}/auction-result` | 경매 낙찰/실패 알림 | 경매 종료 시 |

---

## 메시지 형식

### 채팅 메시지 발행

**Destination**: `/pub/chat/{roomId}`

```json
{
  "content": "안녕하세요!"
}
```

### 채팅 메시지 수신

**Destination**: `/sub/chat/{roomId}`

```json
{
  "messageId": 1,
  "roomId": 3,
  "senderId": 5,
  "senderNickname": "테스트유저",
  "content": "안녕하세요!",
  "createdAt": "2026-04-27T12:00:00Z"
}
```

---

### 경매 입찰 이벤트

**Destination**: `/sub/auction/{auctionId}`

새 입찰 발생 시 해당 경매를 구독 중인 모든 클라이언트에 전송

```json
{
  "auctionId": 1,
  "currentPrice": 2500,
  "bidderId": 9,
  "bidderNickname": "입찰왕",
  "bidAt": "2026-04-27T12:01:00Z"
}
```

---

### 맵 업데이트 이벤트

**Destination**: `/sub/map/update`

영토 점유자 변경 시 전송 (경매 낙찰, 공성전 결과)

```json
{
  "eventType": "TERRITORY_OCCUPIED",
  "territoryId": 10,
  "newOwnerId": 5,
  "newOwnerNickname": "테스트유저",
  "colorHex": "#FF5733",
  "updatedAt": "2026-04-27T15:30:00Z"
}
```

| `eventType` | 설명 |
|---|---|
| `TERRITORY_OCCUPIED` | 영토 점유자 변경 (낙찰/공성 승리) |
| `TERRITORY_RELEASED` | 영토 반환 (경매 재전환) |
| `TERRITORY_INVINCIBLE` | 무적 상태 전환 |

---

### 공성전 선언 알림

**Destination**: `/sub/user/{userId}/siege-alert`

내 영토에 공성전이 선언되면 방어자에게 전송

```json
{
  "siegeId": 1,
  "attackerNickname": "공격왕",
  "targetTerritoryId": 10,
  "attackZone": 2,
  "resolveAt": "2026-04-27T15:30:00Z"
}
```

---

### 개인 알림

**Destination**: `/sub/user/{userId}/notification`

```json
{
  "notificationId": 42,
  "type": "OUTBID",
  "message": "테스트영토(2,3)에 상회 입찰이 발생했습니다. 현재가: 2,500 AP",
  "createdAt": "2026-04-27T12:01:00Z"
}
```

| `type` | 설명 |
|---|---|
| `OUTBID` | 상회 입찰 — 내 입찰이 넘겨짐 |
| `AUCTION_WIN` | 경매 낙찰 성공 |
| `AUCTION_LOSE` | 경매 낙찰 실패 |
| `SIEGE_ALERT` | 공성전 공격 선언 수신 |
| `SIEGE_RESULT` | 공성전 결과 |
| `TAX_CHARGED` | 토지세 차감 |
| `INCOME` | 영토 생산 정산 |
| `GUILD_JOIN_REQUEST` | 길드 가입 신청 (길드장 수신) |
| `GUILD_JOIN_APPROVED` | 길드 가입 승인 (신청자 수신) |

---

## 스케일링

멀티 서버 환경에서 Redis Pub/Sub을 브로커로 사용하여 메시지 라우팅

```
클라이언트 → 서버 A → Redis Pub/Sub → 서버 B → 클라이언트
```

Redis 채널 네이밍: `ws:chat:{roomId}`, `ws:user:{userId}`, `ws:auction:{auctionId}`, `ws:map`

### 남은작업
- STOMP 핸들러 구현
- Redis Pub/Sub 메시지 브로커 연동
- JWT 인증 인터셉터 구현
- 경매/공성전 이벤트 발행 로직 연동
