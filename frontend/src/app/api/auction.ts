import { apiClient } from './client';
import type { AuctionBidsResponse, PlaceBidResponse, MyBidsResponse, TerritoryAuctionHistoryResponse } from '../types/auction';

export function fetchAuctionBids(auctionId: number) {
  return apiClient.get<AuctionBidsResponse>(`/auctions/${auctionId}/bids`);
}

export function placeBidApi(auctionId: number, bidAmount: number) {
  return apiClient.post<PlaceBidResponse>(`/auctions/${auctionId}/bids`, { bidAmount });
}

export function fetchMyBids() {
  return apiClient.get<MyBidsResponse>('/auctions/my-bids');
}

export function fetchTerritoryAuctionHistory(territoryId: number) {
  return apiClient.get<TerritoryAuctionHistoryResponse>(`/auctions/territories/${territoryId}`);
}
