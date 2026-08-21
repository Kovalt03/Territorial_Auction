# 픽셀 경매 - 사이버 영토 전쟁

50×50 월드맵에서 영토를 경매로 점유하고 건설·자원·병력·공성전을 운영하는 실시간 전략 웹 애플리케이션.

운영과 유사한 로컬 Docker 실행, 관리자 초기화, 백업·복구는 [로컬 운영 실행 가이드](docs/operations/local-production.md)를 따른다. 사용자와 운영자 기능 안내는 각각 [사용자 가이드](docs/guides/user-guide.md), [관리자 운영 가이드](docs/guides/admin-guide.md)를 참조한다.

---

## 프로젝트 구조

```
Territorial_Auction/
├── frontend/   # React + TypeScript + Vite
└── backend/    # Spring Boot 3 + Java 17
```

---

## Git 관리 규칙

### 브랜치 전략

```
main
 └── dev
      ├── feature/fe-*    # 프론트엔드 기능
      ├── feature/be-*    # 백엔드 기능
      ├── feature/all-*   # 공통 작업
      └── hotfix/*        # 긴급 수정
```

- `main` : 프로덕션 배포 — `dev` 에서만 PR 허용
- `dev` : 개발 통합 — feature PR을 통해서만 Merge
- `feature/*` : `dev` 에서 분기, 완료 후 `dev` 로 PR

### 브랜치 명명

```
feature/fe-worldmap-ui
feature/be-auction-bid-api
feature/all-github-actions-setup
hotfix/be-login-500-error
```

> `fe-` / `be-` / `all-` 로 작업 영역을 구분합니다.

### 커밋 메시지

```
[PREFIX] 제목

본문 (선택)

Closes #이슈번호 (선택)
```

| Prefix | 설명 |
|---|---|
| `[FEAT]` | 새로운 기능 추가 |
| `[FIX]` | 버그 수정 |
| `[HOTFIX]` | 프로덕션 긴급 버그 수정 |
| `[REFACTOR]` | 기능 변경 없는 코드 개선 |
| `[TEST]` | 테스트 코드 추가/수정 |
| `[CHORE]` | 빌드 설정, 의존성, 개발 환경 |
| `[DOCS]` | 문서 작성/수정 |
| `[STYLE]` | 포맷 등 로직 무관 스타일 |
| `[PERF]` | 성능 개선 |

**이슈 연결**

| 키워드 | 동작 |
|---|---|
| `Closes #번호` | PR 머지 시 이슈 자동 Close |
| `Related to #번호` | 이슈 연결만 (Close 안 함) |
| `Ref #번호` / `#번호` | 단순 참고용 연결 |

### PR 규칙

- **제목 형식** : `[PREFIX] 작업 내용 요약`
- **Merge 전략** : PR 생성 시 사용자와 합의한 방식으로 진행
- **main 보호** : `dev` 브랜치에서만 PR 허용

---

## 로컬 실행

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### Backend

```bash
cd backend
./gradlew bootRun
# http://localhost:8080
```

### 운영과 유사한 로컬 Docker 실행

```bash
cp backend/.env.production.example backend/.env.production
# JWT_SECRET과 DB 비밀번호를 강한 값으로 변경
docker compose -f docker-compose.production.yml up -d --build
# http://localhost:3000
```

릴리스 기준과 현재 제한은 [v1.0.0-monolith 릴리스 기준점](docs/releases/v1.0.0-monolith.md)을 참조한다.

---

## License

This project is licensed under the [MIT License](LICENSE).
