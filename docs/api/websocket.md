# WebSocket API

> 구현 상태: 🔲 미구현 (TODO 항목은 하단 TODO 섹션 참고)

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

| Destination | 설명 | 인증 | 구현 | 관련 TODO |
|---|---|---|---|---|
| `/pub/chat/{roomId}` | 채팅 메시지 전송 | 필수 | ⬜ | - |
| `/pub/auction/{auctionId}/bid` | 실시간 입찰 (REST 대체 가능) | 필수 | ⬜ | TODO 5번 |

### 서버 → 클라이언트 (구독)

#### 공개 채널 (인증 불필요)

| Destination | 설명 | 발행 시점 | 구현 | 관련 TODO |
|---|---|---|---|---|
| `/sub/map/update` | 맵 전체 영토 상태 변경 | 경매 낙찰, 공성전 종료 시 | ⬜ | TODO 4번 |
| `/sub/auction/{auctionId}` | 특정 경매 실시간 입찰 현황 | 새 입찰 발생 시 | ⬜ | TODO 2번 |
| `/sub/chat/{roomId}` | 대륙 채팅방 메시지 수신 | 메시지 전송 시 | ⬜ | - |

#### 개인 채널 (인증 필수)

| Destination | 설명 | 발행 시점 | 구현 | 관련 TODO |
|---|---|---|---|---|
| `/sub/user/{userId}/notification` | 개인 알림 수신 | 각종 이벤트 발생 시 | ⬜ | TODO 3번 |
| `/sub/user/{userId}/siege-alert` | 공성전 공격 선언 알림 | 내 영토 공격 선언 시 | ⬜ | - |
| `/sub/user/{userId}/auction-result` | 경매 낙찰/실패 알림 | 경매 종료 시 | ⬜ | TODO 3번 |

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

---

## TODO

> 모노리스 환경에서 구현 가능. Spring WebSocket + STOMP 의존성 추가만으로 동작.
> Redis Pub/Sub 연동은 멀티 인스턴스 스케일아웃 시점에 추가.

### 1. 기반 설정

- ⬜ `spring-boot-starter-websocket` 의존성 추가 (`build.gradle`)
- ⬜ `WebSocketConfig` 구현
  - STOMP 엔드포인트 등록: `/ws` (SockJS fallback 포함)
  - 메시지 브로커 설정: `/sub` (구독), `/pub` (발행)
- ⬜ `StompChannelInterceptor` 구현 — CONNECT 프레임에서 JWT 검증 후 `Principal` 주입
  - 토큰 없는 연결은 허용하되 `Principal = null` 처리 (공개 채널 구독 가능)
  - 인증 필요 채널(`/sub/user/**`) 구독 시도 시 에러 프레임 응답

### 2. 입찰 발생 시 실시간 브로드캐스트

발생 위치: `AuctionService.placeBid()` — 입찰 성공 직후

- ⬜ `SimpMessagingTemplate.convertAndSend("/sub/auction/{auctionId}", payload)` 호출
- ⬜ 페이로드 구조 (위 **경매 입찰 이벤트** 메시지 형식 참고)
  ```json
  {
    "auctionId": 1,
    "currentPrice": 2500,
    "bidderId": 9,
    "bidderNickname": "입찰왕",
    "bidAt": "2026-04-27T12:01:00Z"
  }
  ```
- ⬜ Anti-sniping으로 `endAt` 이 연장된 경우 페이로드에 `endAt` 포함

### 3. 경매 종료 시 개인 알림 (낙찰/실패)

발생 위치: `AuctionLifecycleService.settleAuction()` — 정산 완료 직후

- ⬜ 낙찰자에게 `AUCTION_WIN` 알림 전송
  ```
  SimpMessagingTemplate.convertAndSend("/sub/user/{winnerId}/notification", ...)
  ```
- ⬜ 낙찰 실패한 입찰자 목록 조회 후 각각 `AUCTION_LOSE` 알림 전송
  - `AuctionBidRepository`에서 해당 경매의 낙찰자 외 입찰자 목록 조회 필요
- ⬜ 알림 페이로드 구조 (위 **개인 알림** 메시지 형식 참고)

### 4. 영토 상태 변경 시 맵 업데이트 브로드캐스트

발생 위치: `AuctionLifecycleService.settleAuction()` — 낙찰/무낙찰 처리 직후

- ⬜ `SimpMessagingTemplate.convertAndSend("/sub/map/update", payload)` 호출
- ⬜ 낙찰 시 `eventType: TERRITORY_OCCUPIED` 페이로드
- ⬜ 무낙찰 시 `eventType: TERRITORY_RELEASED` 페이로드

### 5. (선택) WebSocket 경로로 입찰 처리

- ⬜ `@MessageMapping("/auction/{auctionId}/bid")` 핸들러 구현
  - REST `POST /api/v1/auctions/{auctionId}/bids` 와 동일한 `AuctionService.placeBid()` 호출
  - REST와 WebSocket 두 경로 모두 지원하거나, 추후 REST 제거

### 6. 스케일아웃 시점 추가 작업 (당장 불필요)

- ⬜ Redis Pub/Sub 메시지 브로커 연동 (`RedisMessageBrokerConfigurer`)
  - 멀티 인스턴스 환경에서 서버 A에서 발행 → Redis → 서버 B에서 클라이언트로 전달
  - Redis 채널: `ws:auction:{auctionId}`, `ws:user:{userId}`, `ws:map`
