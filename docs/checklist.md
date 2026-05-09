# 구현 체크리스트

> 마지막 갱신: 2026-05-08  
> 기준 브랜치: `dev`

범례: ✅ 완료 · 🔄 일부 완료 · ⬜ 미구현

---

## REST API

### Auth
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 회원가입 | `POST /api/v1/auth/signup` | |
| ✅ | 로그인 | `POST /api/v1/auth/login` | |
| ✅ | 로그아웃 | `POST /api/v1/auth/logout` | |
| ✅ | AccessToken 갱신 | `POST /api/v1/auth/refresh` | |
| ✅ | 사용자명 중복 확인 | `GET /api/v1/auth/check/username` | |
| ✅ | 이메일 중복 확인 | `GET /api/v1/auth/check/email` | |
| ✅ | 닉네임 중복 확인 | `GET /api/v1/auth/check/nickname` | |
| ⬜ | 탈퇴 시 JWT 무효화 | — | Redis 블랙리스트 등록 필요 |

---

### User
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 유저 프로필 조회 | `GET /api/v1/users/{userId}` | |
| 🔄 | 내 프로필 조회 | `GET /api/v1/users/me` | 군사 카운트·무적 상태 등 미구현 |
| 🔄 | 회원 탈퇴 | `DELETE /api/v1/users/me` | JWT 무효화 미구현 |
| ✅ | 알림 설정 조회 | `GET /api/v1/users/me/settings` | |
| ✅ | 알림 수신 설정 변경 | `PATCH /api/v1/users/me/settings` | |
| 🔄 | GP/AP 잔액 조회 | `GET /api/v1/users/me/wallet` | `lockedAP` 미완성 |
| 🔄 | 나의 영토 목록 조회 | `GET /api/v1/users/me/territories` | 점유 시각·무적 상태 미구현 |
| 🔄 | 닉네임 변경 | `PATCH /api/v1/users/me/nickname` | |
| ✅ | 비밀번호 변경 | `PATCH /api/v1/users/me/password` | |
| 🔄 | AP 충전 | `POST /api/v1/users/me/ap/charge` | PG 연동 미구현 (더미 처리 중) |

---

### Map
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 그리드 맵 조회 | `GET /api/v1/map` | |
| ✅ | 영토 상세 조회 | `GET /api/v1/map/territories/{territoryId}` | |
| ✅ | 영토 색상 변경 | `PATCH /api/v1/map/territories/{territoryId}/color` | |
| ✅ | 대륙 목록 조회 | `GET /api/v1/map/continents` | |
| ✅ | 대륙 상세 조회 | `GET /api/v1/map/continents/{continentId}` | |

---

### Auction
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 경매 목록 조회 | `GET /api/v1/auctions` | |
| ✅ | 경매 상세 조회 | `GET /api/v1/auctions/{auctionId}` | ⬜ Redis 캐시 미구현 |
| ✅ | 입찰하기 | `POST /api/v1/auctions/{auctionId}/bids` | ⬜ Redis 분산락 미구현 |
| ✅ | 가격 변동 그래프 데이터 | `GET /api/v1/auctions/{auctionId}/bids` | |
| ✅ | 내 입찰 내역 조회 | `GET /api/v1/auctions/my-bids` | |
| ✅ | 영토 경매 이력 조회 | `GET /api/v1/auctions/territories/{territoryId}` | |
| ⬜ | 입찰 시 WebSocket 브로드캐스트 | — | STOMP 구현 선행 필요 |

---

### Building
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 영토 건물 목록 조회 | `GET /api/v1/map/territories/{territoryId}/buildings` | |
| ✅ | 영토 건물 배치 | `POST /api/v1/map/territories/{territoryId}/buildings` | |
| ✅ | 건물 업그레이드 | `POST /api/v1/buildings/{buildingId}/upgrade` | |
| ✅ | 건물 수리 | `POST /api/v1/buildings/{buildingId}/repair` | |
| ✅ | 건물 이동 | `PATCH /api/v1/buildings/{buildingId}/move` | |
| ✅ | 건물 보관 | `POST /api/v1/buildings/{buildingId}/store` | |
| ✅ | 섬 정보 조회 | `GET /api/v1/island` | |
| ✅ | 섬 건물 목록 조회 | `GET /api/v1/island/buildings` | |
| 🔄 | 섬 건물 배치 | `POST /api/v1/island/buildings` | ⬜ 일꾼 슬롯 소모 미구현 (시즌 패스 연동) |
| ✅ | 보관함 목록 조회 | `GET /api/v1/inventory` | |
| ✅ | 보관함 건물 배치 | `POST /api/v1/inventory/{inventoryId}/place` | |

---

### Global Vault
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 글로벌 금고 조회 | `GET /api/v1/global-vault` | |
| ✅ | 자원 이전 | `POST /api/v1/global-vault/transfer` | |

---

### Item / Payment
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 아이템 목록 조회 | `GET /api/v1/items` | |
| ✅ | 아이템 구매 | `POST /api/v1/items/purchase` | |
| 🔄 | 아이템 사용 | `POST /api/v1/items/use` | ⬜ 공격권 — 공성전 도메인 연동 필요 |
| ✅ | 보유 아이템 목록 조회 | `GET /api/v1/items/inventory` | |

---

### Land Tax
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 토지세 현황 조회 | `GET /api/v1/land-tax/status` | |
| ✅ | 납세 내역 조회 | `GET /api/v1/land-tax/logs` | |
| ⬜ | 세금 배치 스케줄러 | — | 매일 자정 차감, GP 부족 처리, 강제 경매 전환 |
| ⬜ | Redis 캐시 연동 | — | `land_tax:expected:{userId}` (TTL: 자정까지) |

---

### Season Pass
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 내 시즌 패스 상태 조회 | `GET /api/v1/season-pass/me` | Redis 캐시 완료 |
| 🔄 | 시즌 패스 현황 조회 | `GET /api/v1/season-pass` | ⬜ XP 적립 로직 미연동 |
| ✅ | 시즌 패스 구매 | `POST /api/v1/season-pass/purchase` | Redis 캐시 완료 |
| ⬜ | 만료 알림 스케줄러 | — | 만료 3일 전·당일 알림 발송 |
| ⬜ | DB 시드 데이터 | — | `season_pass_level_rewards` 삽입 |

---

### Guild
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 길드 생성 | `POST /api/v1/guilds` | |
| ✅ | 길드 목록 조회 | `GET /api/v1/guilds` | |
| ✅ | 길드 정보 조회 | `GET /api/v1/guilds/{guildId}` | |
| ✅ | 나의 길드 정보 조회 | `GET /api/v1/guilds/me` | |
| ✅ | 길드 정보 수정 | `PATCH /api/v1/guilds/{guildId}` | |
| ✅ | 길드 가입 신청 | `POST /api/v1/guilds/{guildId}/join` | |
| ✅ | 가입 신청 취소 | `DELETE /api/v1/guilds/{guildId}/join` | |
| ✅ | 길드장 이전 | `PATCH /api/v1/guilds/{guildId}/master` | |
| ✅ | 가입 승인 | `PATCH /api/v1/guilds/{guildId}/members/{userId}/approve` | |
| ✅ | 가입 신청 거절 | `PATCH /api/v1/guilds/{guildId}/members/{userId}/reject` | |
| ✅ | 길드 탈퇴 | `DELETE /api/v1/guilds/{guildId}/members/me` | |
| ✅ | 멤버 강제 추방 | `DELETE /api/v1/guilds/{guildId}/members/{userId}` | |
| ✅ | 가입 신청 목록 조회 | `GET /api/v1/guilds/{guildId}/applications` | |

---

### Notification
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ⬜ | 알림 목록 조회 | `GET /api/v1/notifications` | skeleton만 존재 |
| ⬜ | 알림 읽음 처리 | `PATCH /api/v1/notifications/{id}/read` | |
| ⬜ | 전체 읽음 처리 | `PATCH /api/v1/notifications/read-all` | |

---

### Military (공성전)
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ⬜ | 공성전 선언 | `POST /api/v1/siege` | entity·repository는 존재 |
| ⬜ | 공성전 목록 조회 | `GET /api/v1/siege` | |
| ⬜ | 공성전 상세 조회 | `GET /api/v1/siege/{siegeId}` | |
| ⬜ | 유닛 생산 | `POST /api/v1/military/units` | |
| ⬜ | 유닛 목록 조회 | `GET /api/v1/military/units` | |
| ⬜ | 유닛 배치 | `POST /api/v1/military/units/{unitId}/deploy` | |
| ⬜ | 공격권 조회 | `GET /api/v1/military/attack-tokens` | |
| ⬜ | 전투 결과 처리 스케줄러 | — | 공성 카운트다운 후 전투 계산 |
| ⬜ | 공성전 알림 WebSocket | — | `/sub/user/{userId}/siege-alert` |

---

### Ranking
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ⬜ | 영토 왕 랭킹 | `GET /api/v1/rankings/territory` | Redis Sorted Set |
| ⬜ | 자산가 랭킹 | `GET /api/v1/rankings/wealth` | Redis Sorted Set |
| ⬜ | 트로피 랭킹 | `GET /api/v1/rankings/trophy` | Redis Sorted Set |
| ⬜ | 대륙 지배자 랭킹 | `GET /api/v1/rankings/continent` | |
| ⬜ | 생산 효율왕 랭킹 | `GET /api/v1/rankings/production` | |
| ⬜ | 내 랭킹 조회 | `GET /api/v1/rankings/me` | |

---

## WebSocket / STOMP (실시간)

### 기반 설정
| 상태 | 항목 | 비고 |
|---|---|---|
| 🔄 | `WebSocketConfig` | skeleton 존재, prefix `/pub`·`/sub` 변경 필요 |
| ⬜ | `StompChannelInterceptor` | CONNECT 단계 JWT 검증 |

### 채팅
| 상태 | 채널 | 설명 |
|---|---|---|
| ⬜ | `/pub/chat/{roomId}` | 클라이언트 메시지 발행 |
| ⬜ | `/sub/chat/{roomId}` | 채팅 메시지 수신 |
| ⬜ | `GET /api/v1/chat/rooms/{roomId}/messages` | 히스토리 조회 (커서 페이징) |
| ⬜ | `POST /api/v1/chat/rooms` | 채팅방 생성 |
| ⬜ | `ChatRoom` enum 수정 | `GLOBAL` / `GUILD` / `TERRITORY` |

### 경매 실시간
| 상태 | 채널 | 설명 |
|---|---|---|
| ⬜ | `/sub/auction/{auctionId}` | 입찰 현황 실시간 수신 |
| ⬜ | `/sub/user/{userId}/auction-result` | 경매 낙찰/실패 개인 알림 |

### 맵 업데이트
| 상태 | 채널 | 설명 |
|---|---|---|
| ⬜ | `/sub/map/update` | 영토 점유자 변경 브로드캐스트 |

### 알림
| 상태 | 채널 | 설명 |
|---|---|---|
| ⬜ | `/sub/user/{userId}/notification` | 개인 알림 수신 |
| ⬜ | `/sub/user/{userId}/siege-alert` | 공성전 선언 알림 |

---

## 스케줄러 / 배치

| 상태 | 항목 | 비고 |
|---|---|---|
| ✅ | 경매 생명주기 스케줄러 | `AuctionLifecycleService` |
| ⬜ | 토지세 배치 스케줄러 | 매일 자정 차감 + GP 부족 처리 |
| ⬜ | 시즌 패스 만료 알림 스케줄러 | 만료 3일 전·당일 |
| ⬜ | 영토 소득 정산 스케줄러 | 주기적 GP 생산량 적립 |
| ⬜ | 시즌 종료 배치 | 리그별 보상 지급 + 트로피 50% 리셋 |
| ⬜ | 랭킹 집계 배치 | 생산 효율왕 등 주기적 집계 |

---

## Redis

| 상태 | 키 | 용도 |
|---|---|---|
| ✅ | `refresh_token:{userId}` | RefreshToken 저장 |
| ✅ | `season_pass:my:{userId}` | 시즌 패스 상태 캐시 (TTL 30분) |
| ✅ | `season_pass:progress:{userId}` | 시즌 패스 진행도 캐시 (TTL 30분) |
| ⬜ | `auction:lock:{auctionId}` | 입찰 분산락 |
| ⬜ | `auction:bid:{auctionId}` | 경매 상세 캐시 |
| ⬜ | `land_tax:expected:{userId}` | 예상 세금 캐시 (TTL: 자정까지) |
| ⬜ | `ranking:territory` | 영토 왕 Sorted Set |
| ⬜ | `ranking:wealth` | 자산가 Sorted Set |
| ⬜ | `ranking:trophy` | 트로피 Sorted Set |
| ⬜ | `ws:chat:{roomId}` | 채팅 Pub-Sub 채널 (스케일아웃 시) |
| ⬜ | `ws:user:{userId}` | 개인 알림 Pub-Sub 채널 (스케일아웃 시) |

---

## 진행 순서 (권장)

```
현재 브랜치: feature/be-15-chat
  1. WebSocketConfig 수정 (/pub, /sub prefix)
  2. StompChannelInterceptor JWT 검증
  3. 채팅 구현 (ChatRoom enum, ChatController, ChatService)
  4. 알림 구현 (NotificationService + /sub/user/{userId}/notification)
  5. 경매 WebSocket 브로드캐스트 (입찰 이벤트, 낙찰 결과)
  6. 맵 업데이트 브로드캐스트

다음 예상 브랜치:
  feature/be-16-notification
  feature/be-17-ranking
  feature/be-18-military
```
