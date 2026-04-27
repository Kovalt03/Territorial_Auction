# Guild API

> 구현 상태: 🔲 미구현

---

## 길드 생성

**POST** `/api/v1/guilds`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Request

```json
{
  "name": "정복자들",
  "description": "영토 정복을 목표로 하는 길드입니다.",
  "emblem": "https://cdn.example.com/emblems/001.png"
}
```

| field | 타입 | 필수 | 설명 |
|---|---|---|---|
| `name` | String | Y | 길드명 (2~20자, 유니크) |
| `description` | String | N | 길드 소개 (최대 200자) |
| `emblem` | String | N | 엠블럼 이미지 URL |

### 비즈니스 규칙
- 1인 1길드 제한 (이미 길드 소속이면 생성 불가)
- 생성 시 `guild_members`에 role=`MASTER`, status=`ACTIVE`로 즉시 등록

### Response (201 Created)

```json
{
  "status": 201,
  "message": "Created",
  "data": {
    "guildId": 1,
    "name": "정복자들",
    "masterId": 5,
    "masterNickname": "테스트유저",
    "memberCount": 1,
    "createdAt": "2026-04-27T12:00:00Z"
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 400 | INVALID_GUILD_NAME | 길드명 형식 오류 (길이, 특수문자 등) |
| 409 | GUILD_NAME_DUPLICATED | 이미 존재하는 길드명 |
| 409 | ALREADY_IN_GUILD | 이미 길드에 소속된 유저 |

### 남은작업
- 서비스 구현

---

## 길드 목록 조회

**GET** `/api/v1/guilds?page={0}&size={20}&search={검색어}`

- 인증 불필요

### Query Parameters

| parameter | 타입 | 필수 | 설명 |
|---|---|---|---|
| `page` | Integer | N | 페이지 번호 (기본 0) |
| `size` | Integer | N | 페이지 크기 (기본 20) |
| `search` | String | N | 길드명 검색어 |

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "totalCount": 150,
    "page": 0,
    "size": 20,
    "guilds": [
      {
        "guildId": 1,
        "guildName": "정복자들",
        "masterNickname": "테스트유저",
        "memberCount": 12,
        "maxMembers": 30,
        "totalTrophyPoints": 4500,
        "totalTerritories": 8,
        "recruitingStatus": "OPEN"
      }
    ]
  }
}
```

| field | 설명 |
|---|---|
| `recruitingStatus` | `OPEN` (모집 중) / `CLOSED` (모집 마감) |

### 남은작업
- 서비스 구현

---

## 길드 정보 조회

**GET** `/api/v1/guilds/{guildId}`

- 인증 불필요

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "guildId": 1,
    "name": "정복자들",
    "description": "영토 정복을 목표로 하는 길드입니다.",
    "emblem": "https://cdn.example.com/emblems/001.png",
    "master": {
      "userId": 5,
      "nickname": "테스트유저"
    },
    "memberCount": 12,
    "totalTerritoryCount": 8,
    "members": [
      {
        "userId": 5,
        "nickname": "테스트유저",
        "role": "MASTER",
        "territoryCount": 3,
        "joinedAt": "2026-04-01T00:00:00Z"
      },
      {
        "userId": 9,
        "nickname": "용사",
        "role": "OFFICER",
        "territoryCount": 2,
        "joinedAt": "2026-04-05T00:00:00Z"
      }
    ],
    "createdAt": "2026-04-01T00:00:00Z"
  }
}
```

> `members`: status=`ACTIVE`인 멤버만 반환

| role | 설명 |
|---|---|
| `MASTER` | 길드장 |
| `OFFICER` | 부길드장 |
| `MEMBER` | 일반 멤버 |

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | GUILD_NOT_FOUND | 존재하지 않는 길드 |

### 남은작업
- 서비스 구현

---

## 나의 길드 정보 조회

**GET** `/api/v1/guilds/me`

**Authorization**: Bearer `{{accessToken}}` (필수)

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "guildId": 1,
    "guildName": "정복자들",
    "description": "영토 정복을 목표로 하는 길드입니다.",
    "masterNickname": "테스트유저",
    "memberCount": 12,
    "maxMembers": 30,
    "totalTerritories": 8,
    "totalTrophyPoints": 4500,
    "myRole": "MEMBER",
    "joinedAt": "2026-04-10T00:00:00Z"
  }
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | NOT_IN_GUILD | 길드에 소속되지 않은 유저 |

### 남은작업
- 서비스 구현

---

## 길드 가입 신청

**POST** `/api/v1/guilds/{guildId}/join`

**Authorization**: Bearer `{{accessToken}}` (필수)

### 비즈니스 규칙
- `guild_members`에 role=`MEMBER`, status=`PENDING`으로 등록
- 길드장에게 즉시 WebSocket 알림 + `notification_logs` 기록

### Response (202 Accepted)

```json
{
  "status": 202,
  "message": "Accepted",
  "data": null
}
```

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 404 | GUILD_NOT_FOUND | 존재하지 않는 길드 |
| 409 | ALREADY_IN_GUILD | 이미 다른 길드에 소속 |
| 409 | ALREADY_APPLIED | 이미 가입 신청한 길드 |

### 남은작업
- 서비스 구현

---

## 길드 가입 승인

**PATCH** `/api/v1/guilds/{guildId}/members/{userId}/approve`

**Authorization**: Bearer `{{accessToken}}` (필수, 길드장만)

### 비즈니스 규칙
- `PENDING` → `ACTIVE` 상태 전환
- 승인된 유저에게 알림 발송 (WebSocket + `notification_logs`)

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
| 400 | GUILD_FULL | 길드 정원 초과 |
| 403 | NOT_GUILD_MASTER | 길드장 권한 없음 |
| 404 | GUILD_NOT_FOUND | 존재하지 않는 길드 |
| 404 | APPLICATION_NOT_FOUND | 해당 유저의 가입 신청 없음 |

### 남은작업
- 서비스 구현

---

## 길드 가입 신청 목록 조회

**GET** `/api/v1/guilds/{guildId}/applications`

**Authorization**: Bearer `{{accessToken}}` (필수, 길드장만)

해당 길드에 대기 중인 가입 신청 목록을 반환합니다.

### Response (200 OK)

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "guildId": 42,
    "applications": [
      {
        "applicationId": 201,
        "userId": 1055,
        "nickname": "NewWarrior",
        "trophyPoints": 1200,
        "message": "열심히 하겠습니다!",
        "appliedAt": "2026-04-27T15:30:00Z"
      }
    ]
  }
}
```

출처: `guild_members` WHERE `status = PENDING`

### 에러

| HTTP | 에러 코드 | 설명 |
|---|---|---|
| 401 | UNAUTHORIZED | 인증 토큰 없음 또는 만료 |
| 403 | NOT_GUILD_MASTER | 길드장 권한 없음 |
| 404 | GUILD_NOT_FOUND | 존재하지 않는 길드 |

### 남은작업
- 서비스 구현
