import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';

import { useApp } from '../context/AppContext';
import { placeBidApi } from '../api/auction';
import { fetchMyWallet } from '../api/user';
import { useTerritoryDetail } from '../hooks/useTerritoryDetail';
import { useMyBids } from '../hooks/useMyBids';
import { GNB } from '../components/GNB';
import type { MyBidEntry } from '../types/auction';

type ListTab = 'bidding' | 'wishlist';
type ChartRange = '7일' | '30일' | '90일';

const GRADE_COLOR: Record<string, string> = { S: '#ffd700', A: '#00f5ff', B: '#00ff88', C: '#8892b0' };

function LineChart({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return <div className="flex items-center justify-center h-[120px] text-[#4a5a7a]" style={{ fontSize: 12 }}>데이터 없음</div>;
  const W = 300, H = 120, PAD = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2),
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
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="5" fill={color} fillOpacity="0.25" />
    </svg>
  );
}

const RANGE_MS: Record<ChartRange, number> = {
  '7일': 7 * 86400_000,
  '30일': 30 * 86400_000,
  '90일': 90 * 86400_000,
};

const INIT_CHAT = [
  { user: 'CyberWolf', text: '이 지역 S급 영토 노리는 사람 있어요?', time: '14:22', mine: false },
  { user: 'NeonKing', text: '저도 입찰 중인데 경쟁 치열하네요', time: '14:23', mine: false },
  { user: 'StarHunter', text: '현재 가격 많이 올라갔던데', time: '14:25', mine: false },
];

export function TerritoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ap, syncAP, userId, username } = useApp();

  const territoryId = Number(id);
  const { territory, bids, isLoading, error, refreshBids } = useTerritoryDetail(territoryId);
  const { bids: myBids } = useMyBids();

  const gradeColor = GRADE_COLOR[territory?.grade ?? 'B'] ?? '#00ff88';
  const gridSize = territory?.gridSize ?? 8;
  const currentBid = territory?.auction?.currentPrice ?? 0;
  const auctionId = territory?.auction?.auctionId ?? null;

  const myBidEntry: MyBidEntry | undefined = myBids.find(b => b.territoryId === territoryId);
  const myBid = myBidEntry?.myBidAmount ?? 0;
  const isOutbid = myBid > 0 && !myBidEntry?.isHighestBidder;
  const isMyTerritory = territory?.owner?.userId === userId;

  const [listTab, setListTab] = useState<ListTab>('bidding');
  const [bidAmount, setBidAmount] = useState(currentBid + 100);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidDone, setBidDone] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>('7일');
  const [chatMessages, setChatMessages] = useState(INIT_CHAT);
  const [chatInput, setChatInput] = useState('');
  const [localWishlist, setLocalWishlist] = useState<Set<number>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setBidAmount(currentBid + 100); }, [currentBid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const chartData = useMemo(() => {
    const cutoff = Date.now() - RANGE_MS[chartRange];
    const filtered = bids.filter(b => new Date(b.bidAt).getTime() >= cutoff);
    return filtered.map(b => b.price);
  }, [bids, chartRange]);

  const handleBid = async () => {
    if (!auctionId) return;
    setIsBidding(true);
    setBidError(null);
    try {
      await placeBidApi(auctionId, bidAmount);
      const wallet = await fetchMyWallet();
      syncAP(wallet.availableAP);
      await refreshBids(auctionId);
      setBidDone(true);
      setShowConfirm(false);
      setTimeout(() => setBidDone(false), 2500);
    } catch {
      setBidError('입찰에 실패했습니다. AP를 확인하거나 다시 시도해주세요.');
      setShowConfirm(false);
    } finally {
      setIsBidding(false);
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

  const activeBids = myBids.filter(b => b.status === 'BIDDING');
  const wishlistBids = myBids.filter(b => localWishlist.has(b.territoryId));

  const statusLabel = () => {
    if (!territory) return '미점령';
    if (isMyTerritory) return '✓ 내 영토';
    if (territory.status === 'BIDDING') return '⚡ 경매 중';
    if (territory.status === 'OCCUPIED') return '점령됨';
    return '미점령';
  };

  const statusColor = () => {
    if (isMyTerritory) return '#00ff88';
    if (territory?.status === 'BIDDING') return '#ffd700';
    return '#7788a5';
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel ── Bidding list / Wishlist */}
        <div className="w-[270px] bg-[#0d1220] border-r border-[#1e2a3d] flex flex-col flex-shrink-0">
          <div className="flex border-b border-[#1e2a3d]">
            {([['bidding', '입찰 중', '#00f5ff', activeBids.length], ['wishlist', '관심 등록', '#ffd700', wishlistBids.length]] as const).map(([tab, label, color, cnt]) => (
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
            {(listTab === 'bidding' ? activeBids : wishlistBids).map(b => {
              const isLeading = b.isHighestBidder;
              const isLosing = !b.isHighestBidder;
              const isCurrent = b.territoryId === territoryId;
              const borderColor = isLosing ? '#ff4444' : isLeading ? '#00ff88' : isCurrent ? '#00f5ff' : '#1e2a3d';
              return (
                <div
                  key={b.auctionId}
                  onClick={() => navigate(`/app/territory/${b.territoryId}`)}
                  className="rounded-xl p-3 cursor-pointer transition-all hover:brightness-110"
                  style={{
                    background: isLeading ? '#0a1f12' : isCurrent ? '#1a2a3a' : '#12192c',
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  {isLosing && (
                    <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-lg" style={{ background: '#ff222215', border: '1px solid #ff444440' }}>
                      <span style={{ fontSize: 9 }}>🔺</span>
                      <span className="text-[#ff5555] font-bold" style={{ fontSize: 9 }}>상회 입찰됨</span>
                      <span className="text-[#4a5a7a] ml-auto" style={{ fontSize: 9 }}>내 입찰 {b.myBidAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {isLeading && (
                    <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-lg" style={{ background: '#00ff8815', border: '1px solid #00ff8840' }}>
                      <span style={{ fontSize: 9 }}>✓</span>
                      <span className="text-[#00ff88] font-bold" style={{ fontSize: 9 }}>최고 입찰 중</span>
                      <div className="ml-auto w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-pulse" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 12 }}>
                      ({b.coordX}, {b.coordY})
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#7788a5]" style={{ fontSize: 10 }}>현재가</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isLosing ? '#ff5555' : isLeading ? '#00ff88' : '#00f5ff' }}>
                      {b.currentPrice.toLocaleString()} AP
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#1e2a3d]">
                    <div className="flex items-center gap-1 flex-1">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLosing ? 'bg-[#ff5555]' : 'bg-[#00ff88] animate-pulse'}`} />
                      <span className="text-[#4a5a7a]" style={{ fontSize: 9 }}>내 입찰 {b.myBidAmount.toLocaleString()}</span>
                    </div>
                    {isLeading ? (
                      <span className="text-[#00ff88] font-bold" style={{ fontSize: 9 }}>✓ 최고가 유지 중</span>
                    ) : (
                      <span className="text-[#ff5555] font-bold" style={{ fontSize: 9 }}>재입찰 필요</span>
                    )}
                  </div>
                </div>
              );
            })}
            {(listTab === 'bidding' ? activeBids : wishlistBids).length === 0 && (
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

            {isLoading && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[#00f5ff]" style={{ fontSize: 14 }}>영토 정보 불러오는 중...</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[#ff3333]" style={{ fontSize: 14 }}>{error}</p>
              </div>
            )}

            {!isLoading && !error && territory && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h1 className="text-[#e0e8ff] font-bold" style={{ fontSize: 22 }}>
                        영토 ({territory.coordX}, {territory.coordY})
                      </h1>
                      <span className="px-2 py-0.5 rounded font-bold" style={{ fontSize: 11, color: gradeColor, background: gradeColor + '20', border: `1px solid ${gradeColor}50` }}>
                        {territory.grade}급
                      </span>
                      {isOutbid && (
                        <span className="px-2 py-0.5 rounded-lg font-bold animate-pulse" style={{ fontSize: 11, color: '#ff5555', background: '#ff222215', border: '1px solid #ff444440' }}>
                          🔺 상회 입찰됨
                        </span>
                      )}
                      {bidDone && (
                        <span className="px-2 py-0.5 rounded-lg font-bold" style={{ fontSize: 11, color: '#00ff88', background: '#00ff8815', border: '1px solid #00ff8840' }}>
                          ✓ 입찰 완료
                        </span>
                      )}
                    </div>
                    <p className="text-[#7788a5]" style={{ fontSize: 13 }}>
                      {territory.continentName} · {gridSize}×{gridSize} 그리드
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLocalWishlist(prev => {
                        const next = new Set(prev);
                        if (next.has(territory.territoryId)) next.delete(territory.territoryId); else next.add(territory.territoryId);
                        return next;
                      })}
                      className="h-9 px-4 rounded-xl border transition-colors"
                      style={{
                        fontSize: 13,
                        color: localWishlist.has(territory.territoryId) ? '#ff1493' : '#7788a5',
                        borderColor: localWishlist.has(territory.territoryId) ? '#ff1493' : '#354064',
                        background: localWishlist.has(territory.territoryId) ? '#ff149320' : '#2a3050',
                      }}
                    >
                      {localWishlist.has(territory.territoryId) ? '♥ 관심 등록됨' : '♡ 관심 등록'}
                    </button>
                    <button onClick={() => navigate('/app/map')} className="text-[#7788a5] hover:text-[#e0e8ff] text-xl px-2">✕</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                  {/* Left column — mini-map */}
                  <div>
                    <div className="bg-[#1a1f35] border border-[#354064] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#7788a5]" style={{ fontSize: 12 }}>영토 미리보기</p>
                        <span className="font-bold" style={{ fontSize: 11, color: gradeColor }}>{gridSize}×{gridSize} ({territory.grade}급)</span>
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

                      {chartData.length > 0 && (
                        <div className="flex justify-between mb-1">
                          <span className="text-[#4a5a7a]" style={{ fontSize: 9 }}>{Math.min(...chartData).toLocaleString()}</span>
                          <span style={{ fontSize: 9, color: gradeColor }}>{Math.max(...chartData).toLocaleString()} AP</span>
                        </div>
                      )}

                      <LineChart data={chartData} color={gradeColor} />
                    </div>

                    {/* Bid panel + Bid history */}
                    <div className="flex gap-3">
                      {/* Bid panel */}
                      <div
                        className="flex-1 rounded-xl p-3"
                        style={{
                          background: isOutbid ? '#1a0a0a' : '#0d1628',
                          border: `2px solid ${isOutbid ? '#ff4444' : gradeColor + '80'}`,
                        }}
                      >
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
                              onClick={() => setBidAmount(currentBid + 100)}
                              className="px-2 h-6 rounded font-bold flex-shrink-0"
                              style={{ fontSize: 9, background: '#ff4444', color: '#fff' }}
                            >
                              재입찰
                            </button>
                          </div>
                        )}

                        <p className="font-semibold mb-2" style={{ fontSize: 11, color: isOutbid ? '#ff5555' : gradeColor }}>
                          {!auctionId ? '경매 없음' : isOutbid ? '🔺 재입찰하기' : '⚡ 입찰하기'}
                        </p>

                        <div className="flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg" style={{ background: (isOutbid ? '#ff4444' : gradeColor) + '12', border: `1px solid ${isOutbid ? '#ff4444' : gradeColor}30` }}>
                          <span className="text-[#7788a5]" style={{ fontSize: 10 }}>현재가</span>
                          <span className="font-bold" style={{ fontSize: 14, color: isOutbid ? '#ff5555' : gradeColor }}>{currentBid.toLocaleString()} AP</span>
                        </div>

                        <div className="flex items-center gap-1.5 mb-1.5">
                          <input
                            type="number"
                            value={bidAmount}
                            onChange={e => setBidAmount(Number(e.target.value))}
                            disabled={!auctionId}
                            className="flex-1 h-8 bg-[#1a2438] border border-[#354064] rounded-lg px-2 text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors font-bold disabled:opacity-40"
                            style={{ fontSize: 13 }}
                          />
                          <span className="text-[#7788a5]" style={{ fontSize: 10 }}>AP</span>
                        </div>

                        <div className="flex gap-1 mb-2">
                          {[500, 1000, 5000].map(add => (
                            <button
                              key={add}
                              onClick={() => setBidAmount(v => v + add)}
                              disabled={!auctionId}
                              className="flex-1 h-6 rounded text-[#c0ccdd] hover:text-white transition-colors disabled:opacity-40"
                              style={{ fontSize: 10, background: '#1e2a3d', border: '1px solid #354064' }}
                            >
                              +{add >= 1000 ? `${add / 1000}K` : add}
                            </button>
                          ))}
                          <button
                            onClick={() => setBidAmount(currentBid + 100)}
                            disabled={!auctionId}
                            className="px-1.5 h-6 rounded text-[#4a5a7a] hover:text-[#c0ccdd] transition-colors disabled:opacity-40"
                            style={{ fontSize: 9, background: '#1a2030', border: '1px solid #2a3050' }}
                          >
                            초기화
                          </button>
                        </div>

                        {bidError && (
                          <p className="text-[#ff5555] mb-1.5" style={{ fontSize: 10 }}>⚠ {bidError}</p>
                        )}

                        <button
                          onClick={() => setShowConfirm(true)}
                          disabled={!auctionId || bidAmount <= currentBid || ap < bidAmount || isBidding}
                          className="w-full h-9 rounded-xl font-bold transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            fontSize: 12,
                            background: auctionId && bidAmount > currentBid && ap >= bidAmount ? (isOutbid ? '#ff4444' : '#00f5ff') : '#2a3050',
                            color: auctionId && bidAmount > currentBid && ap >= bidAmount ? (isOutbid ? '#fff' : '#060a14') : '#4a5a7a',
                            border: `1px solid ${auctionId && bidAmount > currentBid && ap >= bidAmount ? (isOutbid ? '#ff4444' : '#00f5ff') : '#354064'}`,
                          }}
                        >
                          {isBidding ? '처리 중...' : isOutbid ? '🔺 재입찰' : '⚡ 입찰'}
                        </button>
                        <p className="text-center mt-1" style={{ fontSize: 9, color: !auctionId ? '#7788a5' : bidAmount <= currentBid ? '#ff5555' : ap < bidAmount ? '#ff5555' : '#00ff88' }}>
                          {!auctionId ? '현재 경매 없음' : bidAmount <= currentBid ? `최소 ${(currentBid + 1).toLocaleString()}` : ap < bidAmount ? 'AP 부족' : `잔여 ${(ap - bidAmount).toLocaleString()}`}
                        </p>
                      </div>

                      {/* Bid history */}
                      <div className="flex-1 bg-[#1a1f35] border border-[#354064] rounded-xl overflow-hidden flex flex-col">
                        <div className="bg-[#2a3050] px-3 py-2 border-b border-[#354064]">
                          <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 12 }}>입찰 이력</span>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-[#1e2a3d]">
                          {bids.slice().reverse().slice(0, 8).map((bid, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                {i === 0 && <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-full flex-shrink-0" />}
                                <span className="text-[#e0e8ff]" style={{ fontSize: 11 }}>{bid.bidderNickname ?? '시작가'}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[#ffd700] font-semibold" style={{ fontSize: 11 }}>{bid.price.toLocaleString()} AP</span>
                                <span className="text-[#4a5a7a]" style={{ fontSize: 9 }}>
                                  {new Date(bid.bidAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))}
                          {bids.length === 0 && (
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
                          { label: 'GP 생산', val: `+${territory.baseProductionRate}/분`, color: '#00ff88' },
                          { label: '무적 여부', val: territory.isInvincible ? '무적 상태' : '일반', color: territory.isInvincible ? '#ffd700' : '#7788a5' },
                          { label: '현재 소유자', val: territory.owner?.nickname ?? '없음', color: '#7788a5' },
                          { label: '상태', val: statusLabel(), color: statusColor() },
                        ].map(s => (
                          <div key={s.label} className="flex flex-col gap-0.5">
                            <span className="text-[#4a5a7a]" style={{ fontSize: 10 }}>{s.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Chat */}
                    <div className="bg-[#0d1220] border border-[#1e2a3d] rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#12192c] border-b border-[#1e2a3d] flex-shrink-0">
                        <span style={{ fontSize: 14 }}>💬</span>
                        <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>{territory.continentName} 채팅</span>
                        <div className="flex items-center gap-1 ml-2">
                          <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-pulse" />
                          <span className="text-[#4a5a7a]" style={{ fontSize: 10 }}>실시간</span>
                        </div>
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
                          placeholder={`${territory.continentName} 채팅 입력...`}
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
              </>
            )}
          </div>
        </div>
      </div>

      {showConfirm && territory && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
          <div className="bg-[#1a1f35] border-2 rounded-2xl p-8 max-w-sm mx-4 text-center" style={{ borderColor: isOutbid ? '#ff4444' : gradeColor }}>
            <span style={{ fontSize: 40 }}>{isOutbid ? '🔺' : '⚡'}</span>
            <h3 className="font-bold text-xl mt-3 mb-2" style={{ color: isOutbid ? '#ff5555' : gradeColor }}>
              {isOutbid ? '재입찰 확인' : '입찰 확인'}
            </h3>
            <p className="text-[#7788a5] mb-5" style={{ fontSize: 13 }}>
              영토 ({territory.coordX}, {territory.coordY}) · {territory.continentName}
            </p>
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
              <button
                onClick={() => void handleBid()}
                disabled={isBidding}
                className="flex-1 h-11 rounded-xl font-bold disabled:opacity-50"
                style={{ fontSize: 14, background: isOutbid ? '#ff4444' : gradeColor, color: isOutbid ? '#fff' : '#0a0e1a' }}>
                {isBidding ? '처리 중...' : isOutbid ? '재입찰하기' : '입찰하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
