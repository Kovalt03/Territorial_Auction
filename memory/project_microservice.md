---
name: Microservice 분리 계획
description: 현재 모놀리식 구조를 나중에 Microservice로 분리할 예정
type: project
---

나중에 Microservice로 분리할 예정이다.

**Why:** 도메인 설계 문서에도 8개 Bounded Context로 나뉘어 있으며, 각 경계가 Microservice 단위가 될 것으로 명시되어 있음.

**How to apply:**
- 현재는 도메인 간 직접 참조(예: UserService에서 UserTrophyRepository 주입)를 허용하되, 결합도가 높아지는 설계는 짚어주기
- 나중에 분리할 때 경계가 명확하도록 도메인 간 의존 방향을 항상 인식하고 언급하기
- 도메인 간 데이터 조합이 필요한 경우 파사드/쿼리 서비스 패턴을 제안하되, 현재는 실용적인 직접 참조도 수용
