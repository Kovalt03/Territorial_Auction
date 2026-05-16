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
