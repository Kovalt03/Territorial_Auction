import { apiClient } from './client';
import type {
  AdminContinentCompositionResponse,
  AdminTerritoryListResponse,
  AdminTerritory,
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
