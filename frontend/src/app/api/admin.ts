import { apiClient } from './client';
import type {
  AdminContinentCompositionResponse,
  AdminContinentComposition,
  AdminTerritoryListResponse,
  AdminTerritory,
  AdminAuctionSetting,
  AdminLoginResponse,
  TotpSetupResponse,
} from '../types/admin';

export function adminLogin(email: string, password: string, totpCode?: string) {
  return apiClient.post<AdminLoginResponse>('/admin/auth/login', {
    email,
    password,
    totpCode: totpCode || null,
  });
}

export function setupAdminTotp() {
  return apiClient.post<TotpSetupResponse>('/admin/auth/totp/setup', {});
}

export function fetchAdminContinents() {
  return apiClient.get<AdminContinentCompositionResponse>('/admin/continents');
}

export function fetchAdminTerritories(continentId: number) {
  return apiClient.get<AdminTerritoryListResponse>(`/admin/continents/${continentId}/territories`);
}

export function changeTerritoryGrade(territoryId: number, grade: string, reason: string) {
  return apiClient.patch<AdminTerritory>(`/admin/territories/${territoryId}/grade`, {
    grade,
    reason,
  });
}

export function applyGradeDistribution(
  continentId: number,
  distribution: Record<string, number>,
  reason: string,
) {
  return apiClient.patch<AdminContinentComposition>(
    `/admin/continents/${continentId}/grade-distribution`,
    { distribution, reason },
  );
}

export function changeTerritoryAuction(territoryId: number, enabled: boolean, reason: string) {
  return apiClient.patch<AdminTerritory>(`/admin/territories/${territoryId}/auction`, {
    enabled,
    reason,
  });
}

export function forceStartAuction(territoryId: number) {
  return apiClient.post<AdminTerritory>(
    `/admin/territories/${territoryId}/auction/force-start`,
    {},
  );
}

export function fetchAuctionSetting() {
  return apiClient.get<AdminAuctionSetting>('/admin/settings/auction');
}

export function setAuctionSetting(enabled: boolean) {
  return apiClient.patch<AdminAuctionSetting>('/admin/settings/auction', { enabled });
}
