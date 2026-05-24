import { useState, useEffect } from 'react';

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  errorMsg = '데이터를 불러올 수 없습니다.',
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchFn()
      .then(setData)
      .catch(() => setError(errorMsg))
      .finally(() => setIsLoading(false));
    // fetchFn은 컴포넌트 외부에서 정의된 stable 참조여야 함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, isLoading, error };
}
