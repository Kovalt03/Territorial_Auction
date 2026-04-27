# Ranking API

> 구현 상태: 🔲 미구현

---

## 공통 응답 형식

모든 랭킹 API는 아래 구조를 공유합니다.

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "type": "TERRITORY",
    "updatedAt": "2026-04-27T12:00:00Z",
    "myRank": 5,
    "rankings": [
      {
        "rank": 1,
        "userId": 3,
        "nickname": "영토왕",
        "value": 15
      }
    ]
  }
}
```

> `myRank`: 비로그인 시 null

---

## 영토 점유 랭킹

**GET** `/api/v1/rankings/territory`

- 인증 선택

현재 점유 중인 영토 수 기준 상위 유저 랭킹

| field | 설명 |
|---|---|
| `type` | `TERRITORY` 고정 |
| `value` | 현재 점유 영토 수 |

갱신: 전투·경매 발생 시 즉시 (`territories.owner_id` 집계)  
출처: Redis `ranking:territory` Sorted Set

### 남은작업
- 서비스 구현
- Redis Sorted Set 연동

---

## 트로피 랭킹

**GET** `/api/v1/rankings/trophy`

- 인증 선택

현재 트로피 점수 기준 상위 유저 랭킹

| field | 설명 |
|---|---|
| `type` | `TROPHY` 고정 |
| `value` | 현재 트로피 점수 |
| `league` | BRONZE / SILVER / GOLD / DIAMOND / CHAMPION |

갱신: 전투 결과마다  
출처: Redis `ranking:trophy` Sorted Set

### 남은작업
- 서비스 구현
- Redis Sorted Set 연동

---

## GP 자산 랭킹

**GET** `/api/v1/rankings/wealth`

- 인증 선택

`available_ap + available_gp + global_vaults.stored_gp` 합산 기준

| field | 설명 |
|---|---|
| `type` | `WEALTH` 고정 |
| `value` | 총 자산 합산값 |

갱신: 실시간 이벤트 기반 (경매 낙찰, 토지세, GP 생산 시)  
출처: Redis `ranking:wealth` Sorted Set

### 남은작업
- 서비스 구현
- Redis Sorted Set 연동

---

## 생산력 랭킹

**GET** `/api/v1/rankings/production`

- 인증 선택

누적 GP 생산량 기준 상위 유저 랭킹

| field | 설명 |
|---|---|
| `type` | `PRODUCTION` 고정 |
| `value` | 누적 GP 생산량 |

갱신: 주기적 배치 (`territory_production_logs` 누적 합산)

### 남은작업
- 서비스 구현
- Redis Sorted Set 연동

---

## 공성 승리 랭킹

**GET** `/api/v1/rankings/siege`

- 인증 선택

공성전 승리 횟수 기준 상위 유저 랭킹

| field | 설명 |
|---|---|
| `type` | `SIEGE` 고정 |
| `value` | 공성전 승리 횟수 |

출처: `siege_results.is_attacker_win = true` 집계

### 남은작업
- 서비스 구현
- Redis Sorted Set 연동

---

## 길드 랭킹

**GET** `/api/v1/rankings/guild?page={0}&size={50}`

- 인증 선택

소속 길드 멤버 전체의 점유 영토 수 합산 기준 길드 랭킹

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "type": "GUILD",
    "updatedAt": "2026-04-27T12:00:00Z",
    "myGuildRank": 5,
    "rankings": [
      {
        "rank": 1,
        "guildId": 2,
        "guildName": "픽셀제국",
        "masterNickname": "황제",
        "memberCount": 12,
        "totalTerritoryCount": 45
      }
    ]
  }
}
```

| field | 설명 |
|---|---|
| `type` | `GUILD` 고정 |
| `myGuildRank` | 로그인 유저 소속 길드 순위 (미소속 또는 비로그인 시 null) |
| `totalTerritoryCount` | 길드원 영토 수 합산 |

출처: Redis `ranking:guild` Sorted Set  
관련 DB: `guilds`, `guild_members`, `territories`

### 남은작업
- 서비스 구현
- Redis Sorted Set 연동
