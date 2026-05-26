import { useState, useEffect, useRef } from 'react';

import { fetchUnits } from '../api/military';
import { ApiError } from '../api/client';
import type { UnitsResponse } from '../types/military';

export function useMilitary() {
  const [data, setData] = useState<UnitsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadedRef = useRef(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const result = await fetchUnits();
      setData(result);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLoading, reload: load };
}
