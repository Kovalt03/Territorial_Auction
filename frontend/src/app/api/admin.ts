import { apiClient } from './client';
import type {
  AdminContinentCompositionResponse,
  AdminContinentComposition,
  AdminTerritoryListResponse,
  AdminTerritory,
  AdminAuctionSetting,
  AdminUserListResponse,
  AdminUserDetail,
  AdminBulkResult,
  AdminUserBidListResponse,
  AdminUserActiveBid,
  AdminUserTerritoryListResponse,
  UserStatus,
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

export function fetchAdminUsers(params: {
  keyword?: string;
  status?: UserStatus;
  page: number;
  size: number;
}) {
  const qs = new URLSearchParams();
  if (params.keyword) qs.set('keyword', params.keyword);
  if (params.status) qs.set('status', params.status);
  qs.set('page', String(params.page));
  qs.set('size', String(params.size));
  return apiClient.get<AdminUserListResponse>(`/admin/users?${qs.toString()}`);
}

export function fetchAdminUser(userId: number) {
  return apiClient.get<AdminUserDetail>(`/admin/users/${userId}`);
}

export function changeUserStatus(userId: number, status: UserStatus, reason: string) {
  return apiClient.patch<AdminUserDetail>(`/admin/users/${userId}/status`, { status, reason });
}

export function adjustUserWallet(
  userId: number,
  apDelta: number,
  gpDelta: number,
  reason: string,
) {
  return apiClient.post<AdminUserDetail>(`/admin/users/${userId}/wallet/adjust`, {
    apDelta,
    gpDelta,
    reason,
  });
}

export function bulkAdjustWallet(
  userIds: number[],
  apDelta: number,
  gpDelta: number,
  reason: string,
) {
  return apiClient.post<AdminBulkResult>('/admin/users/bulk/wallet-adjust', {
    userIds,
    apDelta,
    gpDelta,
    reason,
  });
}

export function bulkChangeUserStatus(userIds: number[], status: UserStatus, reason: string) {
  return apiClient.post<AdminBulkResult>('/admin/users/bulk/status', { userIds, status, reason });
}

export function fetchUserBids(userId: number, page: number, size = 20) {
  return apiClient.get<AdminUserBidListResponse>(
    `/admin/users/${userId}/bids?page=${page}&size=${size}`,
  );
}

export function fetchUserActiveBids(userId: number) {
  return apiClient.get<{ activeBids: AdminUserActiveBid[] }>(
    `/admin/users/${userId}/active-bids`,
  );
}

export function fetchUserTerritories(userId: number, page: number, size = 20) {
  return apiClient.get<AdminUserTerritoryListResponse>(
    `/admin/users/${userId}/territories?page=${page}&size=${size}`,
  );
}

export function sendUserNotification(userId: number, message: string) {
  return apiClient.post<null>(`/admin/users/${userId}/notifications`, { message });
}
