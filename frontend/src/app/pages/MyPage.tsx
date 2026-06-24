import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

import { useApp } from '../context/AppContext';
import { useMyBids } from '../hooks/useMyBids';
import { useVault } from '../hooks/useVault';

import { GNB } from '../components/GNB';
import { MyPageQuickLinks } from './MyPageQuickLinks';

export function MyPage() {
  const { ap, gp, username, hasPass, passEndDate } = useApp();
  const { bids: myBids } = useMyBids();
  const { territories } = useVault();

  const passDays = passEndDate
    ? Math.max(0, Math.ceil((passEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const donutData = [
    { name: 'AP', value: ap, color: '#ff0066' },
    { name: 'GP', value: gp, color: '#00ff88' },
  ];
  const totalAssets = ap + gp;

  const activeBids = myBids.filter(b => b.status === 'BIDDING');

  return (
    <div className="page-root">
      <GNB />

      <div className="page-body">
        <h1 className="text-foreground font-bold mb-5 text-[26px]">👤  마이페이지</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* Profile card */}
          <div className="card p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 bg-[#00f5ff20] border-2 border-primary text-primary">
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
                { label: '입찰', val: myBids.length, color: '#ffd700' },
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
          <MyPageQuickLinks hasPass={hasPass} passDays={passDays} territoryCount={territories.length} />
        </div>
      </div>
    </div>
  );
}
