import { apiClient } from './client';
import type { AttackTokens, DeployUnitResponse, GarrisonUnit, ProduceUnitResponse, RecallUnitResponse, UnitsResponse } from '../types/military';

export function fetchAttackTokens(): Promise<AttackTokens> {
  return apiClient.get<AttackTokens>('/military/attack-tokens');
}

export function fetchUnits(): Promise<UnitsResponse> {
  return apiClient.get<UnitsResponse>('/military/units');
}

export function produceUnit(
  unitTypeId: number,
  quantity: number,
  locationId: number,
  locationType: 'ISLAND' | 'TERRITORY',
): Promise<ProduceUnitResponse> {
  return apiClient.post<ProduceUnitResponse>('/military/units', {
    unitTypeId,
    quantity,
    locationId,
    locationType,
  });
}

// 대기 유닛을 영토의 방어 건물에 주둔시킨다(출발 위치의 대기 스택에서 차감).
export function deployUnit(params: {
  territoryId: number;
  buildingId: number;
  unitTypeId: number;
  quantity: number;
  sourceLocationId: number;
  sourceLocationType: 'ISLAND' | 'TERRITORY';
}): Promise<DeployUnitResponse> {
  return apiClient.post<DeployUnitResponse>('/military/units/deploy', params);
}

// 특정 영토에 배치(주둔)된 내 유닛을 타입별로 조회한다(회수 목록용).
export function fetchTerritoryGarrison(territoryId: number): Promise<GarrisonUnit[]> {
  return apiClient.get<GarrisonUnit[]>(`/military/territory/${territoryId}/garrison`);
}

// 영토에 배치된 유닛을 귀속지 대기 스택으로 회수한다.
export function recallUnit(
  territoryId: number,
  unitTypeId: number,
  quantity: number,
): Promise<RecallUnitResponse> {
  return apiClient.post<RecallUnitResponse>('/military/units/recall', {
    territoryId,
    unitTypeId,
    quantity,
  });
}
