# 군사 세부 스펙

> 출처: `unit_types`, `attack_tokens` 테이블 + 기획서

---

## 유닛 타입 목록

| ID | name | 한글명 | 공격력 | 방어력 | 생산 비용 (GP) | 식량 소모 (/시간) | 특성 |
|---|---|---|---|---|---|---|---|
| 1 | `INFANTRY` | 보병 | TBD | TBD | TBD | TBD | 저비용, 공격·방어 범용 |
| 2 | `ARCHER` | 궁수 | TBD | TBD | TBD | TBD | 방어 배치 시 보너스 |
| 3 | `KNIGHT` | 기사 | TBD | TBD | TBD | TBD | 고비용, 고공격력 |

> **TBD**: 정확한 수치는 서버 `unit_types` 시드 데이터에서 결정.

---

## 유닛별 세부 특성

### 보병 (Infantry)

| 항목 | 내용 |
|---|---|
| **포지션** | 범용 |
| **장점** | 가장 저렴한 생산 비용, 빠른 대량 생산 |
| **단점** | 공격력·방어력 모두 평균 수준 |
| **추천 용도** | 초기 병력 확보, 방어 배치 보조 |

---

### 궁수 (Archer)

| 항목 | 내용 |
|---|---|
| **포지션** | 방어 특화 |
| **장점** | 방어 배치(`deployed_territory_id` 설정) 시 방어력 보너스 적용 |
| **단점** | 공격 파견 시 보너스 없음 |
| **추천 용도** | 핵심 Zone(Zone 1) 방어 배치 |

---

### 기사 (Knight)

| 항목 | 내용 |
|---|---|
| **포지션** | 공격 특화 |
| **장점** | 세 유닛 중 최고 공격력 |
| **단점** | 가장 높은 생산 비용 + 식량 소모 |
| **추천 용도** | 대규모 공성전 선봉, Zone 클리어 |

---

## 전투 계산 공식

### 공격력 / 방어력 합산

```
ATK = Σ(파견 유닛 attack_power × 수량)

DEF = Σ(방어 배치 유닛 defense_power × 수량)
    + Σ(해당 Zone 방어 건물 defense_power)
```

> 방어 건물 `defense_power`는 `BuildingEffect.defense_power` 참고 (building-specs.md)

### 전투 성공 판정

```
ATK > DEF  →  공격 성공
ATK ≤ DEF  →  공격 실패
```

### 유닛 손실 계산

| 상황 | 공격자 손실 | 방어자 손실 |
|---|---|---|
| 공격 성공 | 파견 수 × `ATTACKER_LOSS_RATE` (기본 30%) | 배치 수 × `DEFENDER_LOSS_RATE` (기본 30%) |
| 공격 실패 | 파견 수 × `ATTACKER_FAIL_LOSS_RATE` (기본 50%) | 피해 없음 (소규모 손실 TBD) |

---

## 공격권 (Attack Token) 시스템

### 종류

| 종류 | 설명 | 구매 수단 | 구매 비용 |
|---|---|---|---|
| `ATTACK_NORMAL` | 일반 공격권 — 랜덤 건물에 피해 | GP 또는 AP | 500 GP / 100 AP |
| `ATTACK_PRECISION` | 정밀 공격권 — 목표 건물 지정 공격 | AP 전용 | 300 AP |

> 공격 선언 시 공격권 1개 자동 소모

### 공격 결과 타입

| `result_type` | 트리거 조건 | 효과 |
|---|---|---|
| `LOOT` | Storage HP 0 | 보관 GP 약탈 |
| `DEBUFF` | Workshop / Barracks HP 0 | 건물 기능 일시 정지 |
| `AUCTION` | Castle HP 0 | 영토 강제 경매 전환 |

---

## 식량 (Food) 시스템

### 소모 규칙

```
시간당 식량 소모 = Σ(보유 유닛 food_cost_per_hour × 수량)
```

- 식량은 `wallets.available_food`에서 자동 차감
- 초기 식량: `available_food = 100` (기본값)

### 식량 부족 시 자연 감소

| 상황 | 효과 |
|---|---|
| `available_food = 0` | 유닛 자연 감소 시작 |
| 감소 속도 | `UNIT_STARVATION_RATE`(기본 1마리/시간) |
| 우선 감소 대상 | 배치되지 않은 대기 유닛부터 (TBD) |

---

## 유닛 상태 관리

### 유닛 상태 구분

| `deployed_territory_id` 값 | 상태 | 설명 |
|---|---|---|
| `NULL` | 대기(Standby) | 보유 중이나 배치되지 않은 상태 |
| `영토 ID` | 배치(Deployed) | 특정 영토에 방어 배치된 상태 |

### 유닛 흐름

```
생산 (병영 필요)
  ↓
대기 (user 보유 풀)
  ↓ 배치 ↑ 회수
방어 배치 (영토)
  ↓
공성전 파견 (일시적)
  ↓
전투 손실 (일부 소멸)
```

---

## Zone 공략 순서

공격자는 반드시 외곽 → 내부 순서로 Zone을 클리어해야 합니다.

```
Zone 3 (외곽) 클리어
    ↓
Zone 2 (중간) 클리어
    ↓
Zone 1 (핵심) 공략
    ↓
Castle HP 0 → 영토 소유권 상실
```

- Zone 미클리어 시 다음 Zone 공격 불가 (`ZONE_NOT_CLEARED` 에러)
- 공격 선언 후 `SIEGE_COUNTDOWN_MINUTES`(30분) 후 자동 전투 계산
- 공격 쿨다운: `ATTACK_COOLDOWN_HOURS`(2시간) — 같은 영토 재공격 제한

---

## 트로피 증감

전투 결과에 따라 공격자·방어자 모두 트로피 변동

| 상황 | 트로피 변동 |
|---|---|
| 공격 성공 — Castle 파괴 | +50 |
| 공격 성공 — Workshop / Barracks | +25 |
| 공격 성공 — Storage | +20 |
| 공격 성공 — Wall / Tower | +5 |
| 공격 실패 | -20 |
| 방어 성공 — Castle 사수 | +30 |
| 방어 성공 — 일반 건물 | +10 |
| 방어 실패 — Castle 파괴됨 | -40 |
| 방어 실패 — 일반 건물 | -10 |

### 리그 티어

| 리그 | 최소 트로피 |
|---|---|
| 🥉 Bronze | 0 |
| 🥈 Silver | 500 (`LEAGUE_SILVER_MIN`) |
| 🥇 Gold | 1,500 (`LEAGUE_GOLD_MIN`) |
| 💎 Diamond | 4,000 (`LEAGUE_DIAMOND_MIN`) |
| 👑 Champion | 8,000 (`LEAGUE_CHAMPION_MIN`) |
