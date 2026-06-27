import { useEffect, useRef } from 'react';

import type { SeasonRewardItem } from '../types/season';

interface CardProps {
  reward: SeasonRewardItem;
  currentLevel: number;
  hasPass: boolean;
  claimingId: number | null;
  onClaim: (rewardId: number) => void;
}

function RewardCard({ reward, currentLevel, hasPass, claimingId, onClaim }: CardProps) {
  const isPremium = reward.track === 'PREMIUM';
  const color = isPremium ? '#ffd700' : '#00f5ff';
  const premiumLocked = isPremium && !hasPass;
  const reached = currentLevel >= reward.level;

  let status = 'Lv.미달';
  if (reward.isClaimed) status = '✓ 완료';
  else if (reward.canClaim) status = '수령하기';
  else if (premiumLocked) status = '🔒 패스 필요';

  const active = reward.canClaim && claimingId !== reward.rewardId;

  return (
    <button
      onClick={() => active && onClaim(reward.rewardId)}
      disabled={!active}
      className="snap-center shrink-0 w-28 h-36 rounded-xl border p-2.5 flex flex-col text-left transition-all disabled:cursor-default"
      style={{
        borderColor: reward.canClaim ? color : '#354064',
        background: reward.isClaimed ? color + '20' : reward.canClaim ? color + '12' : '#1a1f35',
        opacity: reward.isClaimed || (!reward.canClaim && !premiumLocked) ? 0.6 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${reached ? 'bg-gold text-surface' : 'bg-elevated text-muted'}`}
        >
          Lv.{reward.level}
        </span>
        <span className="text-[10px]" style={{ color }}>
          {isPremium ? '🟡 프리미엄' : '🔵 무료'}
        </span>
      </div>
      <p
        className="mt-2 flex-1 text-[12px] font-medium leading-snug"
        style={{ color: reward.canClaim || reward.isClaimed ? color : '#8892b0' }}
      >
        {reward.rewardName}
      </p>
      <span className="text-[11px] font-bold" style={{ color: reward.canClaim ? color : '#7788a5' }}>
        {status}
      </span>
    </button>
  );
}

interface Props {
  rewards: SeasonRewardItem[];
  currentLevel: number;
  hasPass: boolean;
  claimingId: number | null;
  onClaim: (rewardId: number) => void;
}

const TRACK_ORDER = { FREE: 0, PREMIUM: 1 } as const;

export function SeasonRewardTrack({ rewards, currentLevel, hasPass, claimingId, onClaim }: Props) {
  const sorted = [...rewards].sort(
    (a, b) => a.level - b.level || TRACK_ORDER[a.track] - TRACK_ORDER[b.track],
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // 세로 휠 입력을 가로 스크롤로 변환 — onWheel은 passive라 preventDefault 불가
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY === 0 || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="card overflow-hidden mb-5">
      <div className="bg-elevated px-4 py-2.5 border-b border-outline flex items-center justify-between">
        <span className="text-foreground font-semibold text-[13px]">레벨 보상 트랙</span>
        <span className="text-muted text-[10px]">🟡 프리미엄 · 🔵 무료</span>
      </div>
      <div ref={scrollRef} className="p-4 flex gap-3 overflow-x-auto snap-x snap-mandatory">
        {sorted.map(reward => (
          <RewardCard
            key={reward.rewardId}
            reward={reward}
            currentLevel={currentLevel}
            hasPass={hasPass}
            claimingId={claimingId}
            onClaim={onClaim}
          />
        ))}
      </div>
    </div>
  );
}
