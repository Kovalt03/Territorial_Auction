import { useState } from 'react';

import { useTerritoryHoldRanking, useAuctionSpendRanking } from '../hooks/useRanking';
import { GNB } from '../components/GNB';
import type { TerritoryHoldRankEntry, AuctionSpendRankEntry } from '../types/ranking';

type Period = 'realtime' | 'weekly' | 'monthly' | 'all';
type Category = 'territory' | 'assets' | 'trophy' | 'continent' | 'production';

const periodLabel: Record<Period, string> = {
  realtime: '실시간', weekly: '주간', monthly: '월간', all: '전체 기간',
};

const categoryLabel: Record<Category, { label: string; icon: string }> = {
  territory: { label: '영토 왕', icon: '🏰' },
  assets: { label: '자산가', icon: '💰' },
  trophy: { label: '트로피 랭킹', icon: '🏆' },
  continent: { label: '대륙 지배자', icon: '👑' },
  production: { label: '생산 효율왕', icon: '⚙️' },
};

const RANK_COLORS = ['#ffd700', '#bfbfbf', '#cc8033'];

interface NormalizedEntry {
  rank: number;
  nickname: string;
  valueLabel: string;
}

function normalizeTerritoryHold(entries: TerritoryHoldRankEntry[]): NormalizedEntry[] {
  return entries.map(e => ({
    rank: e.rank,
    nickname: e.nickname,
    valueLabel: `${e.score}개`,
  }));
}

function normalizeAuctionSpend(entries: AuctionSpendRankEntry[]): NormalizedEntry[] {
  return entries.map(e => ({
    rank: e.rank,
    nickname: e.nickname,
    valueLabel: `${e.totalSpentAP.toLocaleString()} AP`,
  }));
}

function initial(nickname: string) {
  return nickname.charAt(0) || '?';
}

function rankColor(rank: number): string {
  return RANK_COLORS[rank - 1] ?? '#7788a5';
}

function PodiumCard({ entry, height, medal }: { entry: NormalizedEntry; height: number; medal: string }) {
  const color = rankColor(entry.rank);
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl mb-2"
        style={{ background: color + '4d', border: `2px solid ${color}`, color }}>
        {initial(entry.nickname)}
      </div>
      <span style={{ fontSize: 30 }}>{medal}</span>
      <div className="w-40 rounded-xl flex flex-col items-center py-4 mb-2"
        style={{ height, background: color + '18', border: `${entry.rank === 1 ? 2 : 1}px solid ${color}` }}>
        <p className="font-bold" style={{ fontSize: 14, color }}>{entry.rank}위</p>
      </div>
      <p className="font-bold" style={{ fontSize: 13, color }}>{entry.nickname}</p>
      <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 18 }}>{entry.valueLabel}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="grid px-4 py-3 border-b border-[#1e2a3d] items-center animate-pulse"
          style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr' }}>
          <div className="h-4 bg-[#2a3050] rounded w-12" />
          <div className="h-4 bg-[#2a3050] rounded w-24" />
          <div className="h-4 bg-[#2a3050] rounded w-16" />
          <div className="h-4 bg-[#2a3050] rounded w-20" />
          <div className="h-4 bg-[#2a3050] rounded w-16" />
        </div>
      ))}
    </>
  );
}

export function RankingPage() {
  const [period, setPeriod] = useState<Period>('realtime');
  const [category, setCategory] = useState<Category>('territory');

  const { data: holdData, isLoading: holdLoading } = useTerritoryHoldRanking();
  const { data: spendData, isLoading: spendLoading } = useAuctionSpendRanking();

  const isApiCategory = category === 'territory' || category === 'assets';
  const isLoading = category === 'territory' ? holdLoading : category === 'assets' ? spendLoading : false;

  const entries: NormalizedEntry[] = (() => {
    if (category === 'territory' && holdData) return normalizeTerritoryHold(holdData.rankings);
    if (category === 'assets' && spendData) return normalizeAuctionSpend(spendData.rankings);
    return [];
  })();

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const podiumOrder = top3.length >= 2
    ? [top3[1], top3[0], top3[2]].filter(Boolean)
    : top3;
  const podiumHeights = [130, 160, 110];
  const podiumMedals = ['🥈', '🥇', '🥉'];

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex-1 overflow-y-auto p-5">
        <h1 className="text-[#e0e8ff] font-bold mb-4" style={{ fontSize: 26 }}>🏆  랭킹 리더보드</h1>

        <div className="bg-[#2a3050] border border-[#354064] rounded-xl p-1 flex gap-1 mb-4 w-fit">
          {(Object.keys(periodLabel) as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-5 py-2 rounded-lg transition-all font-semibold ${period === p ? 'bg-[#00f5ff] text-[#0a0e1a]' : 'text-[#7788a5] hover:text-[#e0e8ff]'}`}
              style={{ fontSize: 13 }}>
              {periodLabel[p]}
            </button>
          ))}
        </div>

        <div className="bg-[#1a1f35] border border-[#354064] flex mb-5">
          {(Object.keys(categoryLabel) as Category[]).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`flex-1 py-3 font-semibold transition-colors relative ${category === c ? 'text-[#00f5ff] bg-[#2a3050]' : 'text-[#7788a5] hover:text-[#e0e8ff]'}`}
              style={{ fontSize: 13 }}>
              {categoryLabel[c].icon} {categoryLabel[c].label}
              {category === c && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f5ff]" />}
            </button>
          ))}
        </div>

        {!isApiCategory ? (
          <div className="flex items-center justify-center h-48 bg-[#1a1f35] border border-[#354064] rounded-xl">
            <p className="text-[#4a5a7a]" style={{ fontSize: 14 }}>준비 중입니다</p>
          </div>
        ) : (
          <>
            {isLoading ? (
              <div className="flex items-end justify-center gap-4 mb-6" style={{ height: 280 }}>
                {[130, 160, 110].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                    <div className="w-14 h-14 rounded-full bg-[#2a3050]" />
                    <div className="w-40 rounded-xl bg-[#2a3050]" style={{ height: h }} />
                  </div>
                ))}
              </div>
            ) : top3.length === 0 ? (
              <div className="flex items-center justify-center h-48 bg-[#1a1f35] border border-[#354064] rounded-xl mb-6">
                <p className="text-[#4a5a7a]" style={{ fontSize: 14 }}>랭킹 데이터가 없습니다</p>
              </div>
            ) : (
              <div className="flex items-end justify-center gap-4 mb-6 relative" style={{ height: 280 }}>
                {podiumOrder.map((entry, i) => (
                  <PodiumCard
                    key={entry.rank}
                    entry={entry}
                    height={podiumHeights[i]}
                    medal={podiumMedals[i]}
                  />
                ))}
              </div>
            )}

            <div className="bg-[#1a1f35] border border-[#354064] rounded-xl overflow-hidden">
              <div className="bg-[#2a3050] px-4 py-2.5 border-b-2 border-[#00f5ff] flex items-center justify-between">
                <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>4위 이하 순위</span>
              </div>
              <div className="grid text-[#7788a5] px-4 py-2.5 border-b border-[#354064]"
                style={{ gridTemplateColumns: '80px 1fr 1fr', fontSize: 11 }}>
                <span>순위</span>
                <span>플레이어</span>
                <span>{category === 'territory' ? '점유 영토' : '총 지출'}</span>
              </div>
              {isLoading ? (
                <LoadingRows />
              ) : rest.length === 0 ? (
                <div className="px-4 py-6 text-center text-[#4a5a7a]" style={{ fontSize: 12 }}>데이터가 없습니다</div>
              ) : (
                rest.map((r, i) => (
                  <div key={r.rank}
                    className={`grid px-4 py-3 border-b border-[#1e2a3d] items-center hover:bg-[#12192c] transition-colors ${i % 2 === 0 ? 'bg-[#12192c] bg-opacity-30' : ''}`}
                    style={{ gridTemplateColumns: '80px 1fr 1fr' }}>
                    <span className="text-[#e0e8ff] font-bold" style={{ fontSize: 14 }}>{r.rank}위</span>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                        style={{ background: '#8892b04d', fontSize: 14 }}>
                        {initial(r.nickname)}
                      </div>
                      <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>{r.nickname}</span>
                    </div>
                    <span className="text-[#ffd700] font-medium" style={{ fontSize: 13 }}>{r.valueLabel}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
