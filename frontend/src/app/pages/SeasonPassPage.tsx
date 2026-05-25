import { useState } from 'react';
import { GNB } from '../components/GNB';
import { Button } from '../components/Button';
import { useApp } from '../context/AppContext';
import { purchaseSeasonPass } from '../api/season';

const benefits = [
  { icon: '💎', title: '섬 GP +50%', desc: '영토 내 모든 GP 생산량 50% 증가' },
  { icon: '👷', title: '일꾼 +1', desc: '동시 건설 가능한 일꾼 수 1 증가' },
  { icon: '🏛', title: '토지세 면제 +2개', desc: '2개 영토 토지세 자동 면제' },
  { icon: '⭐', title: '시즌 보너스 XP', desc: '모든 활동에서 XP 30% 추가 획득' },
  { icon: '🔔', title: '우선 알림', desc: '입찰 경쟁 실시간 알림 우선 처리' },
];

export function SeasonPassPage() {
  const { ap, hasPass, passEndDate, syncAP, syncPass } = useApp();
  const [showConfirm, setShowConfirm] = useState(false);
  const [activated, setActivated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const passDays = passEndDate
    ? Math.max(0, Math.ceil((passEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleActivate = async () => {
    setIsProcessing(true);
    setPurchaseError(null);
    try {
      const result = await purchaseSeasonPass();
      syncAP(result.remainingAP);
      syncPass(true, result.expiresAt);
      setActivated(true);
      setShowConfirm(false);
      setTimeout(() => setActivated(false), 3000);
    } catch {
      setPurchaseError('구매에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-root">
      <GNB />

      <div className="page-body">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⭐</div>
            <h1 className="text-gold font-bold mb-2 text-[32px]">시즌 패스</h1>
            <p className="text-muted text-sm">픽셀 경매의 프리미엄 혜택을 누려보세요</p>
          </div>

          {hasPass ? (
            <div className="bg-panel border-2 border-gold rounded-2xl p-6 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-[#ffd70010] to-transparent" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="h-7 px-3 bg-gold rounded-lg flex items-center">
                      <span className="text-surface font-bold text-xs">활성화됨</span>
                    </div>
                    <span className="text-gold font-bold text-lg">시즌 패스 활성 중</span>
                  </div>
                  <p className="text-muted text-[13px]">만료까지 D-{passDays}일 남았습니다</p>
                </div>
                <div className="text-right">
                  <p className="text-gold font-bold text-[32px]">D-{passDays}</p>
                  <p className="text-muted text-xs">
                    만료: {passEndDate?.toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all"
                  style={{ width: `${Math.max(5, (passDays / 30) * 100)}%` }}
                />
              </div>
              <Button
                onClick={() => setShowConfirm(true)}
                className="mt-4"
              >
                + 30일 연장하기 (1,000 AP)
              </Button>
            </div>
          ) : (
            <div className="bg-panel border border-outline rounded-2xl p-6 mb-6">
              <p className="text-muted text-center mb-4 text-sm">
                현재 시즌 패스가 없습니다. 구매하여 프리미엄 혜택을 누려보세요!
              </p>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={ap < 1000}
                size="xl"
                fullWidth
              >
                시즌 패스 구매 (1,000 AP)
              </Button>
              {ap < 1000 && (
                <p className="text-center text-danger mt-2 text-xs">
                  AP 부족 — 현재 {ap.toLocaleString()} AP (필요: 1,000 AP)
                </p>
              )}
            </div>
          )}

          <div className="bg-panel border border-outline rounded-2xl overflow-hidden mb-6">
            <div className="bg-elevated px-5 py-3 border-b-2 border-gold">
              <span className="text-foreground font-bold text-[15px]">시즌 패스 혜택</span>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              {benefits.map(b => (
                <div key={b.title} className="flex items-center gap-4 p-4 bg-elevated rounded-xl">
                  <div className="w-12 h-12 bg-gold/10 border border-gold rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-[24px]">{b.icon}</span>
                  </div>
                  <div>
                    <p className="text-gold font-bold text-[15px]">{b.title}</p>
                    <p className="text-muted text-xs">{b.desc}</p>
                  </div>
                  {hasPass && (
                    <div className="ml-auto bg-gp/10 border border-gp rounded px-2 py-1">
                      <span className="text-gp text-[11px]">✓ 활성</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-elevated border border-outline rounded-xl p-4">
            <p className="text-muted text-xs">
              💡 중복 구매 시 남은 기간에 30일이 누적됩니다. 시즌 패스는 구매 즉시 활성화됩니다.
            </p>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="bg-panel border-2 border-gold rounded-2xl p-8 max-w-sm mx-4 text-center">
            <span className="text-5xl">⭐</span>
            <h3 className="text-gold font-bold text-xl mt-3 mb-2">
              {hasPass ? '시즌 패스 연장' : '시즌 패스 구매'}
            </h3>
            <div className="bg-elevated rounded-xl py-4 mb-3">
              <p className="text-muted text-xs">차감 AP</p>
              <p className="text-gold font-bold text-[28px]">1,000 AP</p>
              <p className="text-muted text-[11px]">
                잔여: {ap.toLocaleString()} → {(ap - 1000).toLocaleString()} AP
              </p>
            </div>
            {hasPass && (
              <div className="bg-elevated rounded-xl py-2 mb-5">
                <p className="text-foreground text-[13px]">
                  현재 D-{passDays} + 30일 = <span className="text-gold font-bold">D-{passDays + 30}</span>
                </p>
              </div>
            )}
            {!hasPass && <div className="mb-5" />}
            {purchaseError && (
              <p className="text-danger mb-3 text-xs">⚠ {purchaseError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="btn-cancel">취소</button>
              <Button
                onClick={() => void handleActivate()}
                disabled={ap < 1000 || isProcessing}
                className="flex-1"
              >
                {isProcessing ? '처리 중...' : hasPass ? '연장하기' : '구매하기'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activated && (
        <div className="fixed bottom-6 right-6 bg-panel border-2 border-gold rounded-xl px-5 py-3 z-50 animate-bounce">
          <span className="text-gold font-bold text-sm">
            ⭐ 시즌 패스가 활성화되었습니다!
          </span>
        </div>
      )}
    </div>
  );
}
