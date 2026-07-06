import { apiClient } from './client';
import type { BuildingTypeInfo, HarvestIslandGpResponse, InventoryItem, IslandData, PlaceFromInventoryResponse, PlaceIslandBuildingResponse, UpgradeBuildingResponse } from '../types/island';

export function fetchIsland() {
  return apiClient.get<IslandData>('/island');
}

export function fetchBuildingTypes(): Promise<BuildingTypeInfo[]> {
  return apiClient.get<{ buildingTypes: BuildingTypeInfo[] }>('/building-types').then(r => r.buildingTypes);
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

export function fetchBuildingInventory(): Promise<InventoryItem[]> {
  return apiClient.get<{ items: InventoryItem[] }>('/inventory').then(r => r.items);
}

export function placeFromInventoryOnIsland(inventoryId: number, posX: number, posY: number): Promise<PlaceFromInventoryResponse> {
  return apiClient.post<PlaceFromInventoryResponse>(`/inventory/${inventoryId}/place-on-island`, { posX, posY });
}

export function harvestIslandGp(): Promise<HarvestIslandGpResponse> {
  return apiClient.post<HarvestIslandGpResponse>('/island/harvest', {});
}

export function upgradeBuilding(buildingId: number): Promise<UpgradeBuildingResponse> {
  return apiClient.post<UpgradeBuildingResponse>(`/buildings/${buildingId}/upgrade`, {});
}
