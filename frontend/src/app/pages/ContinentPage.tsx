import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useGridMap } from '../hooks/useGridMap';
import { useContinent } from '../hooks/useContinent';
import { GNB } from '../components/GNB';
import { ChatPanel } from '../components/ChatPanel';
import { useApp } from '../context/AppContext';
import { fetchTerritoryDetail } from '../api/map';
import { placeBidApi, fetchAuctionBids } from '../api/auction';
import type { GridTerritoryDto } from '../types/map';
import type { Grade } from '../types/grade';
import type { BidEntry } from '../types/auction';
import { GRADE_COLOR } from '../types/grade';

type TStatus = 'mine' | 'occupied' | 'auction' | 'idle';

interface DisplayTerritory {
  x: number; y: number; coordX: number; coordY: number;
  status: TStatus; owner: string | null; color: string;
  grade: Grade; currentBid: number; gpPerMin: number; defense: number;
  timeLeft?: number; id: number;
}

const CELL = 30;

const GRADE_EMOJI: Record<Grade, string> = { S: '👑', A: '💎', B: '🔷', C: '🔹' };
const GRADE_CELL: Record<Grade, number> = { S: 29, A: 24, B: 18, C: 12 };
const GRADE_FONT: Record<Grade, number> = { S: 13, A: 11, B: 9, C: 7 };

const OWNER_PALETTE = ['#f06070', '#00f5ff', '#8b50ff', '#ffd700', '#ff8c00', '#00ff88', '#ff1493', '#ff6644'];

function ownerColor(ownerId: number | null, fallback: string | null): string {
  if (fallback) return fallback;
  if (ownerId == null) return '#1a2a3a';
  return OWNER_PALETTE[ownerId % OWNER_PALETTE.length];
}

function mapStatus(dto: GridTerritoryDto, userId: number | null): TStatus {
  if (dto.status === 'BIDDING') return 'auction';
  if (dto.status === 'OCCUPIED') return userId != null && dto.ownerId === userId ? 'mine' : 'occupied';
  return 'idle';
}

function buildDisplayGrid(
  territories: GridTerritoryDto[],
  minX: number, minY: number,
  cols: number, rows: number,
  userId: number | null,
): DisplayTerritory[][] {
  const grid: (DisplayTerritory | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );
  for (const t of territories) {
    const gx = t.coordX - minX;
    const gy = t.coordY - minY;
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
      const status = mapStatus(t, userId);
      const grade = (t.grade as Grade) || 'C';
      grid[gy][gx] = {
        x: gx, y: gy, coordX: t.coordX, coordY: t.coordY,
        status, owner: t.ownerNickname,
        color: status === 'idle' ? '#1a2a3a' : ownerColor(t.ownerId, t.color),
        grade,
        currentBid: 0, gpPerMin: 0, defense: 0,
        id: t.id,
      };
    }
  }
  return grid.map((row, y) =>
    row.map((cell, x) => cell ?? {
      x, y, coordX: x + minX, coordY: y + minY,
      status: 'idle' as TStatus, owner: null, color: '#1a2a3a', grade: 'C' as Grade,
      currentBid: 0, gpPerMin: 0, defense: 0, id: 0,
    })
  );
}

function fmtBidTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60000) return '방금';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  return `${Math.floor(diff / 3600000)}시간 전`;
}

export function ContinentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { continents } = useContinent();
  const { ap, userId, username, spendAP } = useApp();

  const continentId = Number(id);
  const continentData = continents.find(c => c.id === id);
  const continent = continentData ?? {
    color: '#8892b0', name: '로딩 중...', desc: '', grade: 'C', trophyReq: null,
  };

  const { territories, cols, rows, minX, minY, isLoading, error } = useGridMap(continentId || undefined);

  const grid = useMemo(
    () => (cols > 0 && rows > 0 ? buildDisplayGrid(territories, minX, minY, cols, rows, userId) : []),
    [territories, minX, minY, cols, rows, userId],
  );

  const [panelTab, setPanelTab] = useState<'info' | 'chat'>('info');
  const [filter, setFilter] = useState<'all' | TStatus>('all');
  const [selected, setSelected] = useState<DisplayTerritory | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [bidInput, setBidInput] = useState('');
  const [bidSuccess, setBidSuccess] = useState(false);
  const [selectedAuctionId, setSelectedAuctionId] = useState<number | null>(null);
  const [auctionCurrentPrice, setAuctionCurrentPrice] = useState(0);
  const [auctionEndAt, setAuctionEndAt] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const isHighestBidder = bidHistory.length > 0 && bidHistory[0].bidderNickname === username;
  const [isBidding, setIsBidding] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const GRID_W = cols * (CELL + 1) - 1 + 48;
  const GRID_H = rows * (CELL + 1) - 1 + 48;

  const getFitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { z: 1, x: 0, y: 0 };
    const { width, height } = el.getBoundingClientRect();
    const z = Math.min(width / GRID_W, height / GRID_H) * 0.94;
    return { z, x: (width - GRID_W * z) / 2, y: (height - GRID_H * z) / 2 };
  }, [GRID_W, GRID_H]);

  useEffect(() => {
    if (cols > 0) {
      const raf = requestAnimationFrame(() => {
        const { z, x, y } = getFitView();
        setZoom(z); setPan({ x, y });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [getFitView, cols]);

  useEffect(() => {
    setSelected(null); setBidInput(''); setBidSuccess(false);
    setSelectedAuctionId(null); setAuctionCurrentPrice(0);
    setAuctionEndAt(null); setTimeLeft(''); setBidHistory([]);
  }, [id]);

  useEffect(() => {
    if (!auctionEndAt) { setTimeLeft(''); return; }
    const tick = () => {
      const diff = new Date(auctionEndAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('종료됨'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [auctionEndAt]);

  useEffect(() => {
    if (!selectedAuctionId) { setBidHistory([]); return; }
    fetchAuctionBids(selectedAuctionId).then(res => setBidHistory(res.bids)).catch(() => {});
  }, [selectedAuctionId]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom(z => {
      const next = Math.max(0.35, Math.min(4, z * factor));
      const scale = next / z;
      setPan(p => ({ x: mouseX - (mouseX - p.x) * scale, y: mouseY - (mouseY - p.y) * scale }));
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-cell]')) return;
    setIsDragging(true);
    setDragStart({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: dragStart.px + (e.clientX - dragStart.mx), y: dragStart.py + (e.clientY - dragStart.my) });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleBidSubmit = async () => {
    const amt = parseInt(bidInput);
    if (!amt || !selectedAuctionId || isBidding) return;
    setIsBidding(true);
    try {
      const result = await placeBidApi(selectedAuctionId, amt);
      spendAP(amt);
      setBidSuccess(true);
      setTimeout(() => setBidSuccess(false), 2500);
      setAuctionCurrentPrice(result.newPrice);
      setAuctionEndAt(result.endAt);
      setBidInput(String(result.newPrice + 100));
      fetchAuctionBids(selectedAuctionId).then(res => setBidHistory(res.bids)).catch(() => {});
    } catch {
      // keep current state on bid error
    } finally {
      setIsBidding(false);
    }
  };

  const handleDeselect = () => {
    setSelected(null); setBidInput(''); setBidSuccess(false);
    setAuctionCurrentPrice(0); setAuctionEndAt(null); setTimeLeft(''); setBidHistory([]);
  };

  const allTerritories = grid.flat();
  const myCount = allTerritories.filter(t => t.status === 'mine').length;
  const auctionCount = allTerritories.filter(t => t.status === 'auction').length;
  const occupiedCount = allTerritories.filter(t => t.status === 'occupied').length;

  const visible = (t: DisplayTerritory) => filter === 'all' || t.status === filter;

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <GNB />

      <div className="flex items-center gap-4 px-5 py-3 border-b flex-shrink-0" style={{ background: '#080e1c', borderColor: continent.color + '40' }}>
        <button onClick={() => navigate('/app/map')} className="text-muted hover:text-[#c0ccdd] transition-colors flex-shrink-0 text-lg">←</button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: continent.color + '25', border: `1.5px solid ${continent.color}60` }}>
          <div className="w-4 h-4 rounded-full" style={{ background: continent.color }} />
        </div>
        <div>
          <h1 className="font-bold text-lg" style={{ color: continent.color }}>{continent.name}</h1>
          <p className="text-muted text-[11px]">{continent.desc} · {cols}×{rows} 픽셀 그리드</p>
        </div>
        <div className="flex items-center gap-3 ml-6">
          {[{ label: '전체', val: cols * rows, color: '#c0ccdd' }, { label: '경매중', val: auctionCount, color: '#ffd700' }, { label: '내 영토', val: myCount, color: '#00ff88' }, { label: '타 점령', val: occupiedCount, color: '#8b50ff' }].map(s => (
            <div key={s.label} className="bg-[#0d1628] rounded-lg px-3 py-1.5 text-center">
              <p className="font-bold text-sm" style={{ color: s.color }}>{s.val}</p>
              <p className="text-muted text-[9px]">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {[{ val: 'all', label: '전체', color: '#c0ccdd' }, { val: 'mine', label: '내 영토', color: '#00ff88' }, { val: 'auction', label: '경매중', color: '#ffd700' }, { val: 'occupied', label: '점령됨', color: '#8b50ff' }, { val: 'idle', label: '미점령', color: '#4a5a7a' }].map(f => (
            <button key={f.val} onClick={() => setFilter(f.val as typeof filter)} className="px-2.5 h-7 rounded-lg transition-colors text-[10px]"
              style={{ color: filter === f.val ? '#060a14' : f.color, background: filter === f.val ? f.color : f.color + '20', border: `1px solid ${f.color}60`, fontWeight: filter === f.val ? 700 : 400 }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 relative overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, #080e1c 0%, #040810 100%)', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#040810b0]">
              <p className="text-primary font-semibold text-sm">지도 불러오는 중...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="text-center">
                <p className="text-danger mb-2 text-[13px]">{error}</p>
                <p className="text-muted text-[11px]">로그인 후 지도를 볼 수 있습니다.</p>
              </div>
            </div>
          )}

          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} className="w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-muted hover:text-white flex items-center justify-center text-sm">+</button>
            <button onClick={() => setZoom(z => Math.max(0.35, z / 1.2))} className="w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-muted hover:text-white flex items-center justify-center text-sm">−</button>
            <button onClick={() => { const { z, x, y } = getFitView(); setZoom(z); setPan({ x, y }); }} className="w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-muted hover:text-white flex items-center justify-center text-xs">⊡</button>
            <div className="bg-[#10192e] border border-[#2a3a5a] rounded px-2 h-7 flex items-center"><span className="text-muted text-[10px]">줌 {Math.round(zoom * 100)}%</span></div>
          </div>

          <div className="absolute top-3 right-3 z-10 bg-[#080e1c99] border border-[#1a2438] rounded-xl px-3 py-2 flex flex-col gap-1.5">
            {(['S', 'A', 'B', 'C'] as Grade[]).map(g => (
              <div key={g} className="flex items-center gap-1.5"><span className="text-[11px]">{GRADE_EMOJI[g]}</span><span className="text-[9px]" style={{ color: GRADE_COLOR[g] }}>{g}급</span></div>
            ))}
          </div>

          <div className="absolute bottom-3 left-3 z-10 text-[#2a3a5a] text-[10px]">스크롤로 줌 · 드래그로 이동 · 영토 클릭하여 상세 확인</div>

          {grid.length > 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform', padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${CELL}px)`, gridTemplateRows: `repeat(${rows}, ${CELL}px)`, gap: 1, position: 'relative' }}>
                {grid.map((row, y) => row.map((cell, x) => {
                  const isSelected = selected?.x === x && selected?.y === y;
                  const isHovered = hoverCell?.x === x && hoverCell?.y === y;
                  const shown = visible(cell);
                  let bg: string, border: string, glow: string | undefined;
                  if (!shown) { bg = '#080c18'; border = '#0d1420'; }
                  else if (cell.status === 'mine') { bg = cell.color + '50'; border = cell.color + 'cc'; glow = cell.color; }
                  else if (cell.status === 'occupied') { bg = cell.color + '35'; border = cell.color + '80'; }
                  else if (cell.status === 'auction') { bg = '#00f5ff18'; border = '#00f5ff50'; }
                  else { bg = '#0d1420'; border = '#141e30'; }
                  if (isSelected) border = '#00f5ff';
                  if (isHovered && !isSelected) border = '#ffffff60';
                  const visSize = shown ? GRADE_CELL[cell.grade] : 10;
                  const fs = GRADE_FONT[cell.grade];
                  const building = (cell.status === 'mine' || cell.status === 'occupied') ? GRADE_EMOJI[cell.grade] : '';
                  return (
                    <div key={`${x}-${y}`} data-cell="true"
                      className="flex items-center justify-center"
                      style={{ width: CELL, height: CELL, background: '#040810' }}
                    >
                      <div
                        onClick={() => {
                          if (!shown) return;
                          setSelected(cell); setBidInput(''); setBidSuccess(false);
                          setSelectedAuctionId(null); setAuctionCurrentPrice(0);
                          setAuctionEndAt(null); setBidHistory([]);
                          if (cell.status === 'auction' && cell.id) {
                            fetchTerritoryDetail(cell.id).then(d => {
                              if (d.auction) {
                                setSelectedAuctionId(d.auction.auctionId);
                                setAuctionCurrentPrice(d.auction.currentPrice);
                                setAuctionEndAt(d.auction.endAt);
                                setBidInput(String(d.auction.currentPrice + 100));
                              }
                            }).catch(() => {});
                          }
                        }}
                        onMouseEnter={() => setHoverCell({ x, y })}
                        onMouseLeave={() => setHoverCell(null)}
                        className="relative flex items-center justify-center"
                        style={{ width: visSize, height: visSize, background: bg, border: `1px solid ${border}`, borderRadius: 3, cursor: shown ? 'pointer' : 'default', boxShadow: isSelected ? '0 0 8px #00f5ff' : glow && shown ? `0 0 4px ${glow}60` : undefined, opacity: shown ? 1 : 0.15, transition: 'border-color 0.1s' }}
                      >
                        {shown && building && <span style={{ fontSize: fs, lineHeight: 1, userSelect: 'none' }}>{building}</span>}
                        {shown && cell.status === 'auction' && !building && <div style={{ width: Math.max(4, fs - 4), height: Math.max(4, fs - 4), borderRadius: '50%', background: '#00f5ff', animation: 'pulse 1.2s infinite' }} />}
                        {shown && cell.grade === 'S' && cell.status !== 'idle' && <div className="absolute top-0 left-0 w-0 h-0" style={{ borderLeft: '4px solid #ffd700', borderBottom: '4px solid transparent' }} />}
                        {shown && cell.status === 'mine' && <div className="absolute bottom-0 right-0 w-0 h-0" style={{ borderRight: '4px solid #00ff88', borderTop: '4px solid transparent' }} />}
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>
          )}
        </div>

        <div className="w-[260px] bg-[#080d1a] border-l border-[#1a2438] flex flex-col flex-shrink-0">
          {/* Panel tabs */}
          <div className="flex-shrink-0 flex border-b border-[#1a2438]">
            {([['info', '📋 정보'], ['chat', '💬 채팅']] as ['info' | 'chat', string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setPanelTab(t)}
                className="flex-1 py-2 text-[11px] transition-colors"
                style={panelTab === t
                  ? { color: '#00f5ff', borderBottom: '2px solid #00f5ff' }
                  : { color: '#7788a5', borderBottom: '2px solid transparent' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chat panel */}
          {panelTab === 'chat' && (
            <ChatPanel roomId={`room_continent_${continentId}`} />
          )}

          {/* Info panel */}
          {panelTab === 'info' && (selected ? (
            <>
              {/* Territory header */}
              <div className="px-4 py-3 border-b border-[#1a2438] flex-shrink-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[#c0ccdd] font-bold text-sm">영토 ({selected.coordX}, {selected.coordY})</p>
                    <p className="text-muted text-[10px]">{continent.name}</p>
                  </div>
                  <div className="px-2 py-0.5 rounded font-bold flex items-center gap-1 text-[10px]" style={{ color: GRADE_COLOR[selected.grade], background: GRADE_COLOR[selected.grade] + '20' }}>
                    <span>{GRADE_EMOJI[selected.grade]}</span><span>{selected.grade}급</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: selected.color + '18', border: `1px solid ${selected.color}50` }}>
                  <span className="text-xl">{GRADE_EMOJI[selected.grade]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs" style={{ color: selected.color }}>
                      {selected.status === 'mine' ? '내 영토' : selected.status === 'occupied' ? `${selected.owner} 점령` : selected.status === 'auction' ? '경매 진행 중' : '미점령'}
                    </p>
                    <p className="text-muted text-[9px] truncate">{selected.owner || '점유자 없음'}</p>
                  </div>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">

                {selected.status === 'idle' && (
                  <div className="bg-[#0d1628] border border-[#354064] rounded-xl p-3 text-center">
                    <p className="text-muted text-[11px]">현재 경매 없음</p>
                    <p className="text-[#4a5a7a] text-[9px] mt-1">토지세 미납 또는 공성전 후 자동 경매 예정</p>
                  </div>
                )}

                {selected.status === 'auction' && (
                  <>
                    {/* Countdown */}
                    <div className="bg-[#0d1628] border border-[#ffd70030] rounded-xl p-3">
                      <p className="text-[#8892b0] text-[9px] mb-1">경매 종료까지</p>
                      <p className="text-[#ffd700] font-bold text-xl text-center tracking-wider" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {timeLeft || '--:--:--'}
                      </p>
                    </div>

                    {/* Price info */}
                    <div className="bg-[#0d1628] border border-[#354064] rounded-xl p-3" style={isHighestBidder ? { borderColor: '#00ff8860' } : undefined}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-muted text-[9px]">현재 최고 입찰가</p>
                        {isHighestBidder && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#00ff8820', color: '#00ff88', border: '1px solid #00ff8840' }}>
                            👑 최고 입찰자
                          </span>
                        )}
                      </div>
                      <p className="text-[#ffd700] font-bold text-lg leading-none">
                        {auctionCurrentPrice.toLocaleString()}
                        <span className="text-[11px] text-muted font-normal ml-1">AP</span>
                      </p>
                      <div className="mt-2 pt-2 border-t border-[#1a2438] flex justify-between">
                        <span className="text-muted text-[9px]">최소 입찰가</span>
                        <span className="text-[#c0ccdd] text-[9px] font-semibold">{(auctionCurrentPrice + 100).toLocaleString()} AP</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted text-[9px]">보유 AP</span>
                        <span className="text-[#00ff88] text-[9px] font-semibold">{ap.toLocaleString()} AP</span>
                      </div>
                    </div>

                    {/* Bid form */}
                    <div className="bg-[#0d1628] border border-[#ffd70040] rounded-xl p-3">
                      <p className="text-[#ffd700] font-bold mb-2 text-[11px]">⚡ 입찰하기</p>
                      {bidSuccess ? (
                        <div className="text-center py-2">
                          <p className="text-[#00ff88] font-bold text-xs">✓ 입찰 완료!</p>
                          <p className="text-muted text-[10px] mt-0.5">잔여 AP: {ap.toLocaleString()}</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-1 mb-2">
                            {[500, 1000, 5000].map(inc => (
                              <button key={inc} onClick={() => setBidInput(v => String((parseInt(v) || auctionCurrentPrice) + inc))}
                                className="flex-1 h-6 rounded transition-colors hover:brightness-125 text-[9px]"
                                style={{ background: '#1a2438', border: '1px solid #354064', color: '#c0ccdd' }}>
                                +{inc >= 1000 ? `${inc / 1000}K` : inc}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1.5 mb-1.5">
                            <input type="number" value={bidInput} onChange={e => setBidInput(e.target.value)}
                              placeholder={`${(auctionCurrentPrice + 100).toLocaleString()}`}
                              className="flex-1 h-8 bg-[#060a14] border border-outline rounded-lg px-2 text-foreground outline-none focus:border-gold text-[11px]" />
                            <button onClick={handleBidSubmit}
                              disabled={!bidInput || !selectedAuctionId || isBidding || parseInt(bidInput) <= auctionCurrentPrice || parseInt(bidInput) > ap}
                              className="h-8 px-3 rounded-lg font-bold transition-all hover:brightness-110 disabled:opacity-40 text-[11px]"
                              style={{ background: '#ffd700', color: '#060a14' }}>
                              {isBidding ? '...' : '입찰'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Bid history */}
                    <div>
                      <p className="text-muted text-[10px] mb-1.5">입찰 현황 ({bidHistory.length}건)</p>
                      {bidHistory.length === 0 ? (
                        <p className="text-[#4a5a7a] text-[9px] text-center py-2">입찰 내역이 없습니다</p>
                      ) : (
                        <div className="space-y-1">
                          {bidHistory.slice(0, 10).map((bid, i) => {
                            const isMe = bid.bidderNickname === username;
                            return (
                              <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                                style={{ background: isMe ? '#00ff8810' : '#0a1020', border: `1px solid ${isMe ? '#00ff8840' : '#1a2438'}` }}>
                                <div>
                                  <p className="text-[10px] font-semibold" style={{ color: isMe ? '#00ff88' : '#c0ccdd' }}>
                                    {bid.bidderNickname ?? '익명'}{isMe && ' (나)'}
                                  </p>
                                  <p className="text-muted text-[8px]">{fmtBidTime(bid.bidAt)}</p>
                                </div>
                                <p className="text-[#ffd700] font-bold text-[10px]">{bid.price.toLocaleString()}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {(selected.status === 'mine' || selected.status === 'occupied') && (
                  <div className="bg-[#0d1628] border border-[#354064] rounded-xl p-3 text-center">
                    <p className="text-muted text-[11px]">
                      {selected.status === 'mine' ? '내 영토입니다' : `${selected.owner}의 영토입니다`}
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex-shrink-0 p-3 space-y-2 border-t border-[#1a2438]">
                <button onClick={() => navigate(`/app/territory/${selected.id}`)} className="w-full h-8 rounded-xl font-bold transition-all hover:brightness-110 text-[11px]" style={{ background: continent.color, color: '#060a14' }}>영토 상세 보기</button>
                {selected.status === 'occupied' && <button onClick={() => navigate('/app/siege')} className="w-full h-8 bg-[#ff303020] border border-[#ff3030] rounded-xl text-[#ff5050] font-bold text-[11px]">⚔ 공성전 선언</button>}
                {selected.status === 'mine' && <button onClick={() => navigate(`/app/territory-grid/${selected.id}`)} className="w-full h-8 bg-[#00ff8820] border border-[#00ff8860] rounded-xl text-[#00ff88] font-bold text-[11px]">🏗 영토 내부 보기</button>}
                <button onClick={handleDeselect} className="w-full h-7 bg-[#0d1628] border border-[#1a2438] rounded-xl text-muted text-[10px]">선택 해제</button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-4 border-b border-[#1a2438]">
                <p className="font-bold mb-3 text-[13px]" style={{ color: continent.color }}>{continent.name}</p>
                <div className="space-y-2">
                  {[{ label: '등급', val: continent.grade, color: GRADE_COLOR[continent.grade as Grade] || '#c0ccdd' }, { label: '경매 중', val: `${auctionCount}개`, color: '#ffd700' }, { label: '내 영토', val: `${myCount}개`, color: '#00ff88' }, { label: '점령됨', val: `${occupiedCount}개`, color: '#8b50ff' }, { label: '미점령', val: `${cols * rows - myCount - auctionCount - occupiedCount}개`, color: '#4a5a7a' }].map(s => (
                    <div key={s.label} className="flex justify-between"><span className="text-muted text-[11px]">{s.label}</span><span className="font-semibold text-[11px]" style={{ color: s.color }}>{s.val}</span></div>
                  ))}
                </div>
              </div>
              <div className="p-3">
                <p className="text-muted text-center mb-2 text-[10px]">영토를 클릭하여 상세 정보 확인</p>
                <button onClick={() => navigate('/app/territory/1')} className="w-full h-9 rounded-xl font-bold hover:brightness-110 text-xs" style={{ background: continent.color, color: '#060a14' }}>경매 영토 보기</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
