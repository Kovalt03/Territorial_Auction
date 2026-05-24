import { apiClient } from './client';

export interface DeclareSiegeRequest {
  targetTerritoryId: number;
  attackZone: number;
  attackType: 'NORMAL' | 'PRECISION';
  units: { unitTypeId: number; quantity: number }[];
}

export interface SiegeSummary {
  siegeId: number;
  attackerId: number;
  attackerNickname: string;
  defenderId: number;
  defenderNickname: string;
  targetTerritoryId: number;
  status: string;
  startedAt: string;
}

export interface SiegeListResponse {
  sieges: SiegeSummary[];
}

export function declareSiege(req: DeclareSiegeRequest) {
  return apiClient.post<{ siegeId: number }>('/military/sieges', req);
}

export function fetchSiegeList() {
  return apiClient.get<SiegeListResponse>('/military/sieges');
}

export function fetchSiegeDetail(siegeId: number) {
  return apiClient.get<SiegeSummary>(`/military/sieges/${siegeId}`);
}
