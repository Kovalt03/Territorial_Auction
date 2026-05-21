# 구현 체크리스트

> 마지막 갱신: 2026-05-22 (be-32 머지 반영)  
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
| ✅ | 탈퇴 시 JWT 무효화 | — | Redis 블랙리스트 등록 (be-25) |

---

### User
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 유저 프로필 조회 | `GET /api/v1/users/{userId}` | |
| ✅ | 내 프로필 조회 | `GET /api/v1/users/me` | |
| ✅ | 회원 탈퇴 | `DELETE /api/v1/users/me` | JWT 블랙리스트 무효화 완료 (be-25) |
| ✅ | 알림 설정 조회 | `GET /api/v1/users/me/settings` | |
| ✅ | 알림 수신 설정 변경 | `PATCH /api/v1/users/me/settings` | |
| 🔄 | GP/AP 잔액 조회 | `GET /api/v1/users/me/wallet` | `lockedAP` 미완성 (식량 생산 보류와 동일) |
| ✅ | 나의 영토 목록 조회 | `GET /api/v1/users/me/territories` | occupiedAt·militaryCount·isInvincible 완료 (be-25) |
| ✅ | 닉네임 변경 | `PATCH /api/v1/users/me/nickname` | |
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
| ✅ | 입찰하기 | `POST /api/v1/auctions/{auctionId}/bids` | Redis 분산락 완료 (be-18) |
| ✅ | 가격 변동 그래프 데이터 | `GET /api/v1/auctions/{auctionId}/bids` | |
| ✅ | 내 입찰 내역 조회 | `GET /api/v1/auctions/my-bids` | |
| ✅ | 영토 경매 이력 조회 | `GET /api/v1/auctions/territories/{territoryId}` | |
| ✅ | 입찰 시 WebSocket 브로드캐스트 | — | `/sub/auction/{auctionId}` (be-23) |

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
| ✅ | 섬 건물 배치 | `POST /api/v1/island/buildings` | 일꾼 슬롯 검증 완료 (기본 1, 시즌 패스 +extraBuilders) |
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
| ✅ | 아이템 사용 | `POST /api/v1/items/use` | 무적 방어막·공격권(일반/정밀) 연동 완료 |
| ✅ | 보유 아이템 목록 조회 | `GET /api/v1/items/inventory` | |

---

### Land Tax
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 토지세 현황 조회 | `GET /api/v1/land-tax/status` | |
| ✅ | 납세 내역 조회 | `GET /api/v1/land-tax/logs` | |
| ✅ | 세금 배치 스케줄러 | — | 유예기간(24h) + D→S 순차 강제 경매 전환 구현 (be-27) |
| ✅ | Redis 캐시 연동 | — | `land_tax:expected:{userId}` TTL 자정까지 (be-26) |

---

### Season Pass
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 내 시즌 패스 상태 조회 | `GET /api/v1/season-pass/me` | Redis 캐시 완료 |
| ✅ | 시즌 패스 현황 조회 | `GET /api/v1/season-pass` | XP 연동 + 시드 데이터 완료 (be-32) |
| ✅ | 시즌 패스 구매 | `POST /api/v1/season-pass/purchase` | Redis 캐시 완료 |
| ✅ | 만료 알림 스케줄러 | — | 만료 3일 전·당일 알림 발송 (SeasonPassScheduler, be-25) |
| ✅ | XP 적립 — 경매 낙찰 | — | `AuctionSettledEvent` 구독, +100 XP (be-32) |
| ✅ | XP 적립 — 공성전 승리 | — | `SiegeVictoryEvent` 신규 이벤트, +50 XP (be-32) |
| ✅ | DB 시드 데이터 | — | `season_pass_level_rewards` 6개 레벨 보상 삽입 (be-32) |

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
| ✅ | 알림 목록 조회 | `GET /api/v1/notifications` | Redis unread 카운터 연동 |
| ✅ | 알림 읽음 처리 | `PATCH /api/v1/notifications/{id}/read` | Redis DECR |
| ✅ | 전체 읽음 처리 | `PATCH /api/v1/notifications/read-all` | Redis SET 0 |

---

### Military (공성전)
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 공성전 선언 | `POST /api/v1/siege` | |
| ✅ | 공성전 목록 조회 | `GET /api/v1/siege` | |
| ✅ | 공성전 상세 조회 | `GET /api/v1/siege/{siegeId}` | |
| ✅ | 유닛 생산 | `POST /api/v1/military/units` | 병영 레벨 게이팅 + 유닛 상한 + 식량 소모 (be-29) |
| ✅ | 유닛 목록 조회 | `GET /api/v1/military/units` | availableFood 포함 (be-29) |
| ✅ | 유닛 배치 | `POST /api/v1/military/units/{unitId}/deploy` | |
| ✅ | 공격권 조회 | `GET /api/v1/military/attack-tokens` | |
| ✅ | 전투 결과 처리 스케줄러 | — | 1분 주기, SiegeScheduler |
| ✅ | 공성전 알림 WebSocket | — | `/sub/user/{userId}/siege-alert` (선언·결과 양측 발송) |

---

### Building — 식량·유닛 수용 (be-29)
| 상태 | 기능 | 비고 |
|---|---|---|
| ✅ | Wallet.availableFood 추가 | DEFAULT 100 |
| ✅ | UnitType.foodCost (1회 소모) | 기존 foodCostPerHour 대체 |
| ✅ | UnitType.level (병영 레벨 요구치) | DEFAULT 1 |
| ✅ | BuildingType.foodProductionRate | FARMLAND 전용 |
| ✅ | BuildingType.unitCapacityPerLevel | RESIDENCE 전용 |
| ✅ | FarmlandScheduler | 1시간 주기 식량 생산 적립 |
| ✅ | CASTLE 레벨별 기본 유닛 슬롯 | MilitaryPolicy (1→5, 2→10, 3→15) |
| ✅ | FARMLAND·RESIDENCE·WORKSHOP 시드 데이터 | building_types 8종 전체 seed.sql 삽입 완료 (be-33) |

### Building — WORKSHOP GP 생산 (be-30)
| 상태 | 기능 | 비고 |
|---|---|---|
| ✅ | BuildingType.gpProductionRate | WORKSHOP 전용 |
| ✅ | BuildingInstance.workshopDebuffUntil | WORKSHOP 파괴 디버프 타임스탬프 |
| ✅ | WorkshopScheduler | 1시간 주기 GP 생산 적립 (디버프 중 제외) |
| ✅ | MilitaryPolicy.WORKSHOP_DEBUFF_HOURS | 기본 12시간 |
| ✅ | SiegeService — WORKSHOP 파괴 시 디버프 적용 | Zone 2 클리어, HP 0 → workshopDebuffUntil 설정 |

---

### Ranking
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 시즌 영토 등급 보유 랭킹 | `GET /api/v1/rankings/territory-hold` | Redis Sorted Set, 주기적 배치 집계 |
| ✅ | 시즌 경매 AP 소비 랭킹 | `GET /api/v1/rankings/auction-spend` | Redis Sorted Set, 낙찰마다 즉시 갱신 |
| ✅ | 내 랭킹 조회 | `GET /api/v1/rankings/me` | 두 카테고리 모두 포함 |

---

### Territory Income
| 상태 | 기능 | 엔드포인트 | 비고 |
|---|---|---|---|
| ✅ | 영토 수령 | `POST /api/v1/territories/{id}/collect` | Lazy Evaluation 방식, settle() 로직 포함 (be-28) |

---

## WebSocket / STOMP (실시간)

### 기반 설정
| 상태 | 항목 | 비고 |
|---|---|---|
| ✅ | `WebSocketConfig` | `/pub`·`/sub` prefix, SockJS, StompChannelInterceptor 등록 |
| ✅ | `StompChannelInterceptor` | CONNECT 단계 JWT 검증, 미인증 연결 허용 (공개 채널용) |

### 채팅
| 상태 | 채널 | 설명 |
|---|---|---|
| ✅ | `/pub/chat/{roomId}` | 클라이언트 메시지 발행 (미인증 시 CHAT_ACCESS_DENIED) |
| ✅ | `/sub/chat/{roomId}` | 채팅 메시지 수신 |
| ✅ | `GET /api/v1/chat/rooms/{roomId}/messages` | 히스토리 조회 (커서 페이징, 길드 접근 검증 포함) |
| ✅ | `ChatRoom` 타입 | `WORLD` / `CONTINENT` / `GUILD`. Enum 값 및 관련 로직 일괄 수정 완료 |
| ✅ | WebSocket 에러 응답 | `CustomException` → `/user/queue/errors` 전송 |

### 경매 실시간
| 상태 | 채널 | 설명 |
|---|---|---|
| ✅ | `/sub/auction/{auctionId}` | 입찰 현황 실시간 수신 (be-23) |
| ✅ | `/sub/user/{userId}/auction-result` | 경매 낙찰(WIN)/패찰(LOSE) 개인 알림 |

### 맵 업데이트
| 상태 | 채널 | 설명 |
|---|---|---|
| ✅ | `/sub/map/update` | 영토 점유자 변경 브로드캐스트 (낙찰·점유 만료 시) |

### 알림
| 상태 | 채널 | 설명 |
|---|---|---|
| ✅ | `/sub/user/{userId}/notification` | 개인 알림 수신 (be-17) |
| ✅ | `/sub/user/{userId}/siege-alert` | 공성전 선언·결과 알림 |

---

## 스케줄러 / 배치

| 상태 | 항목 | 비고 |
|---|---|---|
| ✅ | 경매 생명주기 스케줄러 | `AuctionLifecycleService` |
| ✅ | 시즌 영토 등급 보유 집계 배치 | `season_territory_holds` → Redis Sorted Set 갱신 (1시간 주기) |
| ✅ | 토지세 배치 스케줄러 | 매일 자정 차감 + GP 부족 처리 (be-20) |
| ✅ | 전투 결과 처리 스케줄러 | 1분 주기, `SiegeScheduler` |
| ✅ | 시즌 패스 만료 알림 스케줄러 | 만료 3일 전·당일 (SeasonPassScheduler, be-25) |
| ⬜ | 일 정산 배치 (선택) | 미수령 생산량 settle + `territory_production_logs` 기록. 구현 여부 미확정 |
| ⬜ | 시즌 종료 배치 | 리그별 보상 지급 + 트로피 50% 리셋. 관리자가 `seasons.ended_at` 설정 시 자동 트리거 |

---

## Redis

| 상태 | 키 | 용도 |
|---|---|---|
| ✅ | `refresh_token:{userId}` | RefreshToken 저장 |
| ✅ | `season_pass:my:{userId}` | 시즌 패스 상태 캐시 (TTL 30분) |
| ✅ | `season_pass:progress:{userId}` | 시즌 패스 진행도 캐시 (TTL 30분) |
| ✅ | `ranking:season:{seasonId}:territory_hold` | 시즌 영토 등급 보유 Sorted Set |
| ✅ | `ranking:season:{seasonId}:auction_spend` | 시즌 경매 AP 소비 Sorted Set |
| ✅ | `auction:lock:{auctionId}` | 입찰 분산락 (Redisson, be-18) |
| ⬜ | `auction:bid:{auctionId}` | 경매 상세 캐시 |
| ✅ | `land_tax:expected:{userId}` | 예상 세금 캐시 (TTL: 자정까지) |
| ✅ | `land_tax:grace:{userId}` | 토지세 유예기간 키 (TTL: 24h, be-27) |
| ⬜ | `ws:chat:{roomId}` | 채팅 Pub-Sub 채널 (스케일아웃 시) |
| ⬜ | `ws:user:{userId}` | 개인 알림 Pub-Sub 채널 (스케일아웃 시) |

---

## TODO — 구현 보류 항목

| 항목 | 이유 |
|---|---|
| **식량 생산 수단** | 가장 마지막 구현 요소. Workshop이 GP만 생산하는지 식량도 생산하는지 별도 기획 필요. `wallets.available_food` 컬럼은 예약됨. |

---

## 진행 순서 (권장)

```
완료 브랜치: feature/be-15-chat ✅
  - WebSocketConfig (/pub, /sub prefix, SockJS)
  - StompChannelInterceptor JWT 검증
  - 채팅 구현 (ChatRoom 타입, ChatController, ChatService)
  - 길드 생성 시 GUILD 채팅방 자동 생성

다음 예상 브랜치:
  feature/be-16-notification
  feature/be-17-ranking   (새 랭킹 스펙: territory-hold + auction-spend)
  feature/be-18-military
```
