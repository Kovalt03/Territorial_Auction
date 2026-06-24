import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useGridMap } from '../hooks/useGridMap';
import { useContinent } from '../hooks/useContinent';
import { useStompSubscribe } from '../hooks/useStompClient';
import { useWishlist } from '../hooks/useWishlist';
import { GNB } from '../components/GNB';
import { ChatPanel } from '../components/ChatPanel';
import { useApp } from '../context/AppContext';
import { fetchTerritoryDetail } from '../api/map';
import { placeBidApi, fetchAuctionBids } from '../api/auction';
import { fetchMyWallet } from '../api/user';
import type { GridTerritoryDto } from '../types/map';
import type { Grade } from '../types/grade';
import type { BidEntry, AuctionBidBroadcast } from '../types/auction';
import { GRADE_COLOR } from '../types/grade';

import { ContinentSelectedPanel } from './ContinentSelectedPanel';
import { BidConfirmModal } from './BidConfirmModal';

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
  if (ownerId == null) return 'var(--color-outline-soft)';
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
        color: status === 'idle' ? 'var(--color-outline-soft)' : ownerColor(t.ownerId, t.color),
        grade,
        currentBid: 0, gpPerMin: 0, defense: 0,
        id: t.id,
      };
    }
  }
  return grid.map((row, y) =>
    row.map((cell, x) => cell ?? {
      x, y, coordX: x + minX, coordY: y + minY,
      status: 'idle' as TStatus, owner: null, color: 'var(--color-outline-soft)', grade: 'C' as Grade,
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
  const { ap, userId, username, syncAP } = useApp();
  const { wishlistIds, toggle: toggleWishlist } = useWishlist();

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
  const [showConfirm, setShowConfirm] = useState(false);

  useStompSubscribe<AuctionBidBroadcast>(
    selectedAuctionId ? `/sub/auction/${selectedAuctionId}` : null,
    (msg) => {
      setAuctionCurrentPrice(msg.currentPrice);
      setAuctionEndAt(msg.endAt);
      setBidInput(String(Math.max(Math.ceil(msg.currentPrice * 1.05), msg.currentPrice + 10)));
      fetchAuctionBids(msg.auctionId).then(res => setBidHistory(res.bids)).catch((e) => console.warn('[ContinentPage] bid history refresh failed', e));
      // 상대방이 입찰하면 내 locked AP가 환불되므로 지갑 즉시 갱신
      if (msg.bidderId !== userId) {
        fetchMyWallet().then(wallet => syncAP(wallet.availableAP)).catch((e) => console.warn('[ContinentPage] wallet sync failed', e));
      }
    },
  );

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
    fetchAuctionBids(selectedAuctionId).then(res => setBidHistory(res.bids)).catch((e) => console.warn('[ContinentPage] bid history load failed', e));
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

  const handleBidSubmit = () => {
    const amt = parseInt(bidInput);
    if (!amt || !selectedAuctionId || isBidding) return;
    setShowConfirm(true);
  };

  const handleConfirmBid = async () => {
    const amt = parseInt(bidInput);
    if (!amt || !selectedAuctionId || isBidding) return;
    setIsBidding(true);
    try {
      const result = await placeBidApi(selectedAuctionId, amt);
      const wallet = await fetchMyWallet();
      syncAP(wallet.availableAP);
      setShowConfirm(false);
      setBidSuccess(true);
      setTimeout(() => setBidSuccess(false), 2500);
      setAuctionCurrentPrice(result.newPrice);
      setAuctionEndAt(result.endAt);
      setBidInput(String(Math.max(Math.ceil(result.newPrice * 1.05), result.newPrice + 10)));
      fetchAuctionBids(selectedAuctionId).then(res => setBidHistory(res.bids)).catch((e) => console.warn('[ContinentPage] bid history refresh after bid failed', e));
    } catch {
      setShowConfirm(false);
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

      <div className="flex items-center gap-4 px-5 py-3 border-b flex-shrink-0" style={{ background: 'var(--color-surface)', borderColor: continent.color + '40' }}>
        <button onClick={() => navigate('/app/map')} className="text-muted hover:text-foreground-soft transition-colors flex-shrink-0 text-lg">←</button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: continent.color + '25', border: `1.5px solid ${continent.color}60` }}>
          <div className="w-4 h-4 rounded-full" style={{ background: continent.color }} />
        </div>
        <div>
          <h1 className="font-bold text-lg" style={{ color: continent.color }}>{continent.name}</h1>
          <p className="text-muted text-[11px]">{continent.desc} · {cols}×{rows} 픽셀 그리드</p>
        </div>
        <div className="flex items-center gap-3 ml-6">
          {[{ label: '전체', val: cols * rows, color: '#c0ccdd' }, { label: '경매중', val: auctionCount, color: '#ffd700' }, { label: '내 영토', val: myCount, color: '#00ff88' }, { label: '타 점령', val: occupiedCount, color: '#8b50ff' }].map(s => (
            <div key={s.label} className="bg-panel-deep rounded-lg px-3 py-1.5 text-center">
              <p className="font-bold text-sm" style={{ color: s.color }}>{s.val}</p>
              <p className="text-muted text-[9px]">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {[{ val: 'all', label: '전체', color: '#c0ccdd' }, { val: 'mine', label: '내 영토', color: '#00ff88' }, { val: 'auction', label: '경매중', color: '#ffd700' }, { val: 'occupied', label: '점령됨', color: '#8b50ff' }, { val: 'idle', label: '미점령', color: 'var(--color-muted)' }].map(f => (
            <button key={f.val} onClick={() => setFilter(f.val as typeof filter)}
              className={`px-2.5 h-7 rounded-lg transition-colors text-[10px] ${filter === f.val ? 'font-bold' : 'font-normal'}`}
              style={{ color: filter === f.val ? '#060a14' : f.color, background: filter === f.val ? f.color : f.color + '20', border: `1px solid ${f.color}60` }}>
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
            <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} className="w-7 h-7 bg-outline-soft border border-outline rounded text-muted hover:text-white flex items-center justify-center text-sm">+</button>
            <button onClick={() => setZoom(z => Math.max(0.35, z / 1.2))} className="w-7 h-7 bg-outline-soft border border-outline rounded text-muted hover:text-white flex items-center justify-center text-sm">−</button>
            <button onClick={() => { const { z, x, y } = getFitView(); setZoom(z); setPan({ x, y }); }} className="w-7 h-7 bg-outline-soft border border-outline rounded text-muted hover:text-white flex items-center justify-center text-xs">⊡</button>
            <div className="bg-outline-soft border border-outline rounded px-2 h-7 flex items-center"><span className="text-muted text-[10px]">줌 {Math.round(zoom * 100)}%</span></div>
          </div>

          <div className="absolute top-3 right-3 z-10 bg-[#080e1c99] border border-outline-soft rounded-xl px-3 py-2 flex flex-col gap-1.5">
            {(['S', 'A', 'B', 'C'] as Grade[]).map(g => (
              <div key={g} className="flex items-center gap-1.5"><span className="text-[11px]">{GRADE_EMOJI[g]}</span><span className="text-[9px]" style={{ color: GRADE_COLOR[g] }}>{g}급</span></div>
            ))}
          </div>

          <div className="absolute bottom-3 left-3 z-10 text-outline text-[10px]">스크롤로 줌 · 드래그로 이동 · 영토 클릭하여 상세 확인</div>

          {grid.length > 0 && (
            <div
              className="absolute top-0 left-0 p-6"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform' }}
            >
              <div
                className="grid relative"
                style={{ gridTemplateColumns: `repeat(${cols}, ${CELL}px)`, gridTemplateRows: `repeat(${rows}, ${CELL}px)`, gap: 1 }}
              >
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
                      style={{ width: CELL, height: CELL, background: 'var(--color-surface)' }}
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
                                const min = Math.max(Math.ceil(d.auction.currentPrice * 1.05), d.auction.currentPrice + 10);
                                setBidInput(String(min));
                              }
                            }).catch((e) => console.warn('[ContinentPage] territory detail load failed', e));
                          }
                        }}
                        onMouseEnter={() => setHoverCell({ x, y })}
                        onMouseLeave={() => setHoverCell(null)}
                        className={`relative flex items-center justify-center ${shown ? '' : 'opacity-15'}`}
                        style={{ width: visSize, height: visSize, background: bg, border: `1px solid ${border}`, borderRadius: 3, cursor: shown ? 'pointer' : 'default', boxShadow: isSelected ? '0 0 8px #00f5ff' : glow && shown ? `0 0 4px ${glow}60` : undefined, transition: 'border-color 0.1s' }}
                      >
                        {shown && building && <span className="leading-none select-none" style={{ fontSize: fs }}>{building}</span>}
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

        <div className="w-[260px] bg-surface border-l border-outline-soft flex flex-col flex-shrink-0">
          {/* Panel tabs */}
          <div className="flex-shrink-0 flex border-b border-outline-soft">
            {([['info', '📋 정보'], ['chat', '💬 채팅']] as ['info' | 'chat', string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setPanelTab(t)}
                className={`flex-1 py-2 text-[11px] transition-colors border-b-2 ${panelTab === t ? 'text-primary border-primary' : 'text-muted border-transparent'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chat panel */}
          {panelTab === 'chat' && (
            <ChatPanel roomId={`room_continent_${continentId}`} />
          )}

          {panelTab === 'info' && (selected ? (
            <ContinentSelectedPanel
              selected={selected}
              continentName={continent.name}
              continentColor={continent.color}
              username={username ?? ''}
              ap={ap}
              auctionCurrentPrice={auctionCurrentPrice}
              selectedAuctionId={selectedAuctionId}
              timeLeft={timeLeft}
              bidHistory={bidHistory}
              bidInput={bidInput}
              bidSuccess={bidSuccess}
              isBidding={isBidding}
              isHighestBidder={isHighestBidder}
              onChangeBidInput={setBidInput}
              onSubmitBid={handleBidSubmit}
              wishlistIds={wishlistIds}
              onToggleWishlist={(id) => void toggleWishlist(id)}
              onDeselect={handleDeselect}
              fmtBidTime={fmtBidTime}
            />
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-4 border-b border-outline-soft">
                <p className="font-bold mb-3 text-[13px]" style={{ color: continent.color }}>{continent.name}</p>
                <div className="space-y-2">
                  {[{ label: '등급', val: continent.grade, color: GRADE_COLOR[continent.grade as Grade] || '#c0ccdd' }, { label: '경매 중', val: `${auctionCount}개`, color: '#ffd700' }, { label: '내 영토', val: `${myCount}개`, color: '#00ff88' }, { label: '점령됨', val: `${occupiedCount}개`, color: '#8b50ff' }, { label: '미점령', val: `${cols * rows - myCount - auctionCount - occupiedCount}개`, color: 'var(--color-muted)' }].map(s => (
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

      {showConfirm && selected && (
        <BidConfirmModal
          territoryCoord={{ x: selected.coordX, y: selected.coordY }}
          continentName={continent.name}
          bidAmount={parseInt(bidInput)}
          currentBid={auctionCurrentPrice}
          ap={ap}
          isOutbid={false}
          isBidding={isBidding}
          gradeColor="#ffd700"
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => void handleConfirmBid()}
        />
      )}
    </div>
  );
}
