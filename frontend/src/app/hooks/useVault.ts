import { useState, useEffect, useCallback } from 'react';

import { fetchGlobalVault, fetchMyTerritories } from '../api/vault';
import type { GlobalVaultResponse, MyTerritory } from '../types/vault';

export function useVault() {
  const [vault, setVault] = useState<GlobalVaultResponse | null>(null);
  const [territories, setTerritories] = useState<MyTerritory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vaultData, territoryData] = await Promise.all([
        fetchGlobalVault(),
        fetchMyTerritories(),
      ]);
      setVault(vaultData);
      setTerritories(territoryData.territories);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status !== 401) setError('금고 데이터를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateVault = (storedGP: number, nextTransferAvailableAt: string | null) => {
    setVault(prev => prev ? { ...prev, storedGP, nextTransferAvailableAt, isTransferAvailable: false } : prev);
  };

  return { vault, territories, isLoading, error, reload: load, updateVault };
}
