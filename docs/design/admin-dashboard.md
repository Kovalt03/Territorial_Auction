# 관리자 페이지 (Admin Dashboard) 설계

> 상태: 초안 (Draft)
> 대상 사용자: 운영자 (`ROLE_ADMIN`)
> 범위: 전체 도메인 횡단 (BE + FE)
> 관련 문서: [access-control-matrix](./access-control-matrix.md) · [db-schema](./db-schema.md) · [domain-design](./domain-design.md) · API 상세 `docs/api/admin.md`(예정)

---

## 1. 개요

### 1.1 목적
운영자가 유저·경매·시즌·아이템을 **UI에서 직접 조회하고 개입**할 수 있는 관리자 대시보드를 제공한다. 현재는 관리자 role이 없어 시즌 종료 등 운영 작업을 DB 직접 수정으로 처리하고 있으며, 이를 안전한 관리자 API + 화면으로 대체한다.

### 1.2 대상 사용자
- `users.role = ADMIN` 인 계정만 접근 가능.
- 일반 유저에게는 존재 자체가 노출되지 않는다(라우트 가드 + 서버 403).

### 1.3 범위
| 포함 | 제외(현 단계) |
|---|---|
| 유저 관리, 경매·영토 관리, 시즌·시즌패스 운영, 아이템·재화 정책, 감사 로그, 지표 대시보드 | 유저 발신 신고 시스템(별도 기획), 운영자 권한 세분화(RBAC 다단계), 결제 환불 연동 |

### 1.4 설계 원칙
1. **격리**: 모든 관리자 API는 `/api/v1/admin/**` 하위. 일반 유저 API를 관리자 용도로 재사용하지 않는다.
2. **추적성**: 모든 관리자 쓰기 작업은 감사 로그에 기록한다.
3. **최소 침습**: 기존 도메인 Repository·도메인 메서드를 재사용하고, 스키마는 엔티티 기반(`ddl-auto`)으로 확장한다. (본 프로젝트는 Flyway/Liquibase 미사용)
4. **UI 우선**: 각 기능은 관리자 화면에서 클릭 몇 번으로 수행 가능해야 한다.

---

## 2. 기능 카탈로그

상태 범례: 🟢 기존 도메인 바로 재사용 · 🟡 조회/조정 API만 추가 · 🟠 신규 필드·플래그 또는 정책 결정 필요

### 2.1 유저 관리
| 기능 | 상태 | 설명 |
|---|---|---|
| 유저 목록·검색 | 🟡 | 닉네임/username 검색, status 필터, 페이지네이션 |
| 유저 상세 | 🟡 | 지갑(AP/GP)·보유 영토 수·트로피·시즌패스·상태 집계 |
| 계정 정지/해제 | 🟢 | 기존 `UserStatus.SUSPENDED` + `updateStatus()` 재사용 |
| 재화(AP/GP) 조정 | 🟡 | 증감 + 사유 필수 (CS/버그 보정) |
| 트로피 점수 조정 | 🟡 | 오류 보정용, 사유 필수 |
| 아이템 직접 지급 | 🟡 | CS 보상 |

### 2.2 경매·영토 관리
| 기능 | 상태 | 설명 |
|---|---|---|
| 전체 경매 목록·상세 | 🟡 | status/좌표 필터, 입찰 내역 포함 |
| 경매 강제 종료 | 🟠 | 정책 결정 필요: **즉시 낙찰(현재가)** vs **취소+전액 환불** ([OQ-2](#9-미결-사항-open-questions)) |
| 경매 강제 시작 | 🟡 | IDLE 영토를 즉시 경매로 전환 (`nextAuctionAt=now` → 스케줄러 `createAuctions()` 또는 직접 `startBidding()`) |
| 경매 활성화/비활성화 | 🟠 | 특정 영토를 경매 대상에서 제외/복귀. 현재 status에 DISABLED 없음 → **신규 플래그 `auctionEnabled` 도입 권장** |
| 영토 등급 변경 | 🟠 | `Territory.grade`(FK) 변경 도메인 메서드 신규. 시작가·생산량에 영향 → 영향 범위 정의 필요 |
| 점령 강제 해제/회수 | 🟢 | 기존 `release(nextAuctionAt)` 재사용 (옵션) |

### 2.3 시즌·시즌패스 운영
| 기능 | 상태 | 설명 |
|---|---|---|
| 시즌 목록·생성 | 🟡 | `started_at`/`ended_at` 지정 |
| 시즌 시작/종료 | 🟡 | 종료 = `ended_at=now`(→ `SeasonEndScheduler` 자동 정산), 시작 = 신규 시즌 활성화 |
| 시즌패스 시작/종료 | 🟠 | 시즌패스가 시즌에 종속 — 독립 기간 관리가 필요한지 확인 필요 ([OQ-7](#9-미결-사항-open-questions)) |
| 랭킹 전체 조회 | 🟡 | 공개 랭킹의 limit 상향 버전 |

### 2.4 아이템·재화 정책
| 기능 | 상태 | 설명 |
|---|---|---|
| 아이템 가격·일일한도 수정 | 🟡 | 진행 중 구매와의 정합성 고려 ([OQ-10](#9-미결-사항-open-questions)) |
| 아이템 구매 이력 조회 | 🟡 | 유저/타입/기간 필터 |

### 2.5 운영 보조
| 기능 | 상태 | 설명 |
|---|---|---|
| 감사 로그 열람 | 🟡 | 관리자 조작 이력 (관리자/action/기간 필터) |
| 지표 대시보드 | 🟠 | DAU·활성 경매 수·오늘 AP 충전량·총 유저 수. DAU 정의·최근활동 컬럼 필요 ([OQ-5](#9-미결-사항-open-questions)) |
| 채팅 로그 열람/삭제 | 🟡 | 제재 판단용 (멤버십 검증 없이 접근) |

---

## 3. 권한·인증 설계

### 3.1 Role 도입 (`users.role`)
- `User` 엔티티에 `UserRole { USER, ADMIN }` enum 필드 추가 → `ddl-auto: update`가 `role VARCHAR` 컬럼 자동 생성. **별도 마이그레이션 SQL 불필요.**
- 기본값 `USER`. 최초 관리자는 시더(`db/*.yml` 계열) 또는 DB 직접 지정.
- 별도 `admin_users` 테이블을 만들지 않는다 → 기존 JWT 발급·검증 흐름 그대로 재사용.

### 3.2 JWT / SecurityConfig
- JWT 페이로드에 `role` 클레임 추가 (`JwtTokenProvider`).
- `SecurityConfig`에 `/api/v1/admin/**` → `hasRole("ADMIN")` 규칙 추가.
- `StompChannelInterceptor`도 필요 시 role 파싱(관리자 실시간 기능이 생기면).

### 3.3 접근 제어 매트릭스 연계
- `access-control-matrix.md`에 관리자 열/기능(F-Admin-*) 추가로 정리 (본 문서와 짝).

---

## 4. 관리자 API 개요

상세 요청/응답 스펙은 `docs/api/admin.md`(예정)에 작성. 아래는 인덱스.

### 유저
- `GET /api/v1/admin/users` — 목록·검색
- `GET /api/v1/admin/users/{userId}` — 상세
- `PATCH /api/v1/admin/users/{userId}/status` — 정지/해제
- `POST /api/v1/admin/users/{userId}/wallet/adjust` — 재화 조정
- `PATCH /api/v1/admin/users/{userId}/trophy` — 트로피 조정
- `POST /api/v1/admin/users/{userId}/items/grant` — 아이템 지급

### 경매·영토
- `GET /api/v1/admin/auctions` · `GET /api/v1/admin/auctions/{auctionId}`
- `POST /api/v1/admin/auctions/{auctionId}/force-end` — 강제 종료
- `POST /api/v1/admin/territories/{territoryId}/start-auction` — 강제 시작
- `PATCH /api/v1/admin/territories/{territoryId}/auction-enabled` — 활성/비활성
- `PATCH /api/v1/admin/territories/{territoryId}/grade` — 등급 변경

### 시즌·랭킹
- `GET /api/v1/admin/seasons` · `POST /api/v1/admin/seasons` · `PATCH /api/v1/admin/seasons/{seasonId}`
- `PATCH /api/v1/admin/season-passes/{id}` — 시즌패스 기간 (OQ-7 확정 후)

### 아이템
- `GET /api/v1/admin/items` · `PATCH /api/v1/admin/items/{itemId}`
- `GET /api/v1/admin/item-purchases`

### 운영
- `GET /api/v1/admin/dashboard/summary` — 지표
- `GET /api/v1/admin/audit-logs` — 감사 로그
- `GET /api/v1/admin/chat/rooms/{roomId}/messages` · `DELETE /api/v1/admin/chat/messages/{messageId}`

---

## 5. 프론트엔드 구성

기존 React 앱(`/app/**`)에 `/admin/**` 라우트를 통합한다(별도 SPA 분리 안 함 — 빌드·API 클라이언트·인증 Context 공유). 접근 빈도가 낮아 lazy 코드 분할로 충분히 격리된다.

### 5.1 가드
```
PrivateRoute (로그인 확인)
  └─ AdminRoute (AppContext.role === 'ADMIN' 확인, 아니면 /app/map 리다이렉트)
        └─ /admin/** 페이지
```
- `AppContext`에 `role` 필드 추가. 로그인 시 JWT 또는 `GET /users/me` 응답에서 주입.

### 5.2 라우트/화면
| 경로 | 화면 |
|---|---|
| `/admin` | 대시보드(지표 요약) |
| `/admin/users` · `/admin/users/:id` | 유저 목록 / 상세·조정 |
| `/admin/auctions` · `/admin/auctions/:id` | 경매 목록 / 상세·강제 종료 |
| `/admin/territories` | 영토 등급·경매 활성 관리 |
| `/admin/seasons` | 시즌·시즌패스 운영 |
| `/admin/items` | 아이템 가격·한도 |
| `/admin/audit-logs` | 감사 로그 |
| `/admin/chat` | 채팅 로그 열람 |

### 5.3 UI 원칙
- 위험 작업(강제 종료·재화 조정·정지)은 **확인 모달 + 사유 입력** 필수.
- 조정 결과는 즉시 화면 반영 + 감사 로그에 남는다.

---

## 6. 감사 로그 (Audit Log)

### 6.1 엔티티 `AdminAuditLog` (ddl-auto로 테이블 생성)
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | Long PK | |
| `adminUserId` | Long | 작업 관리자 |
| `action` | String(50) | `USER_SUSPEND`, `WALLET_ADJUST`, `AUCTION_FORCE_END`, `SEASON_CREATE`, `TERRITORY_GRADE_CHANGE` 등 |
| `targetType` | String(20) | `USER`/`AUCTION`/`TERRITORY`/`SEASON`/`ITEM` |
| `targetId` | Long | 대상 ID |
| `detailJson` | TEXT | 변경 전/후 값(JSON) |
| `createdAt` | LocalDateTime | |

### 6.2 기록 범위·방식
- 모든 관리자 **쓰기 작업(POST/PATCH/DELETE)** 기록. 조회는 제외.
- `AdminService` 계층에서 작업 완료 후 기록. 반복 축소를 위해 공통 `AdminAuditLogger` 컴포넌트 사용.

---

## 7. 스키마 변경 (엔티티 기반, ddl-auto)

| 대상 | 변경 |
|---|---|
| `users` | `role` 컬럼 추가 (`UserRole` enum) |
| 신규 | `admin_audit_logs` 테이블 (`AdminAuditLog` 엔티티) |
| `territories` | 경매 활성 플래그 `auction_enabled BOOLEAN`(2.2 비활성화 기능 채택 시) |

> 스키마 확정 시 `db-schema.md`에 반영.

---

## 8. 구현 로드맵

### Phase 1 — 기반 인프라 (최우선)
- `users.role` 추가 + JWT role 클레임 + `SecurityConfig` `/admin/**` 가드
- `AdminAuditLog` 엔티티 + `AdminAuditLogger`
- 유저 목록/상세/정지·해제 API
- FE: `AdminRoute` 가드 + `AppContext.role` + `/admin`, `/admin/users`

### Phase 2 — 핵심 운영
- 재화 조정, 트로피 조정
- 경매 목록/상세, 강제 종료, 강제 시작, 활성/비활성
- 영토 등급 변경
- 시즌 생성/시작/종료
- FE: `/admin/auctions`, `/admin/territories`, `/admin/seasons`, `/admin/audit-logs`

### Phase 3 — 지표·확장
- 대시보드 지표, 아이템 가격·한도, 아이템 지급, 채팅 로그 열람/삭제
- FE: `/admin` 지표 위젯, `/admin/items`, `/admin/chat`

---

## 9. 미결 사항 (Open Questions)

정책 결정이 선행되어야 하는 항목 위주.

| # | 질문 | 영향 |
|---|------|------|
| OQ-1 | 관리자 로그인을 일반 `/auth/login`과 공유할 것인가, 별도 강화 인증(IP 화이트리스트 등)을 둘 것인가 | Auth |
| OQ-2 | 경매 강제 종료 시 처리 방식: 현재가 즉시 낙찰 vs 취소+전액 환불. 과거 입찰자 추가 조치 여부 | Auction/Wallet |
| OQ-3 | 재화 조정 1회 한도·이중 승인 필요 여부 | Wallet/Admin |
| OQ-4 | 영토 등급 변경 시 진행 중 경매/생산에 소급 적용 범위 | Map/Auction |
| OQ-5 | DAU 정의(로그인 기준 vs API 호출 기준). 현재 최근활동 컬럼 없음 | User/Dashboard |
| OQ-6 | 경매 "비활성화"를 신규 플래그로 정식화할지, `nextAuctionAt=null` 우회로 둘지 | Map/Auction |
| OQ-7 | 시즌패스 기간을 시즌과 독립적으로 시작/종료할 수 있어야 하는가 | Season |
| OQ-8 | 감사 로그 보존 기간 정책(무기한 vs 아카이빙) | Admin/DB |
| OQ-9 | 유저 발신 신고 시스템 도입 시점(별도 기획) | Social/Admin |
| OQ-10 | 아이템 가격 변경의 적용 시점(즉시 vs 다음 사이클)과 동시 구매 정합성 | Item |
