import { useState } from 'react';

import { useContinentAuctions } from '../hooks/useContinentAuctions';

import type { AuctionItem } from '../types/auction';
import type { Grade } from '../types/grade';
import { GRADE_COLOR } from '../types/grade';

const GRADE_EMOJI: Record<Grade, string> = { S: '👑', A: '💎', B: '🔷', C: '🔹' };
const GRADE_RANK: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
const PAGE_SIZE = 5;
const CLOSING_SOON_MS = 10 * 60 * 1000;

const SORTS = [
  { key: 'end-asc', label: '종료 임박순' },
  { key: 'grade-desc', label: '등급 높은순' },
  { key: 'grade-asc', label: '등급 낮은순' },
] as const;

type SortKey = (typeof SORTS)[number]['key'];

interface Props {
  continentId: number;
  onSelect: (id: number) => void;
}

function compareAuctions(a: AuctionItem, b: AuctionItem, sort: SortKey): number {
  if (sort === 'end-asc') return new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
  const diff = (GRADE_RANK[a.grade] ?? 9) - (GRADE_RANK[b.grade] ?? 9);
  return sort === 'grade-desc' ? diff : -diff;
}

function remainingLabel(endAt: string): { text: string; color: string } {
  const diff = new Date(endAt).getTime() - Date.now();
  if (diff <= 0) return { text: '종료', color: 'var(--color-muted)' };
  if (diff < CLOSING_SOON_MS) return { text: '마감 임박', color: '#ff8c00' };
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { text: `${mins}분`, color: '#ffd700' };
  return { text: `${Math.floor(mins / 60)}시간`, color: '#ffd700' };
}

export function ContinentAuctionList({ continentId, onSelect }: Props) {
  const { data, isLoading, error } = useContinentAuctions(continentId);
  const [sort, setSort] = useState<SortKey>('end-asc');
  const [page, setPage] = useState(0);

  const auctions = data?.auctions ?? [];
  const sorted = [...auctions].sort((a, b) => compareAuctions(a, b, sort));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, totalPages - 1);
  const rows = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="px-4 py-3 border-b border-outline-soft">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-foreground-soft">
          🔥 경매 중인 영토<span className="text-muted font-normal ml-1">{auctions.length}</span>
        </p>
        {auctions.length > 1 && (
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortKey); setPage(0); }}
            className="text-[10px] bg-panel-deep border border-outline-soft rounded text-muted px-1 py-0.5"
          >
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        )}
      </div>

      {error ? (
        <p className="text-danger text-[10px] px-2 py-1">{error}</p>
      ) : isLoading ? (
        <p className="text-muted text-[10px] px-2 py-1">불러오는 중…</p>
      ) : auctions.length === 0 ? (
        <p className="text-muted text-[10px] px-2 py-1">진행 중인 경매가 없습니다</p>
      ) : (
        <>
          {rows.map(t => {
            const remaining = remainingLabel(t.endAt);
            return (
              <button
                key={t.auctionId}
                onClick={() => onSelect(t.territoryId)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-panel-deep transition-colors"
              >
                <span className="leading-none" style={{ fontSize: 11 }}>{GRADE_EMOJI[t.grade as Grade] ?? '🔹'}</span>
                <span className="text-[11px] font-semibold" style={{ color: GRADE_COLOR[t.grade as Grade] }}>{t.grade}</span>
                <span className="text-muted text-[10px]">({t.coordX}, {t.coordY})</span>
                <span className="ml-auto text-[10px] font-medium" style={{ color: remaining.color }}>{remaining.text}</span>
              </button>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-1.5">
              <button
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                className="text-muted text-[11px] px-1 hover:text-foreground-soft disabled:opacity-30"
              >◀</button>
              <span className="text-muted text-[10px]">{current + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(current + 1)}
                disabled={current >= totalPages - 1}
                className="text-muted text-[11px] px-1 hover:text-foreground-soft disabled:opacity-30"
              >▶</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
