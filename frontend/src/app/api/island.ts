import { apiClient } from './client';
import type { InventoryItem, IslandData, PlaceIslandBuildingResponse } from '../types/island';

export function fetchIsland() {
  return apiClient.get<IslandData>('/island');
}

export function placeIslandBuilding(buildingTypeId: number, posX: number, posY: number) {
  return apiClient.post<PlaceIslandBuildingResponse>('/island/buildings', { buildingTypeId, posX, posY });
}

export function storeBuilding(buildingId: number) {
  return apiClient.post<unknown>(`/buildings/${buildingId}/store`, {});
}

export function moveBuilding(buildingId: number, posX: number, posY: number) {
  return apiClient.patch<unknown>(`/buildings/${buildingId}/move`, { posX, posY });
}

export function fetchBuildingInventory() {
  return apiClient.get<InventoryItem[]>('/inventory');
}
