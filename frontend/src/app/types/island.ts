export interface IslandBuilding {
  buildingId: number;
  type: string;
  posX: number;
  posY: number;
  hp: number;
  maxHp: number;
  level: number;
  width: number;
  height: number;
  isDestroyed: boolean;
}

export interface IslandData {
  islandId: number;
  grade: string;
  gridSize: number;
  level: number;
  productionRate: number;
  lastHarvestAt: string;
  accumulatedGp: number;
  zone1Radius: number;
  zone2Radius: number;
  buildings: IslandBuilding[];
}

export interface HarvestIslandGpResponse {
  harvestedGp: number;
  gpBalance: number;
  lastHarvestAt: string;
}

export interface PlaceIslandBuildingResponse {
  buildingId: number;
  type: string;
  posX: number;
  posY: number;
  gpRemaining: number;
}

export interface InventoryItem {
  inventoryId: number;
  buildingTypeId: number;
  buildingTypeName: string;
  buildingType: string;
  quantity: number;
  acquiredAt: string;
}

export interface UpgradeBuildingResponse {
  buildingId: number;
  newLevel: number;
  nextLevel: number | null;
  maxLevel: number;
  upgradeCost: number;
  gpRemaining: number;
}

export interface PlaceFromInventoryResponse {
  buildingId: number;
  buildingType: string;
  posX: number;
  posY: number;
  territoryId: number | null;
}

export interface BuildingTypeInfo {
  buildingTypeId: number;
  name: string;
  width: number;
  height: number;
  maxHp: number;
  baseCostGp: number;
  zoneRestriction: number | null;
  defensePower: number | null;
  foodProductionRate: number | null;
  unitCapacityPerLevel: number | null;
  gpProductionRate: number | null;
  icon: string | null;
  colorHex: string | null;
}
