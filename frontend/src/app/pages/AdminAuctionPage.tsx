import { useEffect, useState } from 'react';

import { fetchAuctionSetting, setAuctionSetting } from '../api/admin';
import { ApiError } from '../api/client';

export function AdminAuctionPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAuctionSetting()
      .then(r => setEnabled(r.auctionEnabled))
      .catch(e => {
        setError(e instanceof ApiError ? e.message : '경매 설정을 불러올 수 없습니다.');
        console.warn('[AdminAuctionPage] fetch failed', e);
      });
  }, []);

  const handleToggle = async () => {
    if (isSaving || enabled == null) return;
    setIsSaving(true); setError(null);
    try {
      const r = await setAuctionSetting(!enabled);
      setEnabled(r.auctionEnabled);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '변경에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-lg">
        <h2 className="font-bold text-base mb-1">경매 전역 관리</h2>
        <p className="text-muted text-xs mb-6">전체 맵의 신규 경매 생성을 일괄 제어합니다.</p>

        {error && <p className="text-danger text-xs mb-4">⚠ {error}</p>}

        <div className="bg-panel border border-outline rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">신규 경매 생성</p>
              <p className="text-muted text-[11px] mt-0.5">
                {enabled == null
                  ? '불러오는 중...'
                  : enabled
                    ? '스케줄러가 신규 경매를 생성합니다.'
                    : '신규 경매 생성이 중지되었습니다.'}
              </p>
            </div>
            <span className="text-xs font-bold" style={{ color: enabled ? '#00ff88' : '#ff8c00' }}>
              {enabled == null ? '' : enabled ? 'ON' : 'OFF'}
            </span>
          </div>

          <p className="text-dim text-[11px] mb-4 leading-relaxed">
            중지해도 이미 진행 중인 경매는 정상 종료·정산됩니다. 다음 회차부터 신규 경매가 열리지 않습니다.
            개별 영토 단위 중지는 '영토 구성' 탭에서 설정할 수 있습니다.
          </p>

          <button onClick={() => void handleToggle()} disabled={isSaving || enabled == null}
            className="w-full h-10 rounded-lg font-bold text-sm text-surface hover:brightness-110 disabled:opacity-40"
            style={{ background: enabled ? '#ff8c00' : '#00ff88' }}>
            {isSaving ? '처리 중...' : enabled ? '전체 신규 경매 중지' : '전체 신규 경매 재개'}
          </button>
        </div>
      </div>
    </div>
  );
}
