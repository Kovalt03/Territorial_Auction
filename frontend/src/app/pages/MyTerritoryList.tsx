import { useNavigate } from 'react-router';

import { EmptyState } from '../components/EmptyState';

import { GRADE_COLOR } from '../types/grade';
import type { MyTerritory } from '../types/vault';

interface Props {
  territories: MyTerritory[];
  isLoading: boolean;
}

export function MyTerritoryList({ territories, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) return <div className="text-center py-8 text-muted text-sm">불러오는 중...</div>;
  if (territories.length === 0) return <EmptyState message="보유한 영토가 없습니다" />;

  return (
    <div className="space-y-2">
      {territories.map(t => {
        const color = GRADE_COLOR[t.grade as keyof typeof GRADE_COLOR] ?? '#8892b0';
        return (
          <button
            key={t.territoryId}
            onClick={() => navigate(`/app/territory/${t.territoryId}`)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-outline hover:bg-panel-deep transition-colors text-left"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: color + '30', border: `1px solid ${color}60`, color }}
            >
              {t.grade}
            </div>
            <div className="flex-1">
              <p className="text-foreground font-semibold text-[13px]">영토 #{t.territoryId}</p>
              <p className="text-muted text-[11px]">({t.position.x}, {t.position.y}) · {t.continentName}</p>
            </div>
            <span className="text-muted text-[11px]">→</span>
          </button>
        );
      })}
    </div>
  );
}
