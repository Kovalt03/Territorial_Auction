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
  attackPower: number;
  defensePower: number;
  costGp: number;
  foodCost: number;
  requiredBarracksLevel: number;
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
