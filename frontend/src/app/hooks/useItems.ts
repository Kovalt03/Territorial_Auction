import { useState, useEffect } from 'react';

import { fetchItemList } from '../api/item';
import { ApiError } from '../api/client';
import type { ItemInfo } from '../types/item';

const FALLBACK_ITEMS: ItemInfo[] = [
  { itemId: 1, name: '무적 시간 추가권', itemType: 'INVINCIBILITY',   description: '영토 보호 시간 +4시간',   costAP: 200, costGP: null, dailyLimit: null, myInventory: 0 },
  { itemId: 2, name: '일반 공격권',     itemType: 'ATTACK_NORMAL',   description: 'Zone 단계별 공격 허용',    costAP: 100, costGP: 500,  dailyLimit: null, myInventory: 0 },
  { itemId: 3, name: '정밀 공격권',     itemType: 'ATTACK_PRECISION', description: '목표 건물 직접 지정 공격', costAP: 300, costGP: null, dailyLimit: null, myInventory: 0 },
  { itemId: 4, name: 'GP 구매권',       itemType: 'GP_PURCHASE',     description: 'GP 1,000 즉시 획득',      costAP: 50,  costGP: null, dailyLimit: 5,    myInventory: 0 },
];

export function useItems() {
  const [items, setItems] = useState<ItemInfo[]>(FALLBACK_ITEMS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItemList()
      .then(res => setItems(res.items))
      .catch(err => {
        if (!(err instanceof ApiError && err.status === 401)) {
          setError('아이템 목록을 불러올 수 없습니다. 기본 데이터를 표시합니다.');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateInventory = (itemId: number, newCount: number) => {
    setItems(prev => prev.map(item =>
      item.itemId === itemId ? { ...item, myInventory: newCount } : item
    ));
  };

  return { items, isLoading, error, updateInventory };
}
