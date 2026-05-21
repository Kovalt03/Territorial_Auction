# 건물 세부 스펙

> 출처: `building_types` 테이블 + 기획서

---

## 건물 타입 목록

| ID | name | 한글명 | Zone 제약 | 크기 (W×H) | 최대 HP | 건설 비용 (GP) |
|---|---|---|---|---|---|---|
| 1 | `CASTLE` | 성 | Zone 1 전용 | 2×2 | 200 | TBD |
| 2 | `STORAGE` | 저장소 | 제한 없음 | 2×2 | 100 | TBD |
| 3 | `WORKSHOP` | 생산소 | 제한 없음 | 2×1 | 80 | TBD |
| 4 | `BARRACKS` | 병영 | 제한 없음 | 2×2 | 100 | TBD |
| 5 | `WALL` | 방벽 | 제한 없음 | 1×1 | 60 | TBD |
| 6 | `TOWER` | 방어탑 | 제한 없음 | 1×1 | 80 | TBD |
| 7 | `FARMLAND` | 농경지 | Zone 2/3 전용 | 2×2 | 80 | TBD |
| 8 | `RESIDENCE` | 숙소 | 제한 없음 | 2×2 | 80 | TBD |

> **TBD**: 정확한 수치는 서버 `building_types` 시드 데이터에서 결정. 위 수치는 설계 참고용 예시.

---

## 건물별 기능 및 파괴 효과

### 성 (Castle)

| 항목 | 내용 |
|---|---|
| **기능** | 영토의 핵심 구조물. 영토당 반드시 1개 필수. |
| **배치 제약** | Zone 1에만 배치 가능 |
| **파괴 효과** | HP 0 → 영토 경매 강제 전환 (`result_type = AUCTION`) |
| **레벨업 효과** | 기본 유닛 슬롯 증가 |
| **유닛 슬롯** | 레벨 1 → 5슬롯 / 레벨 2 → 10슬롯 / 레벨 3 → 15슬롯 |
| **특이사항** | Castle 점령 = 영토 소유권 상실. 가장 중요한 방어 목표. |

---

### 저장소 (Storage)

| 항목 | 내용 |
|---|---|
| **기능** | 영토 내 자원(GP) 보관. 최대 보관 용량 존재. |
| **배치 제약** | 없음 |
| **파괴 효과** | HP 0 → 보관 중인 GP 일정 비율 약탈 (`result_type = LOOT`) |
| **레벨업 효과** | 보관 용량 증가 |

---

### 생산소 (Workshop)

| 항목 | 내용 |
|---|---|
| **기능** | 시간당 GP 생산. `BuildingType.gpProductionRate × level` |
| **배치 제약** | 없음 |
| **파괴 효과** | HP 0 → `WORKSHOP_DEBUFF_HOURS`(12시간) 동안 GP 생산 중단. 수리 후에도 디버프 시간이 남아있으면 생산 재개 불가. |
| **레벨업 효과** | 시간당 GP 생산량 증가 |
| **생산 공식** | `gpProductionRate × level` (시간당) |
| **스케줄러** | 1시간 주기로 소유 생산소 합산 생산량을 wallet에 적립 |
| **디버프 조건** | Zone 2 클리어 시 WORKSHOP HP가 0이 되면 `building_instances.workshop_debuff_until` 설정 |

---

### 병영 (Barracks)

| 항목 | 내용 |
|---|---|
| **기능** | 생산 가능한 유닛 레벨 결정. 병영이 있는 영토에서만 유닛 생산 가능. |
| **배치 제약** | 없음 |
| **파괴 효과** | HP 0 → 유닛 생산 불가 (파괴 중에는 모든 레벨 생산 차단) |
| **레벨업 효과** | 생산 가능 유닛 레벨 상승 |
| **레벨-유닛 제한** | 병영 레벨 N → 유닛 레벨 N 이하만 생산 가능 |

---

### 방벽 (Wall)

| 항목 | 내용 |
|---|---|
| **기능** | Zone 방어력 기여. `BuildingEffect.defense_power` 합산. |
| **배치 제약** | 없음 |
| **파괴 효과** | HP 0 → Zone 클리어 조건 계산에 포함 (방어력 0으로 처리) |
| **레벨업 효과** | 방어력 및 최대 HP 증가 |
| **비고** | 순수 방어용. 전투 계산 DEF에 직접 반영. |

---

### 방어탑 (Tower)

| 항목 | 내용 |
|---|---|
| **기능** | 자동 방어 + 방어력 기여. Wall보다 높은 방어력. |
| **배치 제약** | 없음 |
| **파괴 효과** | HP 0 → Zone 클리어 조건 계산에 포함 (방어력 0으로 처리) |
| **레벨업 효과** | 방어력 및 HP 증가 |
| **비고** | Wall 대비 비용이 높으나 방어력도 높음. |

---

### 농경지 (Farmland)

| 항목 | 내용 |
|---|---|
| **기능** | 시간당 식량 생산. `wallet.available_food`에 적립. |
| **배치 제약** | Zone 2/3에만 배치 가능 (Zone 1 내부 배치 불가) |
| **파괴 효과** | HP 0 → 해당 농경지 식량 생산 중단 |
| **레벨업 효과** | 시간당 식량 생산량 증가 |
| **생산 공식** | `foodProductionRate × level` (시간당) |
| **스케줄러** | 1시간 주기로 소유 농경지 합산 생산량을 wallet에 적립 |

---

### 숙소 (Residence)

| 항목 | 내용 |
|---|---|
| **기능** | 추가 유닛 슬롯 제공. |
| **배치 제약** | 없음 |
| **파괴 효과** | HP 0 → 해당 숙소의 유닛 슬롯 소실 (기존 보유 유닛은 유지, 신규 생산 불가) |
| **레벨업 효과** | 유닛 슬롯 추가 |
| **슬롯 공식** | `unitCapacityPerLevel × level` |

---

## 유닛 슬롯 전체 공식

```
총 유닛 상한 = CASTLE 기본 슬롯 + Σ(residence.level × RESIDENCE.unitCapacityPerLevel)
```

- CASTLE 기본 슬롯은 `MilitaryPolicy` 상수로 관리 (레벨 1→5 / 2→10 / 3→15)
- `RESIDENCE.unitCapacityPerLevel = 5` (레벨당 5슬롯 추가)
- 상한 초과 시 유닛 생산 차단 (`ErrorCode.UNIT_CAPACITY_EXCEEDED`)

---

## 식량 시스템

```
생산: FARMLAND 스케줄러 → wallet.available_food += Σ(farmland.level × foodProductionRate)  (1시간 주기)
소모: 유닛 생산 시      → wallet.available_food -= unitType.foodCost  (1회성)
```

- 식량 부족 시 유닛 생산 불가 (`ErrorCode.FOOD_INSUFFICIENT`)
- `UnitType.foodCost`: 유닛 생산 1회 소모 식량 (기존 `foodCostPerHour` 대체)

---

## 건물 공통 규칙

### 배치 규칙

- 같은 셀 중복 배치 불가
- Castle은 영토당 **반드시 1개** (2개 이상 배치 불가)
- 건물 크기(`width × height`)에 맞는 연속된 빈 셀 필요
- 섬(`home_islands`) 건물도 동일 `building_types` 사용

### Zone 배치 기준

```
┌─────────────────────────────┐
│         Zone 3 (외곽)        │
│   ┌─────────────────────┐   │
│   │     Zone 2 (중간)    │   │
│   │   ┌─────────────┐   │   │
│   │   │  Zone 1     │   │   │
│   │   │  (핵심·성)  │   │   │
│   │   └─────────────┘   │   │
│   └─────────────────────┘   │
└─────────────────────────────┘
```

- `ZONE_BOUNDARIES: [2, 4]` — 좌표 기준 Zone 경계 (config)
- Castle은 반드시 Zone 1에 위치
- FARMLAND는 Zone 2/3에만 배치 가능

### 파괴 & 수리

- HP 0 → `is_destroyed = true` → 효과 즉시 정지
- 수리: GP 소비 → `is_destroyed = false`, HP 최대치 복원
- 파괴된 건물은 방어력 계산에서 제외됨

### Zone 클리어 조건

```
Σ(Zone 내 건물 현재 HP) / Σ(Zone 내 건물 최대 HP) < (1 - ZONE_CLEAR_THRESHOLD)
```

- `ZONE_CLEAR_THRESHOLD: 0.5` (기본값 — 50% 이상 파괴 시 Zone 클리어)
- Zone 클리어 후 다음 Zone 공격 가능

### 레벨업

- 레벨당 GP 비용: `base_cost_gp × level` (TBD — 정확한 배율 미정)
- 최대 레벨: TBD

---

## 영토 등급별 내부 그리드 크기

| 등급 | 내부 그리드 | 건물 배치 가능 셀 수 |
|---|---|---|
| S | 12×12 | 144 |
| A | 10×10 | 100 |
| B | 8×8 | 64 |
| C | 6×6 | 36 |
| D | 5×5 | 25 (TBD) |

> `TerritoryGrade.grid_size`로 관리
