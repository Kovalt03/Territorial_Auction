import { apiClient } from './client';

export type SiegeStructureType = 'STAGING' | 'TOWER' | 'SUPPLY';

export interface ForceEntry {
  unitTypeId: number;
  quantity: number;
}

export interface StructureEntry {
  type: SiegeStructureType;
  coordX: number;
  coordY: number;
}

// 백엔드 DeclareSiegeRequest 계약. forces=커밋 병력, structures=공성 건물(주둔지 최소 1개).
export interface DeclareSiegeRequest {
  targetTerritoryId: number;
  targetBuildingId?: number | null;
  attackZone: number;
  forces: ForceEntry[];
  structures: StructureEntry[];
}

export interface DeclareSiegeResponse {
  siegeId: number;
  resolveAt: string;
  attackTokenRemaining: number;
}

export function declareSiege(req: DeclareSiegeRequest): Promise<DeclareSiegeResponse> {
  return apiClient.post<DeclareSiegeResponse>('/military/siege', req);
}

export interface SiegeResult {
  siegeId: number;
  isAttackerWin: boolean;
  attackerUnitsLost: number;
  defenderUnitsLost: number;
  lootedGp: number;
  resultType: string | null;
  resolvedAt: string;
}

export function fetchSiegeResult(siegeId: number): Promise<SiegeResult> {
  return apiClient.get<SiegeResult>(`/military/siege/${siegeId}/result`);
}
