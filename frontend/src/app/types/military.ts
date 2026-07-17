export interface AttackTokens {
  normalCount: number;
  precisionCount: number;
}

export interface UnitInfo {
  unitTypeId: number;
  name: string;
  displayName: string | null;
  icon: string | null;
  colorHex: string | null;
  quantity: number;
  deployedCount: number;
  idleCount: number;
  inTransitCount: number;
  attackPower: number;
  defensePower: number;
  costGp: number;
  foodCost: number;
  buildingDamage: number;
  requiredBarracksLevel: number;
}

// 자원 스코프 개편 후 유닛·식량은 위치(영토/섬)별로 그룹핑돼 내려온다.
export interface LocationUnits {
  locationType: 'TERRITORY' | 'ISLAND';
  locationId: number;
  coordX: number | null;
  coordY: number | null;
  unitCapacity: number;
  storedFood: number;
  units: UnitInfo[];
}

export interface UnitsResponse {
  locations: LocationUnits[];
}

export interface ProduceUnitResponse {
  unitTypeId: number;
  unitName: string;
  quantity: number;
  gpRemaining: number;
}
