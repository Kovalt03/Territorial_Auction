import { useState } from 'react';
import { GNB } from '../components/GNB';
import { useVault } from '../hooks/useVault';
import { transferGP } from '../api/vault';
import { useApp } from '../context/AppContext';
import type { MyTerritory } from '../types/vault';

function formatCooldown(isoString: string) {
  const secs = Math.max(0, Math.floor((new Date(isoString).getTime() - Date.now()) / 1000));
  const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

interface TransferModal {
  direction: 'TO_VAULT' | 'FROM_VAULT';
  territory: MyTerritory;
}

export function VaultPage() {
  const { syncGP } = useApp();
  const { vault, territories, isLoading, error, updateVault } = useVault();
  const [transferModal, setTransferModal] = useState<TransferModal | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const isCooldown = vault ? !vault.isTransferAvailable && !!vault.nextTransferAvailableAt : false;

  const handleOpenModal = (direction: 'TO_VAULT' | 'FROM_VAULT', territory: MyTerritory) => {
    setTransferModal({ direction, territory });
    setTransferAmount('');
    setTransferError(null);
  };

  const handleTransfer = async () => {
    if (!transferModal || !vault) return;
    const amount = parseInt(transferAmount, 10);
    if (!amount || amount <= 0) { setTransferError('이전할 금액을 입력해주세요.'); return; }
    setIsTransferring(true);
    setTransferError(null);
    try {
      const result = await transferGP(transferModal.direction, transferModal.territory.territoryId, amount);
      updateVault(result.vaultStoredAfter, result.nextTransferAvailableAt);
      syncGP(result.vaultStoredAfter);
      setTransferModal(null);
    } catch {
      setTransferError('이전에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="page-root">
      <GNB />

      <div className="page-body">
        <h1 className="text-[#e0e8ff] font-bold mb-5 text-[26px]">💰  글로벌 금고</h1>

        {error && (
          <div className="bg-[#ffd70010] border border-[#ffd70040] rounded-xl px-4 py-2.5 mb-4">
            <span className="text-[#ffd700] text-xs">⚠ {error}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-[#1a1f35] border border-[#00ff88] rounded-xl p-5 text-center">
            <p className="text-[#7788a5] mb-2 text-xs">현재 금고 보관 GP</p>
            {isLoading ? (
              <div className="h-10 bg-[#2a3050] rounded animate-pulse mx-auto w-24" />
            ) : (
              <p className="text-[#00ff88] font-bold text-[32px]">
                {(vault?.storedGP ?? 0).toLocaleString()}
              </p>
            )}
            <div className="bg-[#2a3050] h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-[#00ff88] rounded-full transition-all"
                style={{ width: vault ? `${Math.min(100, (vault.storedGP / vault.capacity) * 100)}%` : '0%' }}
              />
            </div>
            <p className="text-[#7788a5] mt-1 text-[11px]">
              최대 용량: {(vault?.capacity ?? 0).toLocaleString()} GP
            </p>
          </div>

          <div className="card p-5 text-center">
            <p className="text-[#7788a5] mb-2 text-xs">보유 영토 수</p>
            {isLoading ? (
              <div className="h-10 bg-[#2a3050] rounded animate-pulse mx-auto w-16" />
            ) : (
              <p className="text-[#ffd700] font-bold text-[32px]">{territories.length}</p>
            )}
            <p className="text-[#7788a5] mt-3 text-[11px]">이전 가능한 영토</p>
          </div>

          <div className="card p-5">
            <p className="text-[#7788a5] mb-2 text-xs">금고 상태</p>
            {isCooldown && vault?.nextTransferAvailableAt ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[#ff3333] text-[13px]">
                  ⏱ 쿨다운: {formatCooldown(vault.nextTransferAvailableAt)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse" />
                <span className="text-[#00ff88] text-[13px]">이전 가능</span>
              </div>
            )}
            {vault?.lastTransferAt && (
              <p className="text-[#7788a5] mt-2 text-[11px]">
                마지막 이전: {new Date(vault.lastTransferAt).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-[#2a3050] px-4 py-2.5 border-b-2 border-[#00ff88]">
            <span className="text-[#e0e8ff] font-semibold text-[13px]">보유 영토 목록</span>
          </div>

          <div className="p-4 space-y-3">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-[#12192c] border border-[#354064] rounded-xl p-4 h-20 animate-pulse" />
              ))
            ) : territories.length === 0 ? (
              <p className="text-center text-[#7788a5] py-8 text-sm">보유한 영토가 없습니다.</p>
            ) : (
              territories.map(t => (
                <div key={t.territoryId} className="bg-[#12192c] border border-[#354064] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[#e0e8ff] font-semibold text-sm">
                        영토 #{t.territoryId}
                        <span className="ml-2 px-2 py-0.5 rounded text-xs bg-[#ffd70020] text-[#ffd700]">
                          {t.grade}급
                        </span>
                      </p>
                      <p className="text-[#7788a5] text-xs">
                        ({t.position.x}, {t.position.y}) · {t.continentName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => !isCooldown && handleOpenModal('TO_VAULT', t)}
                      disabled={isCooldown}
                      className="flex-1 h-9 border rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: isCooldown ? '#2a3050' : '#00ff8820',
                        borderColor: isCooldown ? '#354064' : '#00ff88',
                        color: isCooldown ? '#7788a5' : '#00ff88',
                      }}
                    >
                      영토 → 금고
                    </button>
                    <button
                      onClick={() => !isCooldown && handleOpenModal('FROM_VAULT', t)}
                      disabled={isCooldown || (vault?.storedGP ?? 0) === 0}
                      className="flex-1 h-9 border rounded-lg text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: (isCooldown || !vault?.storedGP) ? '#2a3050' : '#00f5ff20',
                        borderColor: (isCooldown || !vault?.storedGP) ? '#354064' : '#00f5ff',
                        color: (isCooldown || !vault?.storedGP) ? '#7788a5' : '#00f5ff',
                      }}
                    >
                      금고 → 영토
                    </button>
                    {isCooldown && vault?.nextTransferAvailableAt ? (
                      <div className="flex-1 text-center bg-[#2a3050] border border-[#354064] rounded-lg py-2">
                        <span className="text-[#ff3333] text-[11px]">
                          ⏱ {formatCooldown(vault.nextTransferAvailableAt)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1 text-center">
                        <span className="text-[#00ff88] text-[11px]">즉시 이전 가능</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {transferModal && (
        <div className="modal-overlay">
          <div className="bg-[#1a1f35] border border-[#00ff88] rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <span className="text-[40px]">💰</span>
            <h3 className="text-[#e0e8ff] font-bold text-xl mt-3 mb-5">GP 이전 확인</h3>
            <div className="bg-[#2a3050] rounded-xl py-4 px-5 mb-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-[#7788a5] text-[13px]">출발지</span>
                <span className="text-[#e0e8ff] text-[13px]">
                  {transferModal.direction === 'TO_VAULT'
                    ? `영토 #${transferModal.territory.territoryId}`
                    : '글로벌 금고'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7788a5] text-[13px]">도착지</span>
                <span className="text-[#e0e8ff] text-[13px]">
                  {transferModal.direction === 'TO_VAULT'
                    ? '글로벌 금고'
                    : `영토 #${transferModal.territory.territoryId}`}
                </span>
              </div>
              {transferModal.direction === 'FROM_VAULT' && (
                <div className="flex justify-between">
                  <span className="text-[#7788a5] text-[13px]">금고 잔액</span>
                  <span className="text-[#00ff88] font-bold text-[13px]">
                    {(vault?.storedGP ?? 0).toLocaleString()} GP
                  </span>
                </div>
              )}
            </div>
            <div className="mb-4">
              <p className="text-[#7788a5] text-left mb-1 text-xs">이전 금액 (GP)</p>
              <input
                type="number"
                min="1"
                value={transferAmount}
                onChange={e => setTransferAmount(e.target.value)}
                placeholder="이전할 GP 입력"
                className="w-full bg-[#2a3050] border border-[#354064] rounded-xl px-4 h-11 text-[#e0e8ff] text-lg outline-none focus:border-[#00ff88] transition-colors text-center"
              />
            </div>
            {transferError && (
              <p className="text-[#ff3333] mb-3 text-xs">⚠ {transferError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setTransferModal(null)}
                className="btn-cancel"
              >
                취소
              </button>
              <button
                onClick={() => void handleTransfer()}
                disabled={isTransferring}
                className="flex-1 h-11 bg-[#00ff88] rounded-xl text-[#0a0e1a] font-bold text-sm disabled:opacity-50"
              >
                {isTransferring ? '처리 중...' : '이전하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
