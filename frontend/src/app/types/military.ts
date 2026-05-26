export interface AttackTokens {
  normalCount: number;
  precisionCount: number;
}

export interface UnitInfo {
  unitTypeId: number;
  name: string;
  quantity: number;
  deployedCount: number;
  idleCount: number;
  attackPower: number;
  defensePower: number;
  foodCost: number;
}

export interface UnitsResponse {
  units: UnitInfo[];
  availableFood: number;
}

export interface ProduceUnitResponse {
  unitTypeId: number;
  unitName: string;
  quantity: number;
  gpRemaining: number;
}
