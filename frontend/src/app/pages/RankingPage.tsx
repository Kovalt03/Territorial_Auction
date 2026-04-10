import { useState } from 'react';
import { GNB } from '../components/GNB';

type Period = 'realtime' | 'weekly' | 'monthly' | 'all';
type Category = 'territory' | 'assets' | 'trophy' | 'continent' | 'production';

const rankData = [
  { rank: 1, name: '강남부자', initial: '강', color: '#f06070', territories: 15, assets: 14900, trophy: 4820, continent: '북부 지배', production: '96 GP/분' },
  { rank: 2, name: '픽셀왕', initial: '픽', color: '#8b50ff', territories: 12, assets: 9800, trophy: 3420, continent: '남부 지배', production: '78 GP/분' },
  { rank: 3, name: '영토수집가', initial: '영', color: '#00f5ff', territories: 9, assets: 8500, trophy: 2650, continent: '동부 지배', production: '62 GP/분' },
  { rank: 4, name: '사이버해커', initial: '사', color: '#7788a5', territories: 8, assets: 7200, trophy: 3210, continent: '서부 지배', production: '55 GP/분' },
  { rank: 5, name: '글리치마스터', initial: '글', color: '#7788a5', territories: 7, assets: 6500, trophy: 2980, continent: '', production: '48 GP/분' },
  { rank: 6, name: '레이더', initial: '레', color: '#7788a5', territories: 7, assets: 5900, trophy: 2750, continent: '', production: '45 GP/분' },
  { rank: 7, name: '빌더킹', initial: '빌', color: '#7788a5', territories: 6, assets: 5100, trophy: 2440, continent: '', production: '38 GP/분' },
  { rank: 8, name: '뉴비123', initial: '뉴', color: '#7788a5', territories: 4, assets: 3200, trophy: 1800, continent: '', production: '22 GP/분' },
  { rank: 9, name: '크롬헌터', initial: '크', color: '#7788a5', territories: 3, assets: 2600, trophy: 1200, continent: '', production: '18 GP/분' },
];

const periodLabel: Record<Period, string> = {
  realtime: '실시간', weekly: '주간', monthly: '월간', all: '전체 기간',
};

const categoryLabel: Record<Category, { label: string; icon: string; key: keyof typeof rankData[0] }> = {
  territory: { label: '영토 왕', icon: '🏰', key: 'territories' },
  assets: { label: '자산가', icon: '💰', key: 'assets' },
  trophy: { label: '트로피 랭킹', icon: '🏆', key: 'trophy' },
  continent: { label: '대륙 지배자', icon: '👑', key: 'continent' },
  production: { label: '생산 효율왕', icon: '⚙️', key: 'production' },
};

export function RankingPage() {
  const [period, setPeriod] = useState<Period>('realtime');
  const [category, setCategory] = useState<Category>('territory');

  const cat = categoryLabel[category];
  const top3 = rankData.slice(0, 3);
  const rest = rankData.slice(3);

  const getValue = (r: typeof rankData[0]): string => {
    const v = r[cat.key];
    if (cat.key === 'territories') return `${v}개`;
    if (cat.key === 'assets') return `${Number(v).toLocaleString()} AP`;
    if (cat.key === 'trophy') return `🏆 ${Number(v).toLocaleString()}`;
    return String(v);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex-1 overflow-y-auto p-5">
        <h1 className="text-[#e0e8ff] font-bold mb-4" style={{ fontSize: 26 }}>🏆  랭킹 리더보드</h1>

        <div className="bg-[#2a3050] border border-[#354064] rounded-xl p-1 flex gap-1 mb-4 w-fit">
          {(Object.keys(periodLabel) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-5 py-2 rounded-lg transition-all font-semibold ${
                period === p ? 'bg-[#00f5ff] text-[#0a0e1a]' : 'text-[#7788a5] hover:text-[#e0e8ff]'
              }`}
              style={{ fontSize: 13 }}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>

        <div className="bg-[#1a1f35] border border-[#354064] flex mb-5">
          {(Object.keys(categoryLabel) as Category[]).map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`flex-1 py-3 font-semibold transition-colors relative ${
                category === c ? 'text-[#00f5ff] bg-[#2a3050]' : 'text-[#7788a5] hover:text-[#e0e8ff]'
              }`}
              style={{ fontSize: 13 }}
            >
              {categoryLabel[c].icon} {categoryLabel[c].label}
              {category === c && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f5ff]" />}
            </button>
          ))}
        </div>

        <div className="flex items-end justify-center gap-4 mb-6 relative" style={{ height: 280 }}>
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-2xl mb-2"
              style={{ background: top3[1]?.color + '4d', border: `2px solid ${top3[1]?.color}`, opacity: 0.8, color: top3[1]?.color }}>
              {top3[1]?.initial}
            </div>
            <span style={{ fontSize: 30 }}>🥈</span>
            <div className="w-40 border border-[#bfbfbf] rounded-xl flex flex-col items-center py-4 mb-2"
              style={{ height: 130, background: '#bfbfbf18' }}>
              <p className="text-[#bfbfbf] font-bold" style={{ fontSize: 14 }}>2위</p>
            </div>
            <p className="text-[#bfbfbf] font-bold" style={{ fontSize: 13 }}>{top3[1]?.name}</p>
            <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 18 }}>{top3[1] && getValue(top3[1])}</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-2xl mb-2"
              style={{ background: top3[0]?.color + '4d', border: `2px solid ${top3[0]?.color}`, color: top3[0]?.color }}>
              {top3[0]?.initial}
            </div>
            <span style={{ fontSize: 30 }}>🥇</span>
            <div className="w-44 border-2 border-[#ffd700] rounded-xl flex flex-col items-center py-4 mb-2"
              style={{ height: 160, background: '#ffd70018' }}>
              <p className="text-[#ffd700] font-bold" style={{ fontSize: 14 }}>1위</p>
            </div>
            <p className="text-[#ffd700] font-bold" style={{ fontSize: 13 }}>{top3[0]?.name}</p>
            <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 18 }}>{top3[0] && getValue(top3[0])}</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-2xl mb-2"
              style={{ background: top3[2]?.color + '4d', border: `2px solid #cc8033`, opacity: 0.8, color: '#cc8033' }}>
              {top3[2]?.initial}
            </div>
            <span style={{ fontSize: 30 }}>🥉</span>
            <div className="w-40 border border-[#cc8033] rounded-xl flex flex-col items-center py-4 mb-2"
              style={{ height: 110, background: '#cc803318' }}>
              <p className="text-[#cc8033] font-bold" style={{ fontSize: 14 }}>3위</p>
            </div>
            <p className="text-[#cc8033] font-bold" style={{ fontSize: 13 }}>{top3[2]?.name}</p>
            <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 18 }}>{top3[2] && getValue(top3[2])}</p>
          </div>
        </div>

        <div className="bg-[#1a1f35] border border-[#354064] rounded-xl overflow-hidden">
          <div className="bg-[#2a3050] px-4 py-2.5 border-b-2 border-[#00f5ff] flex items-center justify-between">
            <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>4위 이하 순위</span>
          </div>
          <div className="grid text-[#7788a5] px-4 py-2.5 border-b border-[#354064]"
            style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr', fontSize: 11 }}>
            <span>순위</span>
            <span>플레이어</span>
            <span>점유 영토</span>
            <span>총 자산</span>
            <span>트로피</span>
          </div>
          {rest.map((r, i) => (
            <div
              key={r.rank}
              className={`grid px-4 py-3 border-b border-[#1e2a3d] items-center hover:bg-[#12192c] transition-colors ${i % 2 === 0 ? 'bg-[#12192c] bg-opacity-30' : ''}`}
              style={{ gridTemplateColumns: '80px 1fr 1fr 1fr 1fr' }}
            >
              <span className="text-[#e0e8ff] font-bold" style={{ fontSize: 14 }}>{r.rank}위</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ background: '#8892b04d', fontSize: 14 }}>
                  {r.initial}
                </div>
                <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>{r.name}</span>
              </div>
              <span className="text-[#e0e8ff]" style={{ fontSize: 13 }}>{r.territories}개</span>
              <span className="text-[#ffd700] font-medium" style={{ fontSize: 13 }}>{r.assets.toLocaleString()} AP</span>
              <span className="text-[#e0e8ff]" style={{ fontSize: 13 }}>🏆 {r.trophy.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
