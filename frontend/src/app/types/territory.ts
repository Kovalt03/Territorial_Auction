export interface TerritoryBuilding {
  buildingId: number;
  type: string;
  level: number;
  hp: number;
  maxHp: number;
}

export interface TerritoryOwner {
  userId: number;
  nickname: string;
  currentColor: string;
}

export interface TerritoryAuction {
  auctionId: number;
  currentPrice: number;
  endAt: string;
}

export interface TerritoryDetailResponse {
  territoryId: number;
  coordX: number;
  coordY: number;
  continentName: string;
  grade: string;
  gradeMultiplier: number;
  gridSize: number;
  status: string;
  owner: TerritoryOwner | null;
  baseProductionRate: number;
  isInvincible: boolean;
  buildings: TerritoryBuilding[];
  auction: TerritoryAuction | null;
}
