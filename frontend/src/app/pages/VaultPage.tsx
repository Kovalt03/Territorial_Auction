import { useState } from 'react';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';

const vaultData = [
  { id: '23-17', name: '네온 하이웨이', stored: 3200, capacity: 5000, cooldown: null },
  { id: '15-22', name: '사이버 협곡', stored: 2800, capacity: 3000, cooldown: 1800 },
  { id: '8-40', name: '크롬 평야', stored: 1500, capacity: 2000, cooldown: null },
  { id: '31-5', name: '데이터 봉우리', stored: 700, capacity: 1500, cooldown: 3600 },
];

function formatCooldown(seconds: number) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export function VaultPage() {
  const { gp } = useApp();
  const [vaultGP, setVaultGP] = useState(8200);
  const maxVault = 10000;
  const [transferModal, setTransferModal] = useState<{
    from: string; to: string; amount: number; item: typeof vaultData[0];
  } | null>(null);

  const totalStored = vaultData.reduce((s, v) => s + v.stored, 0);

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex-1 overflow-y-auto p-5">
        <h1 className="text-[#e0e8ff] font-bold mb-5" style={{ fontSize: 26 }}>💰  글로벌 금고</h1>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-[#1a1f35] border border-[#00ff88] rounded-xl p-5 text-center">
            <p className="text-[#7788a5] mb-2" style={{ fontSize: 12 }}>현재 금고 보관 GP</p>
            <p className="text-[#00ff88] font-bold" style={{ fontSize: 32 }}>{vaultGP.toLocaleString()}</p>
            <div className="bg-[#2a3050] h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-[#00ff88] rounded-full transition-all"
                style={{ width: `${(vaultGP / maxVault) * 100}%` }}
              />
            </div>
            <p className="text-[#7788a5] mt-1" style={{ fontSize: 11 }}>최대 용량: {maxVault.toLocaleString()} GP</p>
          </div>

          <div className="bg-[#1a1f35] border border-[#354064] rounded-xl p-5 text-center">
            <p className="text-[#7788a5] mb-2" style={{ fontSize: 12 }}>영토 저장소 합계</p>
            <p className="text-[#ffd700] font-bold" style={{ fontSize: 32 }}>{totalStored.toLocaleString()}</p>
            <p className="text-[#7788a5] mt-3" style={{ fontSize: 11 }}>
              {vaultData.length}개 영토 저장소 합산
            </p>
          </div>

          <div className="bg-[#1a1f35] border border-[#8b50ff] rounded-xl p-5">
            <p className="text-[#7788a5] mb-3" style={{ fontSize: 12 }}>금고 용량 업그레이드</p>
            <div className="space-y-2">
              {[
                { label: '+5,000 GP 용량', cost: '500 GP' },
                { label: '+10,000 GP 용량', cost: '200 AP' },
              ].map(opt => (
                <button
                  key={opt.label}
                  className="w-full h-9 bg-[#2a3050] border border-[#8b50ff] rounded-lg flex items-center justify-between px-3 hover:bg-[#3a3060] transition-colors"
                >
                  <span className="text-[#e0e8ff]" style={{ fontSize: 12 }}>{opt.label}</span>
                  <span className="text-[#8b50ff] font-semibold" style={{ fontSize: 12 }}>{opt.cost}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#1a1f35] border border-[#354064] rounded-xl overflow-hidden">
          <div className="bg-[#2a3050] px-4 py-2.5 border-b-2 border-[#00ff88] flex items-center justify-between">
            <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>영토별 저장소 현황</span>
            <button
              className="h-7 px-3 bg-[#00ff8830] border border-[#00ff88] rounded-lg text-[#00ff88]"
              style={{ fontSize: 11 }}
            >
              전체 금고로 이전
            </button>
          </div>

          <div className="p-4 space-y-3">
            {vaultData.map(item => (
              <div key={item.id} className="bg-[#12192c] border border-[#1e2a3d] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 14 }}>{item.name}</p>
                    <p className="text-[#7788a5]" style={{ fontSize: 12 }}>({item.id})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#00ff88] font-bold" style={{ fontSize: 18 }}>{item.stored.toLocaleString()} GP</p>
                    <p className="text-[#7788a5]" style={{ fontSize: 11 }}>최대 {item.capacity.toLocaleString()} GP</p>
                  </div>
                </div>

                <div className="bg-[#1a1f35] h-2.5 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-[#00ff88] rounded-full transition-all"
                    style={{ width: `${(item.stored / item.capacity) * 100}%` }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !item.cooldown && setTransferModal({
                      from: `영토 (${item.id})`,
                      to: '글로벌 금고',
                      amount: item.stored,
                      item,
                    })}
                    disabled={!!item.cooldown}
                    className="flex-1 h-9 border rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: item.cooldown ? '#2a3050' : '#00ff8820',
                      borderColor: item.cooldown ? '#354064' : '#00ff88',
                      color: item.cooldown ? '#7788a5' : '#00ff88',
                      fontSize: 12,
                    }}
                  >
                    영토 → 금고
                  </button>
                  <button
                    onClick={() => !item.cooldown && setTransferModal({
                      from: '글로벌 금고',
                      to: `영토 (${item.id})`,
                      amount: Math.min(vaultGP, item.capacity - item.stored),
                      item,
                    })}
                    disabled={!!item.cooldown || vaultGP === 0}
                    className="flex-1 h-9 border rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: (item.cooldown || vaultGP === 0) ? '#2a3050' : '#00f5ff20',
                      borderColor: (item.cooldown || vaultGP === 0) ? '#354064' : '#00f5ff',
                      color: (item.cooldown || vaultGP === 0) ? '#7788a5' : '#00f5ff',
                      fontSize: 12,
                    }}
                  >
                    금고 → 영토
                  </button>
                  {item.cooldown ? (
                    <div className="flex-1 text-center bg-[#2a3050] border border-[#354064] rounded-lg py-2">
                      <span className="text-[#ff3333]" style={{ fontSize: 11 }}>⏱ {formatCooldown(item.cooldown)}</span>
                    </div>
                  ) : (
                    <div className="flex-1 text-center">
                      <span className="text-[#00ff88]" style={{ fontSize: 11 }}>즉시 이전 가능</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {transferModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
          <div className="bg-[#1a1f35] border border-[#00ff88] rounded-2xl p-8 max-w-sm mx-4 text-center">
            <span style={{ fontSize: 40 }}>💰</span>
            <h3 className="text-[#e0e8ff] font-bold text-xl mt-3 mb-5">GP 이전 확인</h3>
            <div className="bg-[#2a3050] rounded-xl py-4 px-5 mb-5 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-[#7788a5]" style={{ fontSize: 13 }}>출발지</span>
                <span className="text-[#e0e8ff]" style={{ fontSize: 13 }}>{transferModal.from}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7788a5]" style={{ fontSize: 13 }}>도착지</span>
                <span className="text-[#e0e8ff]" style={{ fontSize: 13 }}>{transferModal.to}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7788a5]" style={{ fontSize: 13 }}>이전 금액</span>
                <span className="text-[#00ff88] font-bold" style={{ fontSize: 14 }}>
                  {transferModal.amount.toLocaleString()} GP
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setTransferModal(null)}
                className="flex-1 h-11 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]"
                style={{ fontSize: 14 }}>취소</button>
              <button
                onClick={() => {
                  if (transferModal.to === '글로벌 금고') {
                    setVaultGP(p => Math.min(maxVault, p + transferModal.amount));
                  }
                  setTransferModal(null);
                }}
                className="flex-1 h-11 bg-[#00ff88] rounded-xl text-[#0a0e1a] font-bold"
                style={{ fontSize: 14 }}
              >
                이전하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
