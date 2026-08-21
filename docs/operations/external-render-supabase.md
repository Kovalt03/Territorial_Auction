# Render + Supabase 외부 검증 배포 가이드

이 절차는 모놀리식 앱이 외부 HTTPS 환경에서도 동작하는지 확인하기 위한 일회성 검증이다. 주 운영 경로는 [로컬 운영 실행 가이드](./local-production.md)다.

## 구성

| 구성 요소 | 서비스 | 역할 |
|---|---|---|
| Frontend | Render Static Site | Vite 정적 파일 제공 |
| Backend | Render Web Service | Spring Boot API·STOMP·OAuth 콜백 |
| PostgreSQL | Supabase | 영속 데이터 |
| Redis | 외부 Redis 또는 Render Key Value | 캐시·토큰·분산 락 |

`render.yaml`은 Render Blueprint로 API와 정적 프론트엔드 서비스를 만든다. 자동 배포는 꺼져 있으므로 검증할 커밋을 명시적으로 선택한다.

## 배포 전 준비

1. Supabase 프로젝트를 만들고 Database의 connection string을 확인한다. Render 환경에서는 IPv4를 지원하는 Session Pooler 연결을 우선 검토한다.
2. Redis 서비스를 준비한다. 호스트, 포트, 비밀번호, TLS 사용 여부를 확보한다.
3. Render에서 이 저장소의 `feature/all-external-deploy` 브랜치로 Blueprint를 생성한다.
4. API의 `sync: false` 환경 변수를 Render 대시보드에서 입력한다. 비밀값은 Git이나 채팅에 저장하지 않는다.

## 필수 환경 변수

| 변수 | 값 |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | Supabase 연결 정보 |
| `DB_SSL_MODE` | `require` |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_SSL` | 선택한 Redis 연결 정보 |
| `JWT_SECRET` | Render가 생성하거나 별도 강한 값 지정 |
| `FRONTEND_BASE_URL` | 실제 Render Static Site HTTPS 주소 |
| `CORS_ALLOWED_ORIGINS` | 위와 동일한 단일 HTTPS origin |
| `GOOGLE_*`, `KAKAO_*` | OAuth 검증 시 실제 공급자 자격 증명 |
| `ADMIN_IP_ALLOWLIST` | 운영자 공인 IP 목록 |

서비스 이름이나 custom domain을 바꾸면 `FRONTEND_BASE_URL`, `CORS_ALLOWED_ORIGINS`, 프론트의 `VITE_API_BASE_URL`, `VITE_WS_URL`를 같은 실제 주소로 함께 바꾼다.

## OAuth 설정

OAuth를 검증할 경우 공급자 콘솔에 다음 redirect URI를 등록한다.

```text
https://territorial-auction-api.onrender.com/login/oauth2/code/google
https://territorial-auction-api.onrender.com/login/oauth2/code/kakao
```

custom domain을 사용하면 위 API 도메인을 해당 도메인으로 대체한다. OAuth 토큰은 현재 콜백 URL의 query string으로 전달되는 기존 구현이므로, 외부 검증은 테스트 계정으로만 수행하고 브라우저 기록·공유 URL을 남기지 않는다.

## 검증 순서

1. API `https://territorial-auction-api.onrender.com/actuator/health`가 `UP`인지 확인한다.
2. Static Site에서 회원가입·로그인·맵 조회·경매 목록을 확인한다.
3. 두 브라우저 세션으로 입찰과 STOMP 갱신을 확인한다.
4. 관리자 로그인과 TOTP를 확인한다.
5. OAuth는 테스트 계정으로 성공·실패 리디렉션을 각각 확인한다.
6. 검증 후 시드 관리자 환경 변수와 테스트 계정을 제거하고, 필요 없으면 Render/Supabase/Redis 서비스를 중지·삭제한다.

## 참고

- [Render Blueprint YAML Reference](https://render.com/docs/blueprint-spec)
- [Render environment variables](https://render.com/docs/configure-environment-variables)
- [Supabase PostgreSQL 연결 방식](https://supabase.com/docs/guides/database/connecting-to-postgres)
