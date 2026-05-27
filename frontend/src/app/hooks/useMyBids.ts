import { useState, useEffect } from 'react';

import { fetchMyBids } from '../api/auction';
import type { MyBidEntry } from '../types/auction';

export function useMyBids() {
  const [bids, setBids] = useState<MyBidEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyBids()
      .then(data => setBids(data.bids))
      .catch(() => setBids([]))
      .finally(() => setIsLoading(false));
  }, []);

  const refresh = () => {
    fetchMyBids()
      .then(data => setBids(data.bids))
      .catch(() => {});
  };

  return { bids, isLoading, refresh };
}
