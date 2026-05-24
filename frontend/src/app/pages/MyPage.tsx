import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import { useMyBids } from '../hooks/useMyBids';
import { useVault } from '../hooks/useVault';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

type ActivityTab = 'active' | 'mine' | 'history' | 'bids';

const GRADE_COLOR: Record<string, string> = { S: '#ffd700', A: '#00f5ff', B: '#00ff88', C: '#8892b0' };

export function MyPage() {
  const navigate = useNavigate();
  const { ap, gp, username, hasPass, passEndDate } = useApp();
  const { bids: myBids, isLoading: bidsLoading } = useMyBids();
  const { territories, isLoading: territoriesLoading } = useVault();
  const [tab, setTab] = useState<ActivityTab>('active');

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
        <h1 className="text-[#e0e8ff] font-bold mb-5 text-[26px]">👤  마이페이지</h1>

        <div className="grid grid-cols-3 gap-4 mb-5">
          {/* Profile card */}
          <div className="card p-5">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 bg-[#00f5ff20] border-2 border-[#00f5ff] text-[#00f5ff]"
              >
                {(username || '게스트').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[#e0e8ff] font-bold text-lg">{username || '게스트'}</p>
                <p className="text-[#7788a5] text-xs">플레이어</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '영토', val: territories.length, color: '#00f5ff' },
                { label: '입찰', val: allBids.length, color: '#ffd700' },
                { label: '경매중', val: activeBids.length, color: '#ff8c00' },
              ].map(s => (
                <div key={s.label} className="bg-[#2a3050] rounded-xl p-2 text-center">
                  <p className="font-bold text-sm" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[#7788a5] text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assets donut chart */}
          <div className="card p-5">
            <p className="text-[#7788a5] font-semibold mb-3 text-[13px]">자산 현황</p>
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
                  <p className="text-[#ff0066] font-bold text-base">{ap.toLocaleString()} AP</p>
                  <p className="text-[#7788a5] text-[10px]">{totalAssets > 0 ? Math.round((ap / totalAssets) * 100) : 0}%</p>
                </div>
                <div>
                  <p className="text-[#00ff88] font-bold text-base">{gp.toLocaleString()} GP</p>
                  <p className="text-[#7788a5] text-[10px]">{totalAssets > 0 ? Math.round((gp / totalAssets) * 100) : 0}%</p>
                </div>
                <div className="h-px bg-[#354064]" />
                <div>
                  <p className="text-[#e0e8ff] font-semibold text-[13px]">합계</p>
                  <p className="text-[#ffd700] text-xs">{totalAssets.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick access */}
          <div className="space-y-3">
            <div
              className="bg-[#1a1f35] border rounded-xl p-4 cursor-pointer hover:brightness-110 transition-all"
              style={{ borderColor: hasPass ? '#ffd700' : '#354064' }}
              onClick={() => navigate('/app/season-pass')}
            >
              <div className="flex items-center gap-3">
                <span className="text-[24px]">⭐</span>
                <div>
                  <p className="text-[#ffd700] font-bold text-sm">시즌 패스</p>
                  {hasPass ? (
                    <p className="text-[#7788a5] text-[11px]">D-{passDays}일 남음</p>
                  ) : (
                    <p className="text-[#7788a5] text-[11px]">미구매 · 1,000 AP</p>
                  )}
                </div>
                <span className="ml-auto text-[#7788a5]">→</span>
              </div>
            </div>
            <div
              className="card p-4 cursor-pointer hover:brightness-110 transition-all"
              onClick={() => navigate('/app/vault')}
            >
              <div className="flex items-center gap-3">
                <span className="text-[24px]">💰</span>
                <div>
                  <p className="text-[#00ff88] font-bold text-sm">글로벌 금고</p>
                  <p className="text-[#7788a5] text-[11px]">보유 영토 {territories.length}개</p>
                </div>
                <span className="ml-auto text-[#7788a5]">→</span>
              </div>
            </div>
            <div
              className="card p-4 cursor-pointer hover:brightness-110 transition-all"
              onClick={() => navigate('/app/my-island')}
            >
              <div className="flex items-center gap-3">
                <span className="text-[24px]">🏝</span>
                <div>
                  <p className="text-[#00f5ff] font-bold text-sm">나의 섬</p>
                  <p className="text-[#7788a5] text-[11px]">건물 관리</p>
                </div>
                <span className="ml-auto text-[#7788a5]">→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Tabs */}
        <div className="card overflow-hidden">
          <div className="flex border-b border-[#354064]">
            {tabItems.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 py-3 font-semibold text-[13px] transition-colors relative"
                style={{
                  color: tab === t.id ? '#00f5ff' : '#7788a5',
                  background: tab === t.id ? '#00f5ff10' : 'transparent',
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: tab === t.id ? '#00f5ff' : '#354064', color: tab === t.id ? '#0a0e1a' : '#7788a5' }}
                  >
                    {t.count}
                  </span>
                )}
                {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f5ff]" />}
              </button>
            ))}
          </div>

          {tab === 'history' ? (
            <div className="p-4">
              <div className="text-center py-8">
                <p className="text-[#4a5a7a] text-sm">서비스 준비 중입니다</p>
              </div>
            </div>
          ) : tab === 'mine' ? (
            <div className="p-4">
              {territoriesLoading ? (
                <div className="text-center py-8 text-[#4a5a7a] text-sm">불러오는 중...</div>
              ) : territories.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#4a5a7a] text-sm">보유한 영토가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {territories.map(t => (
                    <button
                      key={t.territoryId}
                      onClick={() => navigate(`/app/territory/${t.territoryId}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#354064] hover:bg-[#12192c] transition-colors text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ background: (GRADE_COLOR[t.grade] ?? '#8892b0') + '30', border: `1px solid ${(GRADE_COLOR[t.grade] ?? '#8892b0')}60`, color: GRADE_COLOR[t.grade] ?? '#8892b0' }}
                      >
                        {t.grade}
                      </div>
                      <div className="flex-1">
                        <p className="text-[#e0e8ff] font-semibold text-[13px]">영토 #{t.territoryId}</p>
                        <p className="text-[#7788a5] text-[11px]">({t.position.x}, {t.position.y}) · {t.continentName}</p>
                      </div>
                      <span className="text-[#7788a5] text-[11px]">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {bidsLoading ? (
                <div className="text-center py-8 text-[#4a5a7a] text-sm">불러오는 중...</div>
              ) : (tab === 'active' ? activeBids : allBids).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#4a5a7a] text-sm">데이터가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(tab === 'active' ? activeBids : allBids).map(b => (
                    <button
                      key={b.auctionId}
                      onClick={() => navigate(`/app/territory/${b.territoryId}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#354064] hover:bg-[#12192c] transition-colors text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[11px] flex-shrink-0"
                        style={{
                          background: b.isHighestBidder ? '#00ff8820' : '#ff333320',
                          border: `1px solid ${b.isHighestBidder ? '#00ff8860' : '#ff333360'}`,
                          color: b.isHighestBidder ? '#00ff88' : '#ff3333',
                        }}
                      >
                        {b.isHighestBidder ? '↑' : '↓'}
                      </div>
                      <div className="flex-1">
                        <p className="text-[#e0e8ff] font-semibold text-[13px]">
                          ({b.coordX}, {b.coordY})
                        </p>
                        <p className="text-[#7788a5] text-[11px]">
                          내 입찰 {b.myBidAmount.toLocaleString()} AP · {b.isHighestBidder ? '최고가 유지' : '상회 입찰됨'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#ffd700] font-bold text-[13px]">
                          {b.currentPrice.toLocaleString()} AP
                        </p>
                        <p className="text-[#7788a5] text-[10px]">현재가</p>
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
