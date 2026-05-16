import { useState } from 'react';

import { useItems } from '../hooks/useItems';
import { purchaseItem } from '../api/item';
import { fetchMyWallet } from '../api/user';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import type { ItemInfo } from '../types/item';

const ITEM_META: Record<string, { icon: string; color: string }> = {
  INVINCIBILITY:   { icon: '🛡', color: '#00f5ff' },
  ATTACK_NORMAL:   { icon: '⚔', color: '#ff8c00' },
  ATTACK_PRECISION: { icon: '🎯', color: '#ff3333' },
  GP_PURCHASE:     { icon: '💎', color: '#00ff88' },
};

function itemMeta(itemType: string) {
  return ITEM_META[itemType] ?? { icon: '📦', color: '#8892b0' };
}

export function ItemShopPage() {
  const { ap, gp, syncAP, syncGP } = useApp();
  const { items, isLoading, error, updateInventory } = useItems();
  const [confirmItem, setConfirmItem] = useState<ItemInfo | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const handlePurchase = async (item: ItemInfo) => {
    setConfirmItem(null);
    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      const result = await purchaseItem(item.itemId, 1);
      syncAP(result.remainingAP);
      updateInventory(item.itemId, result.totalOwned);
      if (item.costAP == null && item.costGP != null) {
        const wallet = await fetchMyWallet();
        syncGP(wallet.availableGP);
      }
      setSuccessMsg(`${item.name} 구매 완료!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setPurchaseError('구매에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[#e0e8ff] font-bold" style={{ fontSize: 26 }}>🛍  아이템 샵</h1>
          <div className="flex gap-3">
            <div className="bg-[#2a3050] border border-[#ff0066] rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-[#ff0066] font-semibold" style={{ fontSize: 14 }}>⚡ {ap.toLocaleString()} AP</span>
            </div>
            <div className="bg-[#2a3050] border border-[#00ff88] rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-[#00ff88] font-semibold" style={{ fontSize: 14 }}>💎 {gp.toLocaleString()} GP</span>
            </div>
          </div>
        </div>

        {(error || purchaseError) && (
          <div className="bg-[#ffd70010] border border-[#ffd70040] rounded-xl px-4 py-2.5 mb-4">
            <span className="text-[#ffd700]" style={{ fontSize: 12 }}>⚠ {purchaseError ?? error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-[#00ff8820] border border-[#00ff88] rounded-xl px-4 py-3 mb-4">
            <span className="text-[#00ff88]" style={{ fontSize: 13 }}>✓ {successMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-[#1a1f35] border border-[#354064] rounded-2xl p-5 h-36 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#2a3050]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#2a3050] rounded w-32" />
                    <div className="h-3 bg-[#2a3050] rounded w-24" />
                    <div className="h-6 bg-[#2a3050] rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {items.map(item => {
              const meta = itemMeta(item.itemType);
              const isExhausted = item.dailyLimit != null && item.myInventory >= item.dailyLimit;
              return (
                <div key={item.itemId} className="bg-[#1a1f35] border rounded-2xl overflow-hidden"
                  style={{ borderColor: meta.color + '80' }}>
                  <div className="p-5 flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.color + '20', border: `1px solid ${meta.color}` }}>
                      <span style={{ fontSize: 28 }}>{meta.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[#e0e8ff] font-bold mb-1" style={{ fontSize: 16 }}>{item.name}</h3>
                      <p className="text-[#7788a5] mb-2" style={{ fontSize: 13 }}>{item.description}</p>
                      {item.dailyLimit != null && (
                        <div className="bg-[#2a3050] border border-[#354064] rounded px-2 py-1 inline-block mb-2">
                          <span className="text-[#ffd700]" style={{ fontSize: 11 }}>
                            일 {item.dailyLimit}회 한도 (오늘 {item.myInventory}/{item.dailyLimit}회)
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.costAP != null && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                            style={{ background: meta.color + '20', border: `1px solid ${meta.color}` }}>
                            <span className="font-bold" style={{ fontSize: 16, color: meta.color }}>{item.costAP} AP</span>
                          </div>
                        )}
                        {item.costGP != null && (
                          <>
                            {item.costAP != null && <span className="text-[#7788a5]" style={{ fontSize: 12 }}>또는</span>}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                              style={{ background: '#00f5ff20', border: '1px solid #00f5ff' }}>
                              <span className="font-bold text-[#00f5ff]" style={{ fontSize: 16 }}>{item.costGP} GP</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmItem(item)}
                      disabled={isExhausted || isPurchasing}
                      className="h-10 px-5 rounded-xl font-bold transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: meta.color, color: '#0a0e1a', fontSize: 14 }}>
                      구매
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-[#2a3050] border border-[#354064] rounded-xl p-4">
          <p className="text-[#7788a5]" style={{ fontSize: 12 }}>
            💡 구매한 아이템은 마이페이지 &gt; 아이템 탭에서 확인하실 수 있습니다.
            GP 구매권은 매일 자정에 횟수가 초기화됩니다.
          </p>
        </div>
      </div>

      {confirmItem && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
          <div className="bg-[#1a1f35] rounded-2xl p-8 max-w-sm mx-4 text-center"
            style={{ border: `2px solid ${itemMeta(confirmItem.itemType).color}` }}>
            <span style={{ fontSize: 40 }}>{itemMeta(confirmItem.itemType).icon}</span>
            <h3 className="text-[#e0e8ff] font-bold text-xl mt-3 mb-2">{confirmItem.name}</h3>
            <p className="text-[#7788a5] mb-5" style={{ fontSize: 13 }}>{confirmItem.description}</p>
            <div className="bg-[#2a3050] rounded-xl py-4 mb-6">
              <p className="text-[#7788a5]" style={{ fontSize: 12 }}>차감 금액</p>
              <p className="font-bold" style={{ fontSize: 24, color: itemMeta(confirmItem.itemType).color }}>
                {confirmItem.costAP != null ? `${confirmItem.costAP} AP` : `${confirmItem.costGP} GP`}
              </p>
              <p className="text-[#7788a5]" style={{ fontSize: 11 }}>
                잔여: {confirmItem.costAP != null
                  ? `${ap.toLocaleString()} → ${(ap - (confirmItem.costAP ?? 0)).toLocaleString()} AP`
                  : `${gp.toLocaleString()} → ${(gp - (confirmItem.costGP ?? 0)).toLocaleString()} GP`}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmItem(null)}
                className="flex-1 h-11 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]"
                style={{ fontSize: 14 }}>취소</button>
              <button onClick={() => void handlePurchase(confirmItem)}
                disabled={isPurchasing}
                className="flex-1 h-11 rounded-xl text-[#0a0e1a] font-bold disabled:opacity-50"
                style={{ background: itemMeta(confirmItem.itemType).color, fontSize: 14 }}>
                {isPurchasing ? '처리중...' : '구매하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
