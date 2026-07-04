export interface AdminContinentComposition {
  continentId: number;
  name: string;
  minTrophyRequired: number | null;
  totalTerritories: number;
  gradeBreakdown: Record<string, number>;
  biddingCount: number;
  occupiedCount: number;
  idleCount: number;
}

export interface AdminContinentCompositionResponse {
  continents: AdminContinentComposition[];
}

export interface AdminTerritory {
  territoryId: number;
  coordX: number;
  coordY: number;
  grade: string;
  status: string;
  ownerNickname: string | null;
  auctionEnabled: boolean;
}

export interface AdminAuctionSetting {
  auctionEnabled: boolean;
}

export type StatusFilter = 'ALL' | 'BIDDING' | 'OCCUPIED' | 'IDLE';
export type GradeFilter = 'ALL' | 'S' | 'A' | 'B' | 'C' | 'D';

export interface AdminTerritoryListResponse {
  territories: AdminTerritory[];
}

export interface AdminLoginResponse {
  accessToken: string;
  totpEnrolled: boolean;
}

export interface TotpSetupResponse {
  secret: string;
  otpAuthUri: string;
}
