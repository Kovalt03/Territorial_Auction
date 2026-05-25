import { apiClient } from './client';

export interface AttackTokens {
  normalCount: number;
  precisionCount: number;
}

export interface CreateUnitRequest {
  unitTypeId: number;
  quantity: number;
}

export interface CreateUnitResponse {
  remainingGP: number;
  totalOwned: number;
}

export function fetchAttackTokens() {
  return apiClient.get<AttackTokens>('/military/attack-tokens');
}

export function createUnit(req: CreateUnitRequest) {
  return apiClient.post<CreateUnitResponse>('/military/units', req);
}
