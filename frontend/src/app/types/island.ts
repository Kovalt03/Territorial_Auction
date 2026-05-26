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

export interface PlaceFromInventoryResponse {
  buildingId: number;
  buildingType: string;
  posX: number;
  posY: number;
  territoryId: number | null;
}
