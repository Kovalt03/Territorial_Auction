import { useState, useEffect, useCallback } from 'react';

import { fetchIsland } from '../api/island';
import type { IslandData } from '../types/island';

export function useIsland() {
  const [island, setIsland] = useState<IslandData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchIsland();
      setIsland(data);
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status !== 401) setError('섬 데이터를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { island, isLoading, error, reload: load };
}
