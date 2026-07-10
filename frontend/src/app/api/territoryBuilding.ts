import { apiClient } from './client';

import type { TerritoryGridBuilding } from '../types/territory';
import type { PlaceIslandBuildingResponse, UpgradeBuildingResponse } from '../types/island';

export function fetchTerritoryBuildings(territoryId: number): Promise<TerritoryGridBuilding[]> {
  return apiClient
    .get<{ buildings: TerritoryGridBuilding[] }>(`/map/territories/${territoryId}/buildings`)
    .then(r => r.buildings);
}

export function placeTerritoryBuilding(territoryId: number, buildingTypeId: number, posX: number, posY: number) {
  return apiClient.post<PlaceIslandBuildingResponse>(`/map/territories/${territoryId}/buildings`, {
    buildingTypeId,
    posX,
    posY,
  });
}

export function placeFromInventoryOnTerritory(inventoryId: number, territoryId: number, posX: number, posY: number) {
  return apiClient.post<unknown>(`/inventory/${inventoryId}/place`, { territoryId, posX, posY });
}

export function upgradeTerritoryBuilding(buildingId: number): Promise<UpgradeBuildingResponse> {
  return apiClient.post<UpgradeBuildingResponse>(`/buildings/${buildingId}/upgrade`, {});
}
