import { useState } from 'react';

import { useApp } from '../context/AppContext';
import { useSeasonPass } from '../hooks/useSeasonPass';
import { purchaseSeasonPass, claimMissionApi, claimRewardApi } from '../api/season';
import { ApiError } from '../api/client';

import { GNB } from '../components/GNB';
import { Button } from '../components/Button';
import { SeasonPassHeader } from './SeasonPassHeader';
import { SeasonRewardTrack } from './SeasonRewardTrack';
import { SeasonMissionPanel } from './SeasonMissionPanel';
import { SeasonBenefits } from './SeasonBenefits';
import { SeasonPurchaseModal } from './SeasonPurchaseModal';

const PASS_PRICE_AP = 1000;

export function SeasonPassPage() {
  const { ap, hasPass, syncAP, syncPass } = useApp();
  const { progress, missions, isLoading, error, reload } = useSeasonPass();
  const [showPurchase, setShowPurchase] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const handlePurchase = async () => {
    setIsProcessing(true);
    setPurchaseError(null);
    try {
      const result = await purchaseSeasonPass();
      syncAP(result.remainingAP);
      syncPass(true, result.expiresAt);
      setShowPurchase(false);
      void reload();
    } catch (e) {
      setPurchaseError(
        e instanceof ApiError && e.status >= 400 && e.status < 500
          ? e.message
          : '구매에 실패했습니다. 다시 시도해주세요.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaim = async (id: number, claim: (id: number) => Promise<unknown>) => {
    setClaimingId(id);
    try {
      await claim(id);
      await reload();
    } catch (e) {
      console.warn('[SeasonPassPage] claim failed', e);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="page-root">
      <GNB />

      <div className="page-body">
        <div className="max-w-3xl mx-auto">
          {isLoading ? (
            <div className="card p-10 text-center text-muted text-sm">불러오는 중...</div>
          ) : error ? (
            <div className="card p-6 text-center">
              <p className="text-danger text-sm">⚠ {error}</p>
            </div>
          ) : progress ? (
            <>
              <SeasonPassHeader progress={progress} />

              {!hasPass && (
                <div className="card p-4 mb-5 flex items-center justify-between gap-3">
                  <p className="text-muted text-[13px]">
                    프리미엄 패스로 같은 레벨에서 추가 보상을 받으세요.
                  </p>
                  <Button
                    onClick={() => setShowPurchase(true)}
                    disabled={ap < PASS_PRICE_AP}
                    className="flex-shrink-0"
                  >
                    구매 ({PASS_PRICE_AP.toLocaleString()} AP)
                  </Button>
                </div>
              )}

              <SeasonRewardTrack
                rewards={progress.rewards}
                currentLevel={progress.currentLevel}
                hasPass={hasPass}
                claimingId={claimingId}
                onClaim={id => void handleClaim(id, claimRewardApi)}
              />
              <SeasonMissionPanel
                missions={missions}
                claimingId={claimingId}
                onClaim={id => void handleClaim(id, claimMissionApi)}
              />
              <SeasonBenefits hasPass={hasPass} />
            </>
          ) : null}
        </div>
      </div>

      {showPurchase && (
        <SeasonPurchaseModal
          ap={ap}
          cost={PASS_PRICE_AP}
          isProcessing={isProcessing}
          error={purchaseError}
          onClose={() => setShowPurchase(false)}
          onConfirm={() => void handlePurchase()}
        />
      )}
    </div>
  );
}
