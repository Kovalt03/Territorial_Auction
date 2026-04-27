# Territorial Auction — 문서 인덱스

픽셀 경매 · 사이버 영토 전쟁 프로젝트 전체 문서 목록입니다.

---

## 기획 (planning/)

| 파일 | 내용 |
|---|---|
| [overview.md](./planning/overview.md) | 서비스 개요, 핵심 시스템, 화면 구성, 경제 구조, Config 값 |
| [requirements.md](./planning/requirements.md) | 기능 요구사항 정의서 (카테고리별 FR 목록) |
| [wireframes.md](./planning/wireframes.md) | 화면별 와이어프레임 및 UI 구성 설명 |

---

## 설계 (design/)

| 파일 | 내용 |
|---|---|
| [domain-design.md](./design/domain-design.md) | 10개 Bounded Context, 핵심 엔티티·VO, 도메인 간 협력 로직 |
| [db-schema.md](./design/db-schema.md) | PostgreSQL 전체 테이블 정의 + Redis 키 구조 |
| [access-control-matrix.md](./design/access-control-matrix.md) | 기능별 접근 제어 매트릭스 (F-코드 × 유저 역할) |
| [building-specs.md](./design/building-specs.md) | 건물 타입별 세부 스펙, Zone 배치 규칙, 파괴 효과 |
| [military-specs.md](./design/military-specs.md) | 유닛 타입별 세부 스펙, 전투 공식, 트로피 증감표 |

---

## API 명세 (api/)

> Base URL: `http://localhost:8080`  
> 인증: `Authorization: Bearer {accessToken}`  
> 공통 응답/에러 형식 → [api/README.md](./api/README.md)

### REST API

| 파일 | 도메인 | 엔드포인트 수 | 구현 상태 |
|---|---|---|---|
| [auth.md](./api/auth.md) | 인증·회원 | 8 | ✅ 완료 |
| [user.md](./api/user.md) | 유저 프로필·자산·영토 | 6 | ✅ 완료 |
| [map.md](./api/map.md) | 맵·영토·대륙 | 6 | ✅ 완료 |
| [auction.md](./api/auction.md) | 경매·입찰 | 4 | 🔲 미구현 |
| [building.md](./api/building.md) | 건물·섬·보관함 | 10 | 🔲 미구현 |
| [military.md](./api/military.md) | 군사·공성전 | 9 | 🔲 미구현 |
| [notification.md](./api/notification.md) | 알림 | 3 | 🔲 미구현 |
| [ranking.md](./api/ranking.md) | 랭킹 | 6 | 🔲 미구현 |
| [global-vault.md](./api/global-vault.md) | 글로벌 금고 | 2 | 🔲 미구현 |
| [payment.md](./api/payment.md) | 결제·아이템 | 4 | 🔲 미구현 |
| [season.md](./api/season.md) | 시즌 패스 | 2 | 🔲 미구현 |
| [tax.md](./api/tax.md) | 토지세 | 1 | 🔲 미구현 |
| [guild.md](./api/guild.md) | 길드 | 7 | 🔲 미구현 |

### 실시간 (WebSocket/STOMP)

| 파일 | 내용 |
|---|---|
| [websocket.md](./api/websocket.md) | STOMP 연결, Pub/Sub 채널 목록, 메시지 형식 |

### 참고

| 파일 | 내용 |
|---|---|
| [errors.md](./api/errors.md) | 전 도메인 에러 코드 통합 레퍼런스 |
| [api/README.md](./api/README.md) | 공통 규칙 (Base URL, 인증, 응답 형식, HTTP 상태 코드) |

---

## 빠른 참조

```
새 API 개발 시:
  1. api/README.md — 공통 응답 형식 확인
  2. design/domain-design.md — 도메인 경계 확인
  3. design/db-schema.md — 테이블 구조 확인
  4. errors.md — 에러 코드 확인

전투 관련:
  → military.md + design/military-specs.md

건물 관련:
  → building.md + design/building-specs.md

경제 시스템:
  → payment.md + season.md + tax.md + global-vault.md
```
