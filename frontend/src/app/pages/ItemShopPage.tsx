import { useState } from 'react';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';

const items = [
  {
    id: 'invincible', icon: '🛡', name: '무적 시간 추가권', desc: '영토 보호 시간 +4시간',
    cost: 200, currency: 'AP', color: '#00f5ff', stock: null, daily: undefined, dailyUsed: undefined,
  },
  {
    id: 'normal_attack', icon: '⚔', name: '일반 공격권', desc: 'Zone 단계별 공격 허용',
    cost: 500, currency: 'GP', costAlt: 100, currencyAlt: 'AP', color: '#ff8c00', stock: null, daily: undefined, dailyUsed: undefined,
  },
  {
    id: 'precision_attack', icon: '🎯', name: '정밀 공격권', desc: '목표 건물 직접 지정 공격',
    cost: 300, currency: 'AP', color: '#ff3333', stock: null, daily: undefined, dailyUsed: undefined,
  },
  {
    id: 'gp_voucher', icon: '💎', name: 'GP 구매권', desc: 'GP 1,000 즉시 획득',
    cost: 50, currency: 'AP', color: '#00ff88', daily: 5, dailyUsed: 2, stock: null,
  },
];

export function ItemShopPage() {
  const { ap, gp, useAP } = useApp();
  const [confirmItem, setConfirmItem] = useState<typeof items[0] | null>(null);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [successMsg, setSuccessMsg] = useState('');

  const handlePurchase = (item: typeof items[0]) => {
    const ok = useAP(item.cost);
    if (ok) {
      setPurchasedItems(p => new Set([...p, item.id]));
      setSuccessMsg(`${item.name} 구매 완료!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
    setConfirmItem(null);
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

        {successMsg && (
          <div className="bg-[#00ff8820] border border-[#00ff88] rounded-xl px-4 py-3 mb-4">
            <span className="text-[#00ff88]" style={{ fontSize: 13 }}>✓ {successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-[#1a1f35] border rounded-2xl overflow-hidden"
              style={{ borderColor: item.color + '80' }}
            >
              <div className="p-5 flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: item.color + '20', border: `1px solid ${item.color}` }}
                >
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-[#e0e8ff] font-bold mb-1" style={{ fontSize: 16 }}>{item.name}</h3>
                  <p className="text-[#7788a5] mb-2" style={{ fontSize: 13 }}>{item.desc}</p>
                  {item.daily && (
                    <div className="bg-[#2a3050] border border-[#354064] rounded px-2 py-1 inline-block mb-2">
                      <span className="text-[#ffd700]" style={{ fontSize: 11 }}>
                        일 {item.daily}회 한도 (오늘 {item.dailyUsed}/{item.daily}회)
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                      style={{ background: item.color + '20', border: `1px solid ${item.color}` }}
                    >
                      <span className="font-bold" style={{ fontSize: 16, color: item.color }}>
                        {item.cost} {item.currency}
                      </span>
                    </div>
                    {'costAlt' in item && item.costAlt && (
                      <>
                        <span className="text-[#7788a5]" style={{ fontSize: 12 }}>또는</span>
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                          style={{ background: '#00f5ff20', border: '1px solid #00f5ff' }}
                        >
                          <span className="font-bold text-[#00f5ff]" style={{ fontSize: 16 }}>
                            {item.costAlt} {item.currencyAlt}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmItem(item)}
                  disabled={item.daily ? (item.dailyUsed ?? 0) >= item.daily : false}
                  className="h-10 px-5 rounded-xl font-bold transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: item.color,
                    color: '#0a0e1a',
                    fontSize: 14,
                  }}
                >
                  구매
                </button>
              </div>
            </div>
          ))}
        </div>

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
            style={{ border: `2px solid ${confirmItem.color}` }}>
            <span style={{ fontSize: 40 }}>{confirmItem.icon}</span>
            <h3 className="text-[#e0e8ff] font-bold text-xl mt-3 mb-2">{confirmItem.name}</h3>
            <p className="text-[#7788a5] mb-5" style={{ fontSize: 13 }}>{confirmItem.desc}</p>
            <div className="bg-[#2a3050] rounded-xl py-4 mb-6">
              <p className="text-[#7788a5]" style={{ fontSize: 12 }}>차감 금액</p>
              <p className="font-bold" style={{ fontSize: 24, color: confirmItem.color }}>
                {confirmItem.cost} {confirmItem.currency}
              </p>
              <p className="text-[#7788a5]" style={{ fontSize: 11 }}>
                잔여: {confirmItem.currency === 'AP' ? ap.toLocaleString() : gp.toLocaleString()} {confirmItem.currency}
                → {confirmItem.currency === 'AP' ? (ap - confirmItem.cost).toLocaleString() : (gp - confirmItem.cost).toLocaleString()} {confirmItem.currency}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmItem(null)}
                className="flex-1 h-11 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]"
                style={{ fontSize: 14 }}>취소</button>
              <button
                onClick={() => handlePurchase(confirmItem)}
                className="flex-1 h-11 rounded-xl text-[#0a0e1a] font-bold"
                style={{ background: confirmItem.color, fontSize: 14 }}
              >구매하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
