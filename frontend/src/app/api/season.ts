import { apiClient } from './client';
import type { MySeasonPassResponse, PurchaseSeasonPassResponse } from '../types/season';

export function fetchMySeasonPass() {
  return apiClient.get<MySeasonPassResponse>('/season-pass/me');
}

export function purchaseSeasonPass() {
  return apiClient.post<PurchaseSeasonPassResponse>('/season-pass/purchase', {});
}
