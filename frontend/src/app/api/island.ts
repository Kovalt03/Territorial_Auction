import { apiClient } from './client';
import type { IslandData } from '../types/island';

export function fetchIsland() {
  return apiClient.get<IslandData>('/island');
}

export function storeBuilding(buildingId: number) {
  return apiClient.post<unknown>(`/buildings/${buildingId}/store`, {});
}

export function moveBuilding(buildingId: number, posX: number, posY: number) {
  return apiClient.patch<unknown>(`/buildings/${buildingId}/move`, { posX, posY });
}
