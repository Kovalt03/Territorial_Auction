import { apiClient } from './client';
import type { BuildingTypeInfo } from '../types/island';
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
  AdminAuditLogListResponse,
  AdminChatRoom,
  AdminChatMessageListResponse,
  AdminDashboard,
  AdminSeason,
  AdminItem,
  AdminAuctionListResponse,
  Announcement,
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

export function changeContinentAuction(continentId: number, enabled: boolean, reason: string) {
  return apiClient.patch<AdminBulkResult>(`/admin/continents/${continentId}/auction`, {
    enabled,
    reason,
  });
}

export function bulkChangeTerritoryGrade(territoryIds: number[], grade: string, reason: string) {
  return apiClient.patch<AdminBulkResult>('/admin/territories/bulk/grade', {
    territoryIds,
    grade,
    reason,
  });
}

export function bulkChangeTerritoryAuction(
  territoryIds: number[],
  enabled: boolean,
  reason: string,
) {
  return apiClient.patch<AdminBulkResult>('/admin/territories/bulk/auction', {
    territoryIds,
    enabled,
    reason,
  });
}

export function bulkForceStartTerritories(territoryIds: number[], reason: string) {
  return apiClient.post<AdminBulkResult>('/admin/territories/bulk/force-start', {
    territoryIds,
    reason,
  });
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

export function bulkSendNotification(userIds: number[], message: string) {
  return apiClient.post<AdminBulkResult>('/admin/users/bulk/notifications', { userIds, message });
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

export function fetchAuditLogs(params: {
  action?: string;
  targetType?: string;
  page: number;
  size?: number;
}) {
  const qs = new URLSearchParams();
  if (params.action) qs.set('action', params.action);
  if (params.targetType) qs.set('targetType', params.targetType);
  qs.set('page', String(params.page));
  qs.set('size', String(params.size ?? 30));
  return apiClient.get<AdminAuditLogListResponse>(`/admin/audit-logs?${qs.toString()}`);
}

export function fetchChatRooms() {
  return apiClient.get<AdminChatRoom[]>('/admin/chat/rooms');
}

export function fetchChatMessages(params: {
  roomId?: number;
  keyword?: string;
  page: number;
  size?: number;
}) {
  const qs = new URLSearchParams();
  if (params.roomId != null) qs.set('roomId', String(params.roomId));
  if (params.keyword) qs.set('keyword', params.keyword);
  qs.set('page', String(params.page));
  qs.set('size', String(params.size ?? 30));
  return apiClient.get<AdminChatMessageListResponse>(`/admin/chat/messages?${qs.toString()}`);
}

export function deleteChatMessage(messageId: number) {
  return apiClient.delete<null>(`/admin/chat/messages/${messageId}`);
}

export function fetchDashboard() {
  return apiClient.get<AdminDashboard>('/admin/dashboard');
}

export function fetchSeasons() {
  return apiClient.get<{ seasons: AdminSeason[] }>('/admin/seasons');
}

export function createSeason(startedAt?: string, endedAt?: string) {
  return apiClient.post<AdminSeason>('/admin/seasons', {
    startedAt: startedAt ?? null,
    endedAt: endedAt ?? null,
  });
}

export function endSeason(seasonId: number) {
  return apiClient.patch<AdminSeason>(`/admin/seasons/${seasonId}/end`, {});
}

export function fetchItems() {
  return apiClient.get<{ items: AdminItem[] }>('/admin/items');
}

export function updateItem(
  itemId: number,
  costAp: number | null,
  costGp: number | null,
  dailyLimit: number | null,
) {
  return apiClient.patch<AdminItem>(`/admin/items/${itemId}`, { costAp, costGp, dailyLimit });
}

export function grantItem(userId: number, itemId: number, quantity: number, reason: string) {
  return apiClient.post<null>('/admin/items/grant', { userId, itemId, quantity, reason });
}

export function fetchActiveAuctions(page: number, size = 20) {
  return apiClient.get<AdminAuctionListResponse>(`/admin/auctions?page=${page}&size=${size}`);
}

export function forceSettleAuction(auctionId: number) {
  return apiClient.post<null>(`/admin/auctions/${auctionId}/settle`, {});
}

export function forceCancelAuction(auctionId: number) {
  return apiClient.post<null>(`/admin/auctions/${auctionId}/cancel`, {});
}

export function fetchAnnouncement() {
  return apiClient.get<Announcement>('/announcement');
}

export function fetchAdminAnnouncement() {
  return apiClient.get<Announcement>('/admin/announcement');
}

export function updateAnnouncement(active: boolean, message: string) {
  return apiClient.patch<Announcement>('/admin/announcement', { active, message });
}

export interface BuildingTypeForm {
  name?: string;
  width: number;
  height: number;
  maxHp: number;
  baseCostGp: number;
  zoneRestriction: number | null;
  defensePower: number | null;
  foodProductionRate: number | null;
  unitCapacityPerLevel: number | null;
  gpProductionRate: number | null;
  icon: string | null;
  colorHex: string | null;
}

export function fetchAdminBuildingTypes() {
  return apiClient.get<{ buildingTypes: BuildingTypeInfo[] }>('/admin/building-types').then(r => r.buildingTypes);
}

export function createBuildingType(form: BuildingTypeForm) {
  return apiClient.post<BuildingTypeInfo>('/admin/building-types', form);
}

export function updateBuildingType(id: number, form: BuildingTypeForm) {
  return apiClient.patch<BuildingTypeInfo>(`/admin/building-types/${id}`, form);
}

export function deleteBuildingType(id: number) {
  return apiClient.delete<null>(`/admin/building-types/${id}`);
}
