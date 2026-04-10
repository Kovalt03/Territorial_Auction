import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';

type ListTab = 'bidding' | 'wishlist';
type ChartRange = '7일' | '30일' | '90일';

// Deterministic mock data
const mkData = (n: number, base: number, amp: number, trend: number) =>
  Array.from({ length: n }, (_, i) =>
    Math.max(100, Math.round(base + Math.sin(i * 0.7) * amp + i * trend + ((i * 13 + 7) % 17) * (amp / 8)))
  );

const CHART_DATA: Record<ChartRange, number[]> = {
  '7일':  [1200, 1450, 1300, 1800, 2100, 1950, 2400],
  '30일': mkData(30, 1000, 400, 45),
  '90일': mkData(90, 800, 600, 18),
};

const CHART_LABELS: Record<ChartRange, string[]> = {
  '7일':  ['7일전', '6일전', '5일전', '4일전', '3일전', '2일전', '어제'],
  '30일': Array.from({ length: 30 }, (_, i) => i % 5 === 0 ? `${30 - i}일전` : ''),
  '90일': Array.from({ length: 90 }, (_, i) => i % 15 === 0 ? `${Math.round((90 - i) / 30)}달전` : ''),
};

const GRADE_GRID_SIZE: Record<string, number> = { S: 12, A: 10, B: 8, C: 6 };
const GRADE_COLOR: Record<string, string> = { S: '#ffd700', A: '#00f5ff', B: '#00ff88', C: '#8892b0' };

function getContinent(x: number, y: number): string {
  if (x >= 20 && x <= 30 && y >= 20 && y <= 30) return '중앙 자유 구역';
  if (x < 15) return y < 25 ? '북아메리카' : '남아메리카';
  if (x >= 15 && x < 28) return y < 22 ? '유럽' : '아프리카';
  if (x >= 28 && x < 38) return y < 22 ? '동아시아' : '동남아시아';
  return '오세아니아';
}

const INIT_CHAT: { user: string; text: string; time: string; mine?: boolean }[] = [
  { user: 'CyberWolf', text: '이 지역 S급 영토 노리는 사람 있어요?', time: '14:22' },
  { user: 'NeonKing', text: '저도 입찰 중인데 경쟁 치열하네요', time: '14:23' },
  { user: 'StarHunter', text: '3-3 지금 2400 AP까지 올라갔던데', time: '14:25' },
  { user: 'CyberWolf', text: '같이 연합 형성해서 막는 게 낫지 않을까요', time: '14:26' },
  { user: 'PixelAce', text: '연합 관심 있어요! DM 주세요', time: '14:28' },
];

function LineChart({ data, color }: { data: number[]; color: string }) {
  const W = 300, H = 120, PAD = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (v - min) / range) * (H - PAD * 2),
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${H} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#chartFill)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last point dot */}
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="5" fill={color} fillOpacity="0.25" />
    </svg>
  );
}

export function TerritoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { territories, placeBid, toggleWishlist, ap, useAP, username } = useApp();

  const territory = territories.find(t => t.id === id) || territories[0];
  const biddingList = territories.filter(t => t.myBid !== undefined && t.myBid > 0);
  const wishlistList = territories.filter(t => t.isWishlisted);

  const gridSize = GRADE_GRID_SIZE[territory?.grade ?? 'B'] ?? 10;
  const gradeColor = GRADE_COLOR[territory?.grade ?? 'B'] ?? '#00ff88';
  const currentBid = territory?.currentBid ?? 0;
  const myBid = territory?.myBid ?? 0;
  const isOutbid = myBid > 0 && currentBid > myBid;

  const continentName = getContinent(territory?.x ?? 25, territory?.y ?? 25);

  const [listTab, setListTab] = useState<ListTab>('bidding');
  const [bidAmount, setBidAmount] = useState(currentBid + 100);
  const [showConfirm, setShowConfirm] = useState(false);
  const [quickBidId, setQuickBidId] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>('7일');
  const [chatMessages, setChatMessages] = useState(INIT_CHAT);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const chartData = CHART_DATA[chartRange];
  const chartLabels = CHART_LABELS[chartRange];
  const labelStep = chartRange === '7일' ? 1 : chartRange === '30일' ? 5 : 15;

  const handleBid = () => {
    if (!territory) return;
    placeBid(territory.id, bidAmount);
    setShowConfirm(false);
  };

  const handleRebid = () => {
    setBidAmount(currentBid + 100);
  };

  const handleQuickBid = (e: React.MouseEvent, tid: string, minBid: number) => {
    e.stopPropagation();
    if (ap >= minBid) {
      useAP(minBid);
      placeBid(tid, minBid);
      setQuickBidId(tid);
      setTimeout(() => setQuickBidId(null), 2000);
    }
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setChatMessages(prev => [...prev, { user: username ?? '나', text, time, mine: true }]);
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel ── Bidding list / Wishlist */}
        <div className="w-[270px] bg-[#0d1220] border-r border-[#1e2a3d] flex flex-col flex-shrink-0">
          <div className="flex border-b border-[#1e2a3d]">
            {([['bidding', '입찰 중', '#00f5ff', biddingList.length], ['wishlist', '관심 등록', '#ffd700', wishlistList.length]] as const).map(([tab, label, color, cnt]) => (
              <button
                key={tab}
                onClick={() => setListTab(tab)}
                className="flex-1 py-3 font-semibold transition-colors"
                style={{
                  fontSize: 12,
                  color: listTab === tab ? color : '#7788a5',
                  background: listTab === tab ? color + '10' : 'transparent',
                  borderBottom: listTab === tab ? `2px solid ${color}` : '2px solid transparent',
                }}
              >
                {label} {cnt}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(listTab === 'bidding' ? biddingList : wishlistList).map(t => {
              const tMyBid = t.myBid ?? 0;
              const tOutbid = tMyBid > 0 && t.currentBid > tMyBid;
              const tLeading = tMyBid > 0 && t.currentBid === tMyBid;
              const minBid = t.currentBid + 100;
              const isCurrent = t.id === territory?.id;
              const didQuick = quickBidId === t.id;
              const borderColor = tOutbid ? '#ff4444' : tLeading ? '#00ff88' : isCurrent ? '#00f5ff' : '#1e2a3d';
              return (
                <div
                  key={t.id}
                  onClick={() => navigate(`/app/territory/${t.id}`)}
                  className="rounded-xl p-3 cursor-pointer transition-all hover:brightness-110"
                  style={{
                    background: tLeading ? '#0a1f12' : isCurrent ? '#1a2a3a' : '#12192c',
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  {/* Status badge row */}
                  {tOutbid && (
                    <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-lg" style={{ background: '#ff222215', border: '1px solid #ff444440' }}>
                      <span style={{ fontSize: 9 }}>🔺</span>
                      <span className="text-[#ff5555] font-bold" style={{ fontSize: 9 }}>상회 입찰됨</span>
                      <span className="text-[#4a5a7a] ml-auto" style={{ fontSize: 9 }}>내 입찰 {tMyBid.toLocaleString()}</span>
                    </div>
                  )}
                  {tLeading && (
                    <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-lg" style={{ background: '#00ff8815', border: '1px solid #00ff8840' }}>
                      <span style={{ fontSize: 9 }}>✓</span>
                      <span className="text-[#00ff88] font-bold" style={{ fontSize: 9 }}>최고 입찰 중</span>
                      <div className="ml-auto w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-pulse" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 12 }}>{t.name}</span>
                    <span style={{ fontSize: 10, color: GRADE_COLOR[t.grade] }}>{t.grade}급</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#7788a5]" style={{ fontSize: 10 }}>({t.x}, {t.y})</span>
                    {listTab === 'bidding' ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: tOutbid ? '#ff5555' : tLeading ? '#00ff88' : '#00f5ff' }}>
                        {tOutbid ? `현재가 ${t.currentBid.toLocaleString()} AP` : `내 입찰 ${tMyBid.toLocaleString()} AP`}
                      </span>
                    ) : (
                      <span className="text-[#ffd700] font-bold" style={{ fontSize: 11 }}>
                        {t.currentBid.toLocaleString()} AP
                      </span>
                    )}
                  </div>

                  {/* Quick bid row */}
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#1e2a3d]">
                    <div className="flex items-center gap-1 flex-1">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tOutbid ? 'bg-[#ff5555]' : 'bg-[#00ff88] animate-pulse'}`} />
                      <span className="text-[#4a5a7a]" style={{ fontSize: 9 }}>현재가 {t.currentBid.toLocaleString()}</span>
                    </div>
                    {tLeading ? (
                      <span className="text-[#00ff88] font-bold" style={{ fontSize: 9 }}>✓ 최고가 유지 중</span>
                    ) : didQuick ? (
                      <span className="text-[#00ff88] font-bold" style={{ fontSize: 9 }}>✓ 입찰완료</span>
                    ) : (
                      <button
                        onClick={e => handleQuickBid(e, t.id, minBid)}
                        disabled={ap < minBid}
                        className="h-5 px-2 rounded font-bold transition-all hover:brightness-110 disabled:opacity-40"
                        style={{ fontSize: 9, background: tOutbid ? '#ff4444' : '#00f5ff', color: '#060a14' }}
                      >
                        {tOutbid ? '🔺 재입찰' : '⚡ +100 즉시입찰'}
                      </button>
                    )}
                    {listTab === 'wishlist' && (
                      <button
                        onClick={e => { e.stopPropagation(); toggleWishlist(t.id); }}
                        className="text-[#ff1493] ml-1"
                        style={{ fontSize: 9 }}
                      >
                        ♥해제
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {(listTab === 'bidding' ? biddingList : wishlistList).length === 0 && (
              <div className="text-center py-8">
                <p className="text-[#4a5a7a]" style={{ fontSize: 13 }}>
                  {listTab === 'bidding' ? '입찰 중인 영토가 없습니다' : '관심 등록된 영토가 없습니다'}
                </p>
                <button
                  onClick={() => navigate('/app/map')}
                  className="mt-3 px-4 py-1.5 bg-[#1a2a3a] border border-[#2a3a5a] rounded-lg text-[#7788a5] hover:text-[#c0ccdd] transition-colors"
                  style={{ fontSize: 11 }}
                >
                  지도로 이동 →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel ── Territory Detail */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="text-[#e0e8ff] font-bold" style={{ fontSize: 22 }}>{territory?.name}</h1>
                  <span className="px-2 py-0.5 rounded font-bold" style={{ fontSize: 11, color: gradeColor, background: gradeColor + '20', border: `1px solid ${gradeColor}50` }}>
                    {territory?.grade ?? 'B'}급
                  </span>
                  {isOutbid && (
                    <span className="px-2 py-0.5 rounded-lg font-bold animate-pulse" style={{ fontSize: 11, color: '#ff5555', background: '#ff222215', border: '1px solid #ff444440' }}>
                      🔺 상회 입찰됨
                    </span>
                  )}
                </div>
                <p className="text-[#7788a5]" style={{ fontSize: 13 }}>
                  위치: ({territory?.x}, {territory?.y}) · {gridSize}×{gridSize} 그리드
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => territory && toggleWishlist(territory.id)}
                  className="h-9 px-4 rounded-xl border transition-colors"
                  style={{
                    fontSize: 13,
                    color: territory?.isWishlisted ? '#ff1493' : '#7788a5',
                    borderColor: territory?.isWishlisted ? '#ff1493' : '#354064',
                    background: territory?.isWishlisted ? '#ff149320' : '#2a3050',
                  }}
                >
                  {territory?.isWishlisted ? '♥ 관심 등록됨' : '♡ 관심 등록'}
                </button>
                <button onClick={() => navigate('/app/map')} className="text-[#7788a5] hover:text-[#e0e8ff] text-xl px-2">✕</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
              {/* Left column — mini-map only */}
              <div>
                <div className="bg-[#1a1f35] border border-[#354064] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#7788a5]" style={{ fontSize: 12 }}>영토 미리보기</p>
                    <span className="font-bold" style={{ fontSize: 11, color: gradeColor }}>{gridSize}×{gridSize} ({territory?.grade ?? 'B'}급)</span>
                  </div>
                  <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
                    {Array.from({ length: gridSize * gridSize }, (_, i) => {
                      const x = i % gridSize, y = Math.floor(i / gridSize);
                      const half = gridSize / 2;
                      const isCore = x >= half - 1 && x < half + 1 && y >= half - 1 && y < half + 1;
                      const q = gridSize / 4;
                      const isInner = x >= q && x < gridSize - q && y >= q && y < gridSize - q && !isCore;
                      const bg = isCore ? gradeColor + '35' : isInner ? '#8b50ff20' : '#00f5ff10';
                      const border = isCore ? gradeColor + '70' : isInner ? '#8b50ff40' : '#00f5ff20';
                      return <div key={i} className="aspect-square rounded-sm" style={{ background: bg, border: `1px solid ${border}` }} />;
                    })}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4 min-h-0">
                {/* Price chart */}
                <div className="bg-[#1a1f35] border border-[#354064] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#7788a5]" style={{ fontSize: 12 }}>가격 추이</p>
                    <div className="flex gap-1">
                      {(['7일', '30일', '90일'] as ChartRange[]).map(r => (
                        <button
                          key={r}
                          onClick={() => setChartRange(r)}
                          className="px-2 h-6 rounded-md font-semibold transition-colors"
                          style={{
                            fontSize: 10,
                            color: chartRange === r ? '#060a14' : '#7788a5',
                            background: chartRange === r ? gradeColor : '#2a3050',
                            border: `1px solid ${chartRange === r ? gradeColor : '#354064'}`,
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Min/Max labels */}
                  <div className="flex justify-between mb-1">
                    <span className="text-[#4a5a7a]" style={{ fontSize: 9 }}>{Math.min(...chartData).toLocaleString()}</span>
                    <span style={{ fontSize: 9, color: gradeColor }}>{Math.max(...chartData).toLocaleString()} AP</span>
                  </div>

                  <LineChart data={chartData} color={gradeColor} />

                  {/* X-axis labels */}
                  <div className="flex justify-between mt-1">
                    {chartData.map((_, i) =>
                      i % labelStep === 0 || i === chartData.length - 1 ? (
                        <span key={i} className="text-[#4a5a7a]" style={{ fontSize: 8 }}>
                          {i === chartData.length - 1 ? '현재' : chartLabels[i]}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>

                {/* ── Bid panel + Bid history side by side ── */}
                <div className="flex gap-3">
                  {/* Bid panel */}
                  <div
                    className="flex-1 rounded-xl p-3"
                    style={{
                      background: isOutbid ? '#1a0a0a' : '#0d1628',
                      border: `2px solid ${isOutbid ? '#ff4444' : gradeColor + '80'}`,
                    }}
                  >
                    {/* Outbid alert */}
                    {isOutbid && (
                      <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg" style={{ background: '#ff222220', border: '1px solid #ff444450' }}>
                        <span style={{ fontSize: 12 }}>🔺</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#ff5555] font-bold" style={{ fontSize: 11 }}>상회 입찰됨!</p>
                          <p className="text-[#7788a5] truncate" style={{ fontSize: 9 }}>
                            {myBid.toLocaleString()} → {currentBid.toLocaleString()} AP
                          </p>
                        </div>
                        <button
                          onClick={handleRebid}
                          className="px-2 h-6 rounded font-bold flex-shrink-0"
                          style={{ fontSize: 9, background: '#ff4444', color: '#fff' }}
                        >
                          재입찰
                        </button>
                      </div>
                    )}

                    <p className="font-semibold mb-2" style={{ fontSize: 11, color: isOutbid ? '#ff5555' : gradeColor }}>
                      {isOutbid ? '🔺 재입찰하기' : '⚡ 입찰하기'}
                    </p>

                    {/* Current price */}
                    <div className="flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg" style={{ background: (isOutbid ? '#ff4444' : gradeColor) + '12', border: `1px solid ${isOutbid ? '#ff4444' : gradeColor}30` }}>
                      <span className="text-[#7788a5]" style={{ fontSize: 10 }}>현재가</span>
                      <span className="font-bold" style={{ fontSize: 14, color: isOutbid ? '#ff5555' : gradeColor }}>{currentBid.toLocaleString()} AP</span>
                    </div>

                    {/* Bid input */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <input
                        type="number"
                        value={bidAmount}
                        onChange={e => setBidAmount(Number(e.target.value))}
                        className="flex-1 h-8 bg-[#1a2438] border border-[#354064] rounded-lg px-2 text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors font-bold"
                        style={{ fontSize: 13 }}
                      />
                      <span className="text-[#7788a5]" style={{ fontSize: 10 }}>AP</span>
                    </div>

                    {/* Chips */}
                    <div className="flex gap-1 mb-2">
                      {[500, 1000, 5000].map(add => (
                        <button
                          key={add}
                          onClick={() => setBidAmount(v => v + add)}
                          className="flex-1 h-6 rounded text-[#c0ccdd] hover:text-white transition-colors"
                          style={{ fontSize: 10, background: '#1e2a3d', border: '1px solid #354064' }}
                        >
                          +{add >= 1000 ? `${add / 1000}K` : add}
                        </button>
                      ))}
                      <button
                        onClick={() => setBidAmount(currentBid + 100)}
                        className="px-1.5 h-6 rounded text-[#4a5a7a] hover:text-[#c0ccdd] transition-colors"
                        style={{ fontSize: 9, background: '#1a2030', border: '1px solid #2a3050' }}
                      >
                        초기화
                      </button>
                    </div>

                    {/* Bid button */}
                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={bidAmount <= currentBid || ap < bidAmount}
                      className="w-full h-9 rounded-xl font-bold transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        fontSize: 12,
                        background: bidAmount > currentBid && ap >= bidAmount ? (isOutbid ? '#ff4444' : '#00f5ff') : '#2a3050',
                        color: bidAmount > currentBid && ap >= bidAmount ? (isOutbid ? '#fff' : '#060a14') : '#4a5a7a',
                        border: `1px solid ${bidAmount > currentBid && ap >= bidAmount ? (isOutbid ? '#ff4444' : '#00f5ff') : '#354064'}`,
                      }}
                    >
                      {isOutbid ? '🔺 재입찰' : '⚡ 입찰'}
                    </button>
                    <p className="text-center mt-1" style={{ fontSize: 9, color: bidAmount > currentBid && ap >= bidAmount ? '#00ff88' : '#ff5555' }}>
                      {bidAmount <= currentBid ? `최소 ${(currentBid + 1).toLocaleString()}` : ap < bidAmount ? 'AP 부족' : `잔여 ${(ap - bidAmount).toLocaleString()}`}
                    </p>
                  </div>

                  {/* Bid history */}
                  <div className="flex-1 bg-[#1a1f35] border border-[#354064] rounded-xl overflow-hidden flex flex-col">
                    <div className="bg-[#2a3050] px-3 py-2 border-b border-[#354064]">
                      <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 12 }}>입찰 이력</span>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-[#1e2a3d]">
                      {(territory?.bidHistory ?? []).slice(0, 8).map((bid, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {i === 0 && <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-full flex-shrink-0" />}
                            <span className="text-[#e0e8ff]" style={{ fontSize: 11 }}>{bid.user}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[#ffd700] font-semibold" style={{ fontSize: 11 }}>{bid.amount.toLocaleString()} AP</span>
                            <span className="text-[#4a5a7a]" style={{ fontSize: 9 }}>{bid.time}</span>
                          </div>
                        </div>
                      ))}
                      {(territory?.bidHistory ?? []).length === 0 && (
                        <p className="text-center text-[#4a5a7a] py-6" style={{ fontSize: 11 }}>입찰 내역 없음</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="bg-[#1a1f35] border border-[#354064] rounded-xl p-4">
                  <p className="text-[#7788a5] font-semibold mb-3" style={{ fontSize: 12 }}>영토 스탯</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      { label: 'GP 생산', val: `+${territory?.gpPerMin ?? 0}/분`, color: '#00ff88' },
                      { label: '방어력', val: (territory?.defense ?? 0).toLocaleString(), color: '#ff3333' },
                      { label: '현재 소유자', val: territory?.owner ?? '없음', color: '#7788a5' },
                      { label: '상태', val: territory?.status === 'auction' ? '⚡ 경매 중' : territory?.status === 'mine' ? '✓ 내 영토' : territory?.status === 'occupied' ? '점령됨' : '미점령', color: territory?.status === 'auction' ? '#ffd700' : territory?.status === 'mine' ? '#00ff88' : '#7788a5' },
                    ].map(s => (
                      <div key={s.label} className="flex flex-col gap-0.5">
                        <span className="text-[#4a5a7a]" style={{ fontSize: 10 }}>{s.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Continent Chat ── */}
                <div className="bg-[#0d1220] border border-[#1e2a3d] rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-[#12192c] border-b border-[#1e2a3d] flex-shrink-0">
                    <span style={{ fontSize: 14 }}>💬</span>
                    <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>{continentName} 채팅</span>
                    <div className="flex items-center gap-1 ml-2">
                      <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-pulse" />
                      <span className="text-[#4a5a7a]" style={{ fontSize: 10 }}>실시간</span>
                    </div>
                    <span className="ml-auto text-[#4a5a7a]" style={{ fontSize: 10 }}>{chatMessages.length}개 메시지</span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex items-start gap-2 ${msg.mine ? 'flex-row-reverse' : ''}`}>
                        {!msg.mine && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold" style={{ fontSize: 10, background: '#2a3050', color: '#00f5ff' }}>
                            {msg.user[0]}
                          </div>
                        )}
                        <div className={`max-w-[70%] ${msg.mine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                          {!msg.mine && (
                            <span className="text-[#7788a5]" style={{ fontSize: 10 }}>{msg.user}</span>
                          )}
                          <div
                            className="px-3 py-1.5 rounded-xl"
                            style={{
                              fontSize: 12,
                              color: '#e0e8ff',
                              background: msg.mine ? '#00f5ff20' : '#1a2438',
                              border: `1px solid ${msg.mine ? '#00f5ff40' : '#2a3050'}`,
                              borderBottomRightRadius: msg.mine ? 4 : undefined,
                              borderBottomLeftRadius: !msg.mine ? 4 : undefined,
                            }}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[#4a5a7a]" style={{ fontSize: 9 }}>{msg.time}</span>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1e2a3d] flex-shrink-0">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendChat()}
                      placeholder={`${continentName} 채팅 입력...`}
                      className="flex-1 h-8 bg-[#1a2438] border border-[#354064] rounded-lg px-3 text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors"
                      style={{ fontSize: 12 }}
                    />
                    <button
                      onClick={sendChat}
                      disabled={!chatInput.trim()}
                      className="h-8 px-3 rounded-lg font-semibold transition-all hover:brightness-110 disabled:opacity-40"
                      style={{ fontSize: 12, background: '#00f5ff', color: '#060a14' }}
                    >
                      전송
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}

      {showConfirm && territory && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
          <div className="bg-[#1a1f35] border-2 rounded-2xl p-8 max-w-sm mx-4 text-center" style={{ borderColor: isOutbid ? '#ff4444' : gradeColor }}>
            <span style={{ fontSize: 40 }}>{isOutbid ? '🔺' : '⚡'}</span>
            <h3 className="font-bold text-xl mt-3 mb-2" style={{ color: isOutbid ? '#ff5555' : gradeColor }}>
              {isOutbid ? '재입찰 확인' : '입찰 확인'}
            </h3>
            <p className="text-[#7788a5] mb-5" style={{ fontSize: 13 }}>{territory.name}</p>
            <div className="bg-[#2a3050] rounded-xl py-4 mb-6 space-y-2">
              <div className="flex justify-between px-4">
                <span className="text-[#7788a5]" style={{ fontSize: 13 }}>입찰 금액</span>
                <span className="font-bold" style={{ fontSize: 16, color: isOutbid ? '#ff5555' : gradeColor }}>{bidAmount.toLocaleString()} AP</span>
              </div>
              <div className="flex justify-between px-4">
                <span className="text-[#7788a5]" style={{ fontSize: 13 }}>현재가 대비</span>
                <span className="text-[#00ff88]" style={{ fontSize: 13 }}>+{(bidAmount - currentBid).toLocaleString()} AP</span>
              </div>
              <div className="flex justify-between px-4">
                <span className="text-[#7788a5]" style={{ fontSize: 13 }}>입찰 후 잔여</span>
                <span className="text-[#e0e8ff]" style={{ fontSize: 13 }}>{(ap - bidAmount).toLocaleString()} AP</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 h-11 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]"
                style={{ fontSize: 14 }}>취소</button>
              <button onClick={handleBid}
                className="flex-1 h-11 rounded-xl font-bold"
                style={{ fontSize: 14, background: isOutbid ? '#ff4444' : gradeColor, color: isOutbid ? '#fff' : '#0a0e1a' }}>
                {isOutbid ? '재입찰하기' : '입찰하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
