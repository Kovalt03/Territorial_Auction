# Auction API

> 구현 상태: 🔲 미구현

---

## 경매 목록 조회

**GET** `/api/v1/auctions?page={0}&size={20}&continentId={1}&status={BIDDING}`

- 인증 불필요

### Query Parameters

| param | 타입 | 필수 | 설명 |
|---|---|---|---|
| `page` | Integer | N | 페이지 번호 (기본 0) |
| `size` | Integer | N | 페이지 크기 (기본 20) |
| `continentId` | Long | N | 대륙 필터 |
| `status` | String | N | BIDDING / IDLE |

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "totalCount": 100,
    "page": 0,
    "size": 20,
    "auctions": [
      {
        "auctionId": 1,
        "territoryId": 5,
        "coordX": 2,
        "coordY": 3,
        "continentName": "북부 대륙",
        "grade": "A",
        "currentPrice": 2000,
        "currentBidderNickname": "입찰왕",
        "endAt": "2026-04-28T12:00:00Z",
        "status": "BIDDING"
      }
    ]
  }
}
```

### 남은작업
- 서비스 구현

---

## 경매 상세 조회

**GET** `/api/v1/auctions/{auctionId}`

- 인증 불필요

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "auctionId": 1,
    "territoryId": 5,
    "coordX": 2,
    "coordY": 3,
    "grade": "A",
    "currentPrice": 2000,
    "currentBidderNickname": "입찰왕",
    "startAt": "2026-04-27T12:00:00Z",
    "endAt": "2026-04-28T12:00:00Z",
    "recentBids": [
      {
        "bidderNickname": "입찰왕",
        "price": 2000,
        "bidAt": "2026-04-27T15:00:00Z"
      }
    ]
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | AUCTION_NOT_FOUND | 존재하지 않는 경매 |

### 남은작업
- 서비스 구현
- Redis 캐시 (`auction:bid:{auctionId}`)

---

## 입찰하기

**POST** `/api/v1/auctions/{auctionId}/bids`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Request

```json
{
  "bidAmount": 2100
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `bidAmount` | Integer | Y | 입찰 금액 |

### 입찰 검증 규칙
- `bidAmount >= currentPrice * 1.05` AND `bidAmount >= currentPrice + 10` 동시 만족
- 현재 최고 입찰자 본인은 재입찰 불가
- 입찰 성공 시 `available_ap` → `locked_ap` 이동
- 기존 최고 입찰자는 `locked_ap` → `available_ap` 자동 환불

### Anti-Sniping
- 경매 종료 1분 전 입찰 시 `end_at` 30초 연장
- `max_extend_until` 초과 불가

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "auctionId": 1,
    "newPrice": 2100,
    "endAt": "2026-04-28T12:00:30Z"
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | AUCTION_NOT_FOUND | 존재하지 않는 경매 |
| 400 | BID_AMOUNT_TOO_LOW | 입찰 금액 부족 |
| 400 | ALREADY_HIGHEST_BIDDER | 이미 최고 입찰자 |
| 400 | INSUFFICIENT_AP | AP 잔액 부족 |
| 400 | AUCTION_ENDED | 이미 종료된 경매 |

### 남은작업
- 서비스 구현
- Redis 분산락 (`auction:lock:{auctionId}`)
- AP 락/환불 원자적 처리

---

## 내 입찰 내역 조회

**GET** `/api/v1/auctions/my-bids?page={0}&size={20}`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "totalCount": 12,
    "page": 0,
    "size": 20,
    "bids": [
      {
        "auctionId": 1,
        "territoryId": 5,
        "coordX": 2,
        "coordY": 3,
        "myBidAmount": 2100,
        "currentPrice": 2500,
        "isHighestBidder": false,
        "endAt": "2026-04-28T12:00:00Z",
        "status": "BIDDING"
      }
    ]
  }
}
```

출처: `auction_bids` + `auction_histories`

### 남은작업
- 서비스 구현
