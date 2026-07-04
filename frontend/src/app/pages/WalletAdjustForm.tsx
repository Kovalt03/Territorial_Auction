import { useState } from 'react';

import { adjustUserWallet } from '../api/admin';
import { ApiError } from '../api/client';

import type { AdminUserDetail } from '../types/admin';

interface Props {
  userId: number;
  onAdjusted: (detail: AdminUserDetail) => void;
}

export function WalletAdjustForm({ userId, onAdjusted }: Props) {
  const [ap, setAp] = useState('');
  const [gp, setGp] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const apDelta = Number(ap) || 0;
  const gpDelta = Number(gp) || 0;
  const disabled = isSaving || (apDelta === 0 && gpDelta === 0) || !reason.trim();

  const handleSubmit = async () => {
    if (disabled) return;
    setIsSaving(true); setError(null);
    try {
      const detail = await adjustUserWallet(userId, apDelta, gpDelta, reason.trim());
      onAdjusted(detail);
      setAp(''); setGp(''); setReason('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '재화 조정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <p className="text-muted text-[10px] mb-2 leading-relaxed">
        증가는 양수, 차감은 음수로 입력. 차감 시 잔액보다 크면 거부됩니다.
      </p>
      <div className="flex gap-2 mb-2">
        <label className="flex-1">
          <span className="block text-dim text-[11px] mb-1">AP 변화량</span>
          <input type="number" value={ap} onChange={e => setAp(e.target.value)} placeholder="0"
            className="w-full bg-elevated border border-outline rounded-md px-2 h-9 text-foreground text-xs outline-none focus:border-primary" />
        </label>
        <label className="flex-1">
          <span className="block text-dim text-[11px] mb-1">GP 변화량</span>
          <input type="number" value={gp} onChange={e => setGp(e.target.value)} placeholder="0"
            className="w-full bg-elevated border border-outline rounded-md px-2 h-9 text-foreground text-xs outline-none focus:border-primary" />
        </label>
      </div>
      <input value={reason} onChange={e => setReason(e.target.value)} placeholder="사유 (필수)"
        className="w-full bg-elevated border border-outline rounded-md px-2 h-9 text-foreground text-xs outline-none focus:border-primary mb-2" />
      {error && <p className="text-danger text-[11px] mb-2">{error}</p>}
      <button onClick={() => void handleSubmit()} disabled={disabled}
        className="w-full h-9 rounded-lg bg-primary text-surface text-xs font-bold hover:brightness-110 disabled:opacity-40">
        {isSaving ? '적용 중...' : '재화 조정 적용'}
      </button>
    </div>
  );
}
