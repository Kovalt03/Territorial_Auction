import { apiClient } from './client';
import type { AuctionBidsResponse, PlaceBidResponse, MyBidsResponse } from '../types/auction';

export function fetchAuctionBids(auctionId: number) {
  return apiClient.get<AuctionBidsResponse>(`/auctions/${auctionId}/bids`);
}

export function placeBidApi(auctionId: number, bidAmount: number) {
  return apiClient.post<PlaceBidResponse>(`/auctions/${auctionId}/bids`, { bidAmount });
}

export function fetchMyBids() {
  return apiClient.get<MyBidsResponse>('/auctions/my-bids');
}

interface TerritoryAuctionHistoryResponse {
  territoryId: number;
  histories: { auctionId: number; winnerNickname: string; finalPrice: number; wonAt: string }[];
}

export function fetchTerritoryAuctionHistory(territoryId: number) {
  return apiClient.get<TerritoryAuctionHistoryResponse>(`/territories/${territoryId}/auction-history`);
}
