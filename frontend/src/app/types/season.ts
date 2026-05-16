export interface MySeasonPassResponse {
  hasSeasonPass: boolean;
  seasonPass: {
    seasonPassId: number;
    name: string;
    startedAt: string;
    expiresAt: string;
    daysRemaining: number;
    benefits: {
      islandBonusPct: number;
      extraBuilders: number;
      taxExemptBonus: number;
    };
  } | null;
}

export interface PurchaseSeasonPassResponse {
  seasonPassId: number;
  name: string;
  startedAt: string;
  expiresAt: string;
  costAP: number;
  remainingAP: number;
  benefits: {
    islandBonusPct: number;
    extraBuilders: number;
    taxExemptBonus: number;
  };
}
