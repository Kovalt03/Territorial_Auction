import { useNavigate } from 'react-router';

interface Props {
  hasPass: boolean;
  passDays: number;
  territoryCount: number;
}

export function MyPageQuickLinks({ hasPass, passDays, territoryCount }: Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <div
        className="card p-4 cursor-pointer hover:brightness-110 transition-all"
        onClick={() => navigate('/app/territory-management')}
      >
        <div className="flex items-center gap-3">
          <span className="text-[24px]">🗺</span>
          <div>
            <p className="text-primary font-bold text-sm">영토 관리</p>
            <p className="text-muted text-[11px]">경매·입찰·내 영토·토지세</p>
          </div>
          <span className="ml-auto text-muted">→</span>
        </div>
      </div>

      <div
        className={`bg-panel border rounded-xl p-4 cursor-pointer hover:brightness-110 transition-all ${hasPass ? 'border-gold' : 'border-outline'}`}
        onClick={() => navigate('/app/season-pass')}
      >
        <div className="flex items-center gap-3">
          <span className="text-[24px]">⭐</span>
          <div>
            <p className="text-gold font-bold text-sm">시즌 패스</p>
            {hasPass ? (
              <p className="text-muted text-[11px]">D-{passDays}일 남음</p>
            ) : (
              <p className="text-muted text-[11px]">미구매 · 1,000 AP</p>
            )}
          </div>
          <span className="ml-auto text-muted">→</span>
        </div>
      </div>

      <div
        className="card p-4 cursor-pointer hover:brightness-110 transition-all"
        onClick={() => navigate('/app/vault')}
      >
        <div className="flex items-center gap-3">
          <span className="text-[24px]">💰</span>
          <div>
            <p className="text-gp font-bold text-sm">글로벌 금고</p>
            <p className="text-muted text-[11px]">보유 영토 {territoryCount}개</p>
          </div>
          <span className="ml-auto text-muted">→</span>
        </div>
      </div>

      <div
        className="card p-4 cursor-pointer hover:brightness-110 transition-all"
        onClick={() => navigate('/app/my-island')}
      >
        <div className="flex items-center gap-3">
          <span className="text-[24px]">🏝</span>
          <div>
            <p className="text-primary font-bold text-sm">나의 섬</p>
            <p className="text-muted text-[11px]">건물 관리</p>
          </div>
          <span className="ml-auto text-muted">→</span>
        </div>
      </div>
    </div>
  );
}
