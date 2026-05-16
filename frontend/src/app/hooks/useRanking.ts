import { useState, useEffect } from 'react';

import { fetchTerritoryHoldRanking, fetchAuctionSpendRanking } from '../api/ranking';
import type { TerritoryHoldRankingResponse, AuctionSpendRankingResponse } from '../types/ranking';

export function useTerritoryHoldRanking() {
  const [data, setData] = useState<TerritoryHoldRankingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTerritoryHoldRanking()
      .then(setData)
      .catch(() => setError('랭킹 데이터를 불러올 수 없습니다.'))
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading, error };
}

export function useAuctionSpendRanking() {
  const [data, setData] = useState<AuctionSpendRankingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuctionSpendRanking()
      .then(setData)
      .catch(() => setError('랭킹 데이터를 불러올 수 없습니다.'))
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading, error };
}
