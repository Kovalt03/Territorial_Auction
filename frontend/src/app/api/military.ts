import { apiClient } from './client';
import type { AttackTokens, ProduceUnitResponse, UnitsResponse } from '../types/military';

export function fetchAttackTokens(): Promise<AttackTokens> {
  return apiClient.get<AttackTokens>('/military/attack-tokens');
}

export function fetchUnits(): Promise<UnitsResponse> {
  return apiClient.get<UnitsResponse>('/military/units');
}

export function produceUnit(unitTypeId: number, quantity: number): Promise<ProduceUnitResponse> {
  return apiClient.post<ProduceUnitResponse>('/military/units', { unitTypeId, quantity });
}
