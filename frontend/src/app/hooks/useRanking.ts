import { fetchTerritoryHoldRanking, fetchAuctionSpendRanking } from '../api/ranking';
import type { TerritoryHoldRankingResponse, AuctionSpendRankingResponse } from '../types/ranking';
import { useFetch } from './useFetch';

export function useTerritoryHoldRanking() {
  return useFetch<TerritoryHoldRankingResponse>(fetchTerritoryHoldRanking, '랭킹 데이터를 불러올 수 없습니다.');
}

export function useAuctionSpendRanking() {
  return useFetch<AuctionSpendRankingResponse>(fetchAuctionSpendRanking, '랭킹 데이터를 불러올 수 없습니다.');
}
