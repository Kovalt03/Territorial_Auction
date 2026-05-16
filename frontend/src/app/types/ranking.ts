export interface TerritoryHoldRankEntry {
  rank: number;
  userId: number;
  nickname: string;
  score: number;
  gradeBreakdown: Record<string, number>;
}

export interface TerritoryHoldRankingResponse {
  seasonId: number;
  seasonNumber: number;
  type: string;
  rankings: TerritoryHoldRankEntry[];
  myRank: number | null;
  myScore: number | null;
  updatedAt: string;
}

export interface AuctionSpendRankEntry {
  rank: number;
  userId: number;
  nickname: string;
  totalSpentAP: number;
}

export interface AuctionSpendRankingResponse {
  seasonId: number;
  seasonNumber: number;
  type: string;
  rankings: AuctionSpendRankEntry[];
  myRank: number | null;
  myScore: number | null;
  updatedAt: string;
}
