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

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';
export type UserStatusFilter = 'ALL' | UserStatus;

export interface AdminUser {
  userId: number;
  username: string;
  nickname: string;
  email: string;
  status: UserStatus;
  role: 'USER' | 'ADMIN';
  createdAt: string;
}

export interface AdminUserListResponse {
  totalCount: number;
  page: number;
  size: number;
  users: AdminUser[];
}

export interface AdminUserDetail extends AdminUser {
  availableAp: number;
  lockedAp: number;
  availableGp: number;
  availableFood: number;
  territoryCount: number;
}

export interface AdminUserBid {
  auctionId: number;
  territoryId: number;
  coordX: number;
  coordY: number;
  continentName: string;
  grade: string;
  myBidPrice: number;
  currentPrice: number;
  bidAt: string;
  ongoing: boolean;
}

export interface AdminUserBidListResponse {
  totalCount: number;
  page: number;
  size: number;
  bids: AdminUserBid[];
}

export interface AdminUserActiveBid {
  auctionId: number;
  territoryId: number;
  coordX: number;
  coordY: number;
  continentName: string;
  grade: string;
  myBidPrice: number;
  currentPrice: number;
  topBidder: boolean;
  endAt: string;
}

export interface AdminUserTerritory {
  territoryId: number;
  coordX: number;
  coordY: number;
  continentName: string;
  grade: string;
  status: string;
  occupiedUntil: string | null;
}

export interface AdminUserTerritoryListResponse {
  totalCount: number;
  page: number;
  size: number;
  territories: AdminUserTerritory[];
}

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
