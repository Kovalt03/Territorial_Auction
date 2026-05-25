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
    <div className="page-root">
      <GNB />

      <div className="page-body">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-foreground font-bold text-[26px]">🛍  아이템 샵</h1>
          <div className="flex gap-3">
            <div className="bg-elevated border border-ap rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-ap font-semibold text-sm">⚡ {ap.toLocaleString()} AP</span>
            </div>
            <div className="bg-elevated border border-gp rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-gp font-semibold text-sm">💎 {gp.toLocaleString()} GP</span>
            </div>
          </div>
        </div>

        {(error || purchaseError) && (
          <div className="bg-gold/10 border border-gold/25 rounded-xl px-4 py-2.5 mb-4">
            <span className="text-gold text-xs">⚠ {purchaseError ?? error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-gp/10 border border-gp rounded-xl px-4 py-3 mb-4">
            <span className="text-gp text-[13px]">✓ {successMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-panel border border-outline rounded-2xl p-5 h-36 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-elevated" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-elevated rounded w-32" />
                    <div className="h-3 bg-elevated rounded w-24" />
                    <div className="h-6 bg-elevated rounded w-20" />
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
                <div key={item.itemId} className="bg-panel border rounded-2xl overflow-hidden"
                  style={{ borderColor: meta.color + '80' }}>
                  <div className="p-5 flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.color + '20', border: `1px solid ${meta.color}` }}>
                      <span className="text-[28px]">{meta.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-foreground font-bold mb-1 text-base">{item.name}</h3>
                      <p className="text-muted mb-2 text-[13px]">{item.description}</p>
                      {item.dailyLimit != null && (
                        <div className="bg-elevated border border-outline rounded px-2 py-1 inline-block mb-2">
                          <span className="text-gold text-[11px]">
                            일 {item.dailyLimit}회 한도 (오늘 {item.myInventory}/{item.dailyLimit}회)
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.costAP != null && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                            style={{ background: meta.color + '20', border: `1px solid ${meta.color}` }}>
                            <span className="font-bold text-base" style={{ color: meta.color }}>{item.costAP} AP</span>
                          </div>
                        )}
                        {item.costGP != null && (
                          <>
                            {item.costAP != null && <span className="text-muted text-xs">또는</span>}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                              style={{ background: '#00f5ff20', border: '1px solid #00f5ff' }}>
                              <span className="font-bold text-primary text-base">{item.costGP} GP</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmItem(item)}
                      disabled={isExhausted || isPurchasing}
                      className="h-10 px-5 rounded-xl font-bold text-sm text-surface transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: meta.color }}>
                      구매
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-elevated border border-outline rounded-xl p-4">
          <p className="text-muted" style={{ fontSize: 12 }}>
            💡 구매한 아이템은 마이페이지 &gt; 아이템 탭에서 확인하실 수 있습니다.
            GP 구매권은 매일 자정에 횟수가 초기화됩니다.
          </p>
        </div>
      </div>

      {confirmItem && (
        <div className="modal-overlay">
          <div className="bg-panel rounded-2xl p-8 max-w-sm mx-4 text-center"
            style={{ border: `2px solid ${itemMeta(confirmItem.itemType).color}` }}>
            <span className="text-[40px]">{itemMeta(confirmItem.itemType).icon}</span>
            <h3 className="text-foreground font-bold text-xl mt-3 mb-2">{confirmItem.name}</h3>
            <p className="text-muted mb-5 text-[13px]">{confirmItem.description}</p>
            <div className="bg-elevated rounded-xl py-4 mb-6">
              <p className="text-muted text-xs">차감 금액</p>
              <p className="font-bold text-[24px]" style={{ color: itemMeta(confirmItem.itemType).color }}>
                {confirmItem.costAP != null ? `${confirmItem.costAP} AP` : `${confirmItem.costGP} GP`}
              </p>
              <p className="text-muted text-[11px]">
                잔여: {confirmItem.costAP != null
                  ? `${ap.toLocaleString()} → ${(ap - (confirmItem.costAP ?? 0)).toLocaleString()} AP`
                  : `${gp.toLocaleString()} → ${(gp - (confirmItem.costGP ?? 0)).toLocaleString()} GP`}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmItem(null)}
                className="btn-cancel">취소</button>
              <button onClick={() => void handlePurchase(confirmItem)}
                disabled={isPurchasing}
                className="flex-1 h-11 rounded-xl text-surface font-bold text-sm disabled:opacity-50"
                style={{ background: itemMeta(confirmItem.itemType).color }}>
                {isPurchasing ? '처리중...' : '구매하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
