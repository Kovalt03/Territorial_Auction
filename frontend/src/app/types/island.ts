export interface IslandBuilding {
  buildingId: number;
  type: string;
  posX: number;
  posY: number;
  hp: number;
  maxHp: number;
  level: number;
  isDestroyed: boolean;
}

export interface IslandData {
  islandId: number;
  gridSize: number;
  level: number;
  productionRate: number;
  buildings: IslandBuilding[];
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
