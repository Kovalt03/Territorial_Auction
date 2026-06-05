import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';
import { EmptyState } from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { useMyBids } from '../hooks/useMyBids';
import { useVault } from '../hooks/useVault';
import { subscribeMultiple } from '../hooks/useStompClient';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { GRADE_COLOR } from '../types/grade';

type ActivityTab = 'active' | 'mine' | 'history' | 'bids';
type BidSort = 'time' | 'ap' | 'outbid';

const URGENT_MS = 5 * 60 * 1000;

function fmtTimeLeft(endAt: string, now: number): string {
  const diff = new Date(endAt).getTime() - now;
  if (diff <= 0) return '종료';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}시간 ${String(m).padStart(2, '0')}분`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MyPage() {
  const navigate = useNavigate();
  const { ap, gp, username, hasPass, passEndDate } = useApp();
  const { bids: myBids, isLoading: bidsLoading, refresh: refreshBids } = useMyBids();
  const { territories, isLoading: territoriesLoading } = useVault();
  const [tab, setTab] = useState<ActivityTab>('active');
  const [bidSort, setBidSort] = useState<BidSort>('time');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const passDays = passEndDate
    ? Math.max(0, Math.ceil((passEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const donutData = [
    { name: 'AP', value: ap, color: '#ff0066' },
    { name: 'GP', value: gp, color: '#00ff88' },
  ];
  const totalAssets = ap + gp;

  const activeBids = myBids.filter(b => b.status === 'BIDDING');
  const allBids = myBids;

  function sortedList(list: typeof myBids) {
    if (bidSort === 'ap') return [...list].sort((a, b) => b.currentPrice - a.currentPrice);
    if (bidSort === 'outbid') return [...list].sort((a, b) => {
      if (a.isHighestBidder !== b.isHighestBidder) return a.isHighestBidder ? 1 : -1;
      return 0;
    });
    // 'time': 남은 시간 짧은 순
    return [...list].sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime());
  }

  const activeBidAuctionIds = activeBids.map(b => b.auctionId).join(',');
  useEffect(() => {
    if (!activeBidAuctionIds) return;
    const ids = activeBidAuctionIds.split(',').map(Number);
    return subscribeMultiple(ids.map(id => `/sub/auction/${id}`), refreshBids);
  }, [activeBidAuctionIds, refreshBids]);

  const tabItems: { id: ActivityTab; label: string; count: number }[] = [
    { id: 'active', label: '경매 진행', count: activeBids.length },
    { id: 'mine', label: '내 영토', count: territories.length },
    { id: 'history', label: '거래 내역', count: 0 },
    { id: 'bids', label: '입찰 현황', count: allBids.length },
  ];

  return (
    <div className="page-root">
      <GNB />

      <div className="page-body">
        <h1 className="text-foreground font-bold mb-5 text-[26px]">👤  마이페이지</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* Profile card */}
          <div className="card p-5">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 bg-[#00f5ff20] border-2 border-primary text-primary"
              >
                {(username || '게스트').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-foreground font-bold text-lg">{username || '게스트'}</p>
                <p className="text-muted text-xs">플레이어</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '영토', val: territories.length, color: '#00f5ff' },
                { label: '입찰', val: allBids.length, color: '#ffd700' },
                { label: '경매중', val: activeBids.length, color: '#ff8c00' },
              ].map(s => (
                <div key={s.label} className="bg-elevated rounded-xl p-2 text-center">
                  <p className="font-bold text-sm" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-muted text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assets donut chart */}
          <div className="card p-5">
            <p className="text-muted font-semibold mb-3 text-[13px]">자산 현황</p>
            <div className="flex items-center gap-3">
              <div className="w-[120px] h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1a1f35', border: '1px solid #354064', borderRadius: 8 }} labelStyle={{ color: '#e0e8ff' }} itemStyle={{ color: '#e0e8ff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-ap font-bold text-base">{ap.toLocaleString()} AP</p>
                  <p className="text-muted text-[10px]">{totalAssets > 0 ? Math.round((ap / totalAssets) * 100) : 0}%</p>
                </div>
                <div>
                  <p className="text-gp font-bold text-base">{gp.toLocaleString()} GP</p>
                  <p className="text-muted text-[10px]">{totalAssets > 0 ? Math.round((gp / totalAssets) * 100) : 0}%</p>
                </div>
                <div className="h-px bg-outline" />
                <div>
                  <p className="text-foreground font-semibold text-[13px]">합계</p>
                  <p className="text-gold text-xs">{totalAssets.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick access */}
          <div className="space-y-3">
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
                  <p className="text-muted text-[11px]">보유 영토 {territories.length}개</p>
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
        </div>

        {/* Activity Tabs */}
        <div className="card overflow-hidden">
          <div className="flex border-b border-outline">
            {tabItems.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-3 font-semibold text-[13px] transition-colors relative ${tab === t.id ? 'text-primary bg-primary/10' : 'text-muted'}`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${tab === t.id ? 'bg-primary text-surface' : 'bg-outline text-muted'}`}>
                    {t.count}
                  </span>
                )}
                {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>

          {tab === 'history' ? (
            <div className="p-4">
              <div className="text-center py-8">
                <p className="text-muted text-sm">서비스 준비 중입니다</p>
              </div>
            </div>
          ) : tab === 'mine' ? (
            <div className="p-4">
              {territoriesLoading ? (
                <div className="text-center py-8 text-muted text-sm">불러오는 중...</div>
              ) : territories.length === 0 ? (
                <EmptyState message="보유한 영토가 없습니다" />
              ) : (
                <div className="space-y-2">
                  {territories.map(t => (
                    <button
                      key={t.territoryId}
                      onClick={() => navigate(`/app/territory/${t.territoryId}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-outline hover:bg-[#12192c] transition-colors text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ background: (GRADE_COLOR[t.grade as keyof typeof GRADE_COLOR] ?? '#8892b0') + '30', border: `1px solid ${(GRADE_COLOR[t.grade as keyof typeof GRADE_COLOR] ?? '#8892b0')}60`, color: GRADE_COLOR[t.grade as keyof typeof GRADE_COLOR] ?? '#8892b0' }}
                      >
                        {t.grade}
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground font-semibold text-[13px]">영토 #{t.territoryId}</p>
                        <p className="text-muted text-[11px]">({t.position.x}, {t.position.y}) · {t.continentName}</p>
                      </div>
                      <span className="text-muted text-[11px]">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {!bidsLoading && (tab === 'active' ? activeBids : allBids).length > 0 && (
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-muted text-[11px] mr-1">정렬</span>
                  {([
                    { val: 'time', label: '⏱ 시간순' },
                    { val: 'ap', label: '💰 AP순' },
                    { val: 'outbid', label: '🔺 상회입찰' },
                  ] as { val: BidSort; label: string }[]).map(s => (
                    <button
                      key={s.val}
                      onClick={() => setBidSort(s.val)}
                      className={`px-2.5 h-7 rounded-lg text-[11px] font-semibold transition-colors border ${bidSort === s.val ? 'bg-primary text-surface border-primary' : 'bg-[#1a2438] text-muted border-outline'}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              {bidsLoading ? (
                <div className="text-center py-8 text-muted text-sm">불러오는 중...</div>
              ) : (tab === 'active' ? activeBids : allBids).length === 0 ? (
                <EmptyState message="데이터가 없습니다" />
              ) : (
                <div className="space-y-2">
                  {sortedList(tab === 'active' ? activeBids : allBids).map(b => (
                    <button
                      key={b.auctionId}
                      onClick={() => navigate(`/app/territory/${b.territoryId}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-outline hover:bg-[#12192c] transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[11px] flex-shrink-0 border ${b.isHighestBidder ? 'bg-gp/20 border-gp/60 text-gp' : 'bg-danger/20 border-danger/60 text-danger'}`}>
                        {b.isHighestBidder ? '↑' : '↓'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-foreground font-semibold text-[13px]">
                            ({b.coordX}, {b.coordY})
                          </p>
                          <span
                            className="px-1.5 py-0.5 rounded font-bold text-[9px]"
                            style={{ color: GRADE_COLOR[b.grade as keyof typeof GRADE_COLOR] ?? '#8892b0', background: (GRADE_COLOR[b.grade as keyof typeof GRADE_COLOR] ?? '#8892b0') + '20' }}
                          >
                            {b.grade}급
                          </span>
                        </div>
                        <p className="text-muted text-[11px]">
                          {b.continentName} · {b.isHighestBidder ? '최고가 유지' : '상회 입찰됨'}
                        </p>
                        <p className="text-[#7788a5] text-[10px]">
                          내 입찰 {b.myBidAmount.toLocaleString()} AP
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gold font-bold text-[13px]">
                          {b.currentPrice.toLocaleString()} AP
                        </p>
                        <p className="text-muted text-[10px]">현재가</p>
                        {b.status === 'BIDDING' && (
                          <p className={`font-semibold text-[10px] mt-0.5 tabular-nums ${new Date(b.endAt).getTime() - now < URGENT_MS ? 'text-flare' : 'text-dim'}`}>
                            {fmtTimeLeft(b.endAt, now)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
