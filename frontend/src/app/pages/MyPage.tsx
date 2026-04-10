import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

type ActivityTab = 'active' | 'mine' | 'history' | 'bids';

export function MyPage() {
  const navigate = useNavigate();
  const { ap, gp, territories, username, hasPass, passEndDate } = useApp();
  const [tab, setTab] = useState<ActivityTab>('active');

  const myTerritories = territories.filter(t => t.status === 'mine');
  const auctionTerritories = territories.filter(t => t.status === 'auction');
  const bidTerritories = territories.filter(t => t.myBid !== undefined && t.myBid > 0);

  const passDays = passEndDate
    ? Math.max(0, Math.ceil((passEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const donutData = [
    { name: 'AP', value: ap, color: '#ff0066' },
    { name: 'GP', value: gp, color: '#00ff88' },
  ];

  const totalAssets = ap + gp;

  const tabItems: { id: ActivityTab; label: string; count: number }[] = [
    { id: 'active', label: '경매 진행', count: auctionTerritories.length },
    { id: 'mine', label: '내 영토', count: myTerritories.length },
    { id: 'history', label: '거래 내역', count: 12 },
    { id: 'bids', label: '입찰 현황', count: bidTerritories.length },
  ];

  const getTabList = () => {
    switch (tab) {
      case 'active': return auctionTerritories;
      case 'mine': return myTerritories;
      case 'bids': return bidTerritories;
      default: return [];
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex-1 overflow-y-auto p-5">
        <h1 className="text-[#e0e8ff] font-bold mb-5" style={{ fontSize: 26 }}>👤  마이페이지</h1>

        <div className="grid grid-cols-3 gap-4 mb-5">
          {/* Profile card */}
          <div className="bg-[#1a1f35] border border-[#354064] rounded-xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0"
                style={{ background: '#00f5ff20', border: '2px solid #00f5ff', color: '#00f5ff' }}
              >
                {(username || '게스트').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[#e0e8ff] font-bold" style={{ fontSize: 18 }}>{username || '게스트'}</p>
                <p className="text-[#7788a5]" style={{ fontSize: 12 }}>플레이어</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '영토', val: myTerritories.length, color: '#00f5ff' },
                { label: '트로피', val: '1,240', color: '#ffd700' },
                { label: '랭킹', val: '12위', color: '#ff8c00' },
              ].map(s => (
                <div key={s.label} className="bg-[#2a3050] rounded-xl p-2 text-center">
                  <p className="font-bold" style={{ fontSize: 14, color: s.color }}>{s.val}</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 10 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assets donut chart */}
          <div className="bg-[#1a1f35] border border-[#354064] rounded-xl p-5">
            <p className="text-[#7788a5] font-semibold mb-3" style={{ fontSize: 13 }}>자산 현황</p>
            <div className="flex items-center gap-3">
              <div style={{ width: 120, height: 120 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1a1f35', border: '1px solid #354064', borderRadius: 8 }}
                      labelStyle={{ color: '#e0e8ff' }}
                      itemStyle={{ color: '#e0e8ff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[#ff0066] font-bold" style={{ fontSize: 16 }}>{ap.toLocaleString()} AP</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 10 }}>{totalAssets > 0 ? Math.round((ap / totalAssets) * 100) : 0}%</p>
                </div>
                <div>
                  <p className="text-[#00ff88] font-bold" style={{ fontSize: 16 }}>{gp.toLocaleString()} GP</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 10 }}>{totalAssets > 0 ? Math.round((gp / totalAssets) * 100) : 0}%</p>
                </div>
                <div className="h-px bg-[#354064]" />
                <div>
                  <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>합계</p>
                  <p className="text-[#ffd700]" style={{ fontSize: 12 }}>{totalAssets.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick access + Season Pass */}
          <div className="space-y-3">
            <div
              className="bg-[#1a1f35] border rounded-xl p-4 cursor-pointer hover:brightness-110 transition-all"
              style={{ borderColor: hasPass ? '#ffd700' : '#354064' }}
              onClick={() => navigate('/app/season-pass')}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 24 }}>⭐</span>
                <div>
                  <p className="text-[#ffd700] font-bold" style={{ fontSize: 14 }}>시즌 패스</p>
                  {hasPass ? (
                    <p className="text-[#7788a5]" style={{ fontSize: 11 }}>D-{passDays}일 남음</p>
                  ) : (
                    <p className="text-[#7788a5]" style={{ fontSize: 11 }}>미구매 · 1,000 AP</p>
                  )}
                </div>
                <span className="ml-auto text-[#7788a5]">→</span>
              </div>
            </div>
            <div
              className="bg-[#1a1f35] border border-[#354064] rounded-xl p-4 cursor-pointer hover:brightness-110 transition-all"
              onClick={() => navigate('/app/vault')}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 24 }}>💰</span>
                <div>
                  <p className="text-[#00ff88] font-bold" style={{ fontSize: 14 }}>글로벌 금고</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 11 }}>8,200 / 10,000 GP</p>
                </div>
                <span className="ml-auto text-[#7788a5]">→</span>
              </div>
            </div>
            <div
              className="bg-[#1a1f35] border border-[#354064] rounded-xl p-4 cursor-pointer hover:brightness-110 transition-all"
              onClick={() => navigate('/app/my-island')}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 24 }}>🏝</span>
                <div>
                  <p className="text-[#44aaff] font-bold" style={{ fontSize: 14 }}>나의 섬</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 11 }}>S급 · 20×16 그리드</p>
                </div>
                <span className="ml-auto text-[#7788a5]">→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Tabs */}
        <div className="bg-[#1a1f35] border border-[#354064] rounded-xl overflow-hidden">
          <div className="flex border-b border-[#354064]">
            {tabItems.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 py-3 font-semibold transition-colors relative"
                style={{
                  fontSize: 13,
                  color: tab === t.id ? '#00f5ff' : '#7788a5',
                  background: tab === t.id ? '#00f5ff10' : 'transparent',
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className="ml-1.5 px-1.5 py-0.5 rounded-full"
                    style={{ fontSize: 10, background: tab === t.id ? '#00f5ff' : '#354064', color: tab === t.id ? '#0a0e1a' : '#7788a5' }}
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
              <div className="grid text-[#7788a5] px-2 py-2 border-b border-[#354064]" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', fontSize: 11 }}>
                <span>날짜</span><span>영토</span><span>유형</span><span>금액</span>
              </div>
              {[
                { date: '04-08', name: '네온 하이웨이', type: '입찰', amount: -2400, color: '#ff3333' },
                { date: '04-07', name: '사이버 협곡', type: '점유 해제', amount: +1200, color: '#00ff88' },
                { date: '04-06', name: '크롬 평야', type: '입찰', amount: -1800, color: '#ff3333' },
                { date: '04-05', name: '데이터 봉우리', type: 'AP 충전', amount: +30000, color: '#00f5ff' },
              ].map((row, i) => (
                <div key={i} className="grid px-2 py-3 border-b border-[#1e2a3d] items-center hover:bg-[#12192c] transition-colors" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                  <span className="text-[#7788a5]" style={{ fontSize: 12 }}>{row.date}</span>
                  <span className="text-[#e0e8ff]" style={{ fontSize: 12 }}>{row.name}</span>
                  <span className="text-[#7788a5]" style={{ fontSize: 12 }}>{row.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: row.color }}>
                    {row.amount > 0 ? '+' : ''}{row.amount.toLocaleString()} AP
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4">
              {getTabList().length > 0 ? (
                <div className="space-y-2">
                  {getTabList().map(t => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/app/territory/${t.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#12192c] transition-colors text-left"
                      style={{ border: '1px solid #1e2a3d' }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                        style={{ background: t.color + '30', border: `1px solid ${t.color}60`, color: t.color, fontSize: 14 }}
                      >
                        {t.grade}
                      </div>
                      <div className="flex-1">
                        <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>{t.name}</p>
                        <p className="text-[#7788a5]" style={{ fontSize: 11 }}>({t.x}, {t.y}) · +{t.gpPerMin} GP/분</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#ffd700] font-bold" style={{ fontSize: 13 }}>
                          {tab === 'bids' ? `입찰 ${t.myBid?.toLocaleString()}` : t.currentBid.toLocaleString()} AP
                        </p>
                        <p className="text-[#7788a5]" style={{ fontSize: 10 }}>
                          {tab === 'bids' ? '내 입찰' : '현재가'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#4a5a7a]" style={{ fontSize: 14 }}>데이터가 없습니다</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
