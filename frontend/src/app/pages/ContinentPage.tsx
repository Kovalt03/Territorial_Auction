import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GNB } from '../components/GNB';
import { CONTINENTS } from './WorldMapPage';
import { useApp } from '../context/AppContext';

type TStatus = 'mine' | 'occupied' | 'auction' | 'idle';
type TGrade = 'S' | 'A' | 'B' | 'C';

interface Territory {
  x: number; y: number; status: TStatus; owner: string | null; color: string;
  grade: TGrade; name: string; building: string; currentBid: number;
  gpPerMin: number; defense: number; timeLeft?: number;
}

const COLS = 30, ROWS = 20, CELL = 30;

const NAMES = ['네온 타워', '사이버 거리', '크롬 광장', '데이터 허브', '바이트 필드',
  '픽셀 정원', '글리치 구역', '디지털 포트', '나노 기지', '퀀텀 빌딩',
  '마트릭스 요새', '바이너리 파크', '서킷 하이웨이', '엘렉트로 마켓', '팬텀 타운'];

const OWNERS = ['강남부자', '픽셀왕', '영토수집가', '사이버해커', '글리치마스터'];
const OWNER_COLORS: Record<string, string> = {
  '강남부자': '#f06070', '픽셀왕': '#00f5ff', '영토수집가': '#8b50ff',
  '사이버해커': '#ffd700', '글리치마스터': '#ff8c00',
};

const GRADE_EMOJI: Record<TGrade, string> = { S: '👑', A: '💎', B: '🔷', C: '🔹' };
const GRADE_COLORS: Record<TGrade, string> = { S: '#ffd700', A: '#00f5ff', B: '#00ff88', C: '#8892b0' };
// Visual inner cell size per grade (outer cell is always CELL px, dark bg creates padding gap)
const GRADE_CELL: Record<TGrade, number> = { S: 29, A: 24, B: 18, C: 12 };
// Emoji font size per grade
const GRADE_FONT: Record<TGrade, number> = { S: 13, A: 11, B: 9, C: 7 };

function seededRand(n: number) {
  const x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
}

function generateTerritories(continentId: string): Territory[][] {
  const seed = continentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) => {
      const h = seededRand(x * 97 + y * 43 + seed * 13);
      const h2 = seededRand(x * 53 + y * 71 + seed * 7);
      const h3 = seededRand(x * 17 + y * 89 + seed * 31);
      let status: TStatus;
      if (h < 0.10) status = 'mine';
      else if (h < 0.32) status = 'occupied';
      else if (h < 0.55) status = 'auction';
      else status = 'idle';
      const grade: TGrade = h2 < 0.08 ? 'S' : h2 < 0.28 ? 'A' : h2 < 0.62 ? 'B' : 'C';
      const ownerIdx = Math.floor(h3 * OWNERS.length);
      const owner = status === 'mine' ? '강남부자' : status === 'occupied' ? OWNERS[(ownerIdx + 1) % OWNERS.length] : null;
      const color = owner ? (OWNER_COLORS[owner] || '#7788a5') : '#1a2a3a';
      const nameIdx = Math.floor(seededRand(x * 11 + y * 23 + seed) * NAMES.length);
      return {
        x, y, status, owner, color, grade,
        name: NAMES[nameIdx],
        building: status === 'mine' || status === 'occupied' ? GRADE_EMOJI[grade] : '',
        currentBid: Math.floor(seededRand(x * 37 + y * 61 + seed * 3) * 8000) + 300,
        gpPerMin: Math.floor(seededRand(x * 29 + y * 47 + seed * 9) * 60) + 5,
        defense: Math.floor(seededRand(x * 41 + y * 83 + seed * 5) * 900) + 50,
        timeLeft: status === 'auction' ? Math.floor(seededRand(x + y + seed) * 7200) + 300 : undefined,
      };
    })
  );
}

function fmtTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export function ContinentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const continent = CONTINENTS.find(c => c.id === id) || CONTINENTS[0];
  const grid = useMemo(() => generateTerritories(continent.id), [continent.id]);

  const { ap, useAP } = useApp();
  const [filter, setFilter] = useState<'all' | TStatus>('all');
  const [selected, setSelected] = useState<Territory | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [bidInput, setBidInput] = useState('');
  const [bidSuccess, setBidSuccess] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // GRID_W/H = grid content + 24px padding on each side
  const GRID_W = COLS * (CELL + 1) - 1 + 48;
  const GRID_H = ROWS * (CELL + 1) - 1 + 48;

  const getFitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { z: 1, x: 0, y: 0 };
    const { width, height } = el.getBoundingClientRect();
    // 0.94 ensures the whole grid is always fully visible with a small margin
    const z = Math.min(width / GRID_W, height / GRID_H) * 0.94;
    return { z, x: (width - GRID_W * z) / 2, y: (height - GRID_H * z) / 2 };
  }, [GRID_W, GRID_H]);

  // alias kept for zoom-reset button
  const getCenteredPan = getFitView;

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const { z, x, y } = getFitView();
      setZoom(z);
      setPan({ x, y });
    });
    return () => cancelAnimationFrame(raf);
  }, [getFitView]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const { z, x, y } = getFitView();
      setZoom(z);
      setPan({ x, y });
    });
    setSelected(null);
    return () => cancelAnimationFrame(raf);
  }, [id, getFitView]);

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
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setPan({ x: dragStart.px + (e.clientX - dragStart.mx), y: dragStart.py + (e.clientY - dragStart.my) }); };
  const handleMouseUp = () => setIsDragging(false);

  const allTerritories = grid.flat();
  const myCount = allTerritories.filter(t => t.status === 'mine').length;
  const auctionCount = allTerritories.filter(t => t.status === 'auction').length;
  const occupiedCount = allTerritories.filter(t => t.status === 'occupied').length;

  const visible = (t: Territory) => filter === 'all' || t.status === filter;

  return (
    <div className="flex flex-col h-screen bg-[#060a14] overflow-hidden">
      <GNB />

      <div className="flex items-center gap-4 px-5 py-3 border-b flex-shrink-0" style={{ background: '#080e1c', borderColor: continent.color + '40' }}>
        <button onClick={() => navigate('/app/map')} className="text-[#4a5a7a] hover:text-[#c0ccdd] transition-colors flex-shrink-0" style={{ fontSize: 18 }}>←</button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: continent.color + '25', border: `1.5px solid ${continent.color}60` }}>
          <div className="w-4 h-4 rounded-full" style={{ background: continent.color }} />
        </div>
        <div>
          <h1 className="font-bold" style={{ fontSize: 18, color: continent.color }}>{continent.name}</h1>
          <p className="text-[#4a5a7a]" style={{ fontSize: 11 }}>{continent.desc} · {COLS}×{ROWS} 픽셀 그리드</p>
        </div>
        <div className="flex items-center gap-3 ml-6">
          {[{ label: '전체', val: COLS * ROWS, color: '#c0ccdd' }, { label: '경매중', val: auctionCount, color: '#ffd700' }, { label: '내 영토', val: myCount, color: '#00ff88' }, { label: '타 점령', val: occupiedCount, color: '#8b50ff' }].map(s => (
            <div key={s.label} className="bg-[#0d1628] rounded-lg px-3 py-1.5 text-center">
              <p className="font-bold" style={{ fontSize: 14, color: s.color }}>{s.val}</p>
              <p className="text-[#4a5a7a]" style={{ fontSize: 9 }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {[{ val: 'all', label: '전체', color: '#c0ccdd' }, { val: 'mine', label: '내 영토', color: '#00ff88' }, { val: 'auction', label: '경매중', color: '#ffd700' }, { val: 'occupied', label: '점령됨', color: '#8b50ff' }, { val: 'idle', label: '미점령', color: '#4a5a7a' }].map(f => (
            <button key={f.val} onClick={() => setFilter(f.val as typeof filter)} className="px-2.5 h-7 rounded-lg transition-colors"
              style={{ fontSize: 10, color: filter === f.val ? '#060a14' : f.color, background: filter === f.val ? f.color : f.color + '20', border: `1px solid ${f.color}60`, fontWeight: filter === f.val ? 700 : 400 }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div ref={containerRef} className="flex-1 relative overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, #080e1c 0%, #040810 100%)', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <button onClick={() => setZoom(z => Math.min(4, z * 1.2))} className="w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white flex items-center justify-center" style={{ fontSize: 14 }}>+</button>
            <button onClick={() => setZoom(z => Math.max(0.35, z / 1.2))} className="w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white flex items-center justify-center" style={{ fontSize: 14 }}>−</button>
            <button onClick={() => { const { z, x, y } = getFitView(); setZoom(z); setPan({ x, y }); }} className="w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white flex items-center justify-center" style={{ fontSize: 12 }}>⊡</button>
            <div className="bg-[#10192e] border border-[#2a3a5a] rounded px-2 h-7 flex items-center"><span className="text-[#4a5a7a]" style={{ fontSize: 10 }}>줌 {Math.round(zoom * 100)}%</span></div>
          </div>

          <div className="absolute top-3 right-3 z-10 bg-[#080e1c99] border border-[#1a2438] rounded-xl px-3 py-2 flex flex-col gap-1.5">
            {(['S', 'A', 'B', 'C'] as TGrade[]).map(g => (
              <div key={g} className="flex items-center gap-1.5"><span style={{ fontSize: 11 }}>{GRADE_EMOJI[g]}</span><span style={{ fontSize: 9, color: GRADE_COLORS[g] }}>{g}급</span></div>
            ))}
          </div>

          <div className="absolute bottom-3 left-3 z-10 text-[#2a3a5a]" style={{ fontSize: 10 }}>스크롤로 줌 · 드래그로 이동 · 영토 클릭하여 상세 확인</div>

          <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`, gap: 1, position: 'relative' }}>
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
                return (
                  // Outer cell: dark background so the inner-square size gap is visible
                  <div key={`${x}-${y}`} data-cell="true"
                    className="flex items-center justify-center"
                    style={{ width: CELL, height: CELL, background: '#040810' }}
                  >
                    {/* Inner visual: size varies by grade */}
                    <div
                      onClick={() => { if (shown && cell.status !== 'idle') { setSelected(cell); setBidInput(String(cell.currentBid + 100)); setBidSuccess(false); } }}
                      onMouseEnter={() => setHoverCell({ x, y })}
                      onMouseLeave={() => setHoverCell(null)}
                      className="relative flex items-center justify-center"
                      style={{ width: visSize, height: visSize, background: bg, border: `1px solid ${border}`, borderRadius: 3, cursor: shown && cell.status !== 'idle' ? 'pointer' : 'default', boxShadow: isSelected ? '0 0 8px #00f5ff' : glow && shown ? `0 0 4px ${glow}60` : undefined, opacity: shown ? 1 : 0.15, transition: 'border-color 0.1s' }}
                    >
                      {shown && cell.building && <span style={{ fontSize: fs, lineHeight: 1, userSelect: 'none' }}>{cell.building}</span>}
                      {shown && cell.status === 'auction' && !cell.building && <div style={{ width: Math.max(4, fs - 4), height: Math.max(4, fs - 4), borderRadius: '50%', background: '#00f5ff', animation: 'pulse 1.2s infinite' }} />}
                      {shown && cell.grade === 'S' && cell.status !== 'idle' && <div className="absolute top-0 left-0 w-0 h-0" style={{ borderLeft: '4px solid #ffd700', borderBottom: '4px solid transparent' }} />}
                      {shown && cell.status === 'mine' && <div className="absolute bottom-0 right-0 w-0 h-0" style={{ borderRight: '4px solid #00ff88', borderTop: '4px solid transparent' }} />}
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
        </div>

        <div className="w-[230px] bg-[#080d1a] border-l border-[#1a2438] flex flex-col flex-shrink-0">
          {selected ? (
            <>
              <div className="px-4 py-4 border-b border-[#1a2438]">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[#c0ccdd] font-bold" style={{ fontSize: 14 }}>{selected.name}</p>
                    <p className="text-[#4a5a7a]" style={{ fontSize: 10 }}>({selected.x}, {selected.y}) · {continent.name}</p>
                  </div>
                  <div className="px-2 py-0.5 rounded font-bold flex items-center gap-1" style={{ fontSize: 10, color: GRADE_COLORS[selected.grade], background: GRADE_COLORS[selected.grade] + '20' }}>
                    <span>{GRADE_EMOJI[selected.grade]}</span><span>{selected.grade}급</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" style={{ background: selected.color + '18', border: `1px solid ${selected.color}50` }}>
                  <span style={{ fontSize: 20 }}>{selected.building || '🏔'}</span>
                  <div>
                    <p className="font-semibold" style={{ fontSize: 12, color: selected.color }}>
                      {selected.status === 'mine' ? '내 영토' : selected.status === 'occupied' ? selected.owner + ' 점령' : '경매 진행 중'}
                    </p>
                    <p className="text-[#4a5a7a]" style={{ fontSize: 9 }}>{selected.owner || '점유자 없음'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[{ label: '현재 입찰', val: `${selected.currentBid.toLocaleString()} AP`, color: '#ffd700' }, { label: 'GP/분', val: `+${selected.gpPerMin}`, color: '#00ff88' }, { label: '방어력', val: selected.defense.toLocaleString(), color: '#ff6060' }].map(s => (
                    <div key={s.label} className="flex justify-between"><span className="text-[#4a5a7a]" style={{ fontSize: 11 }}>{s.label}</span><span className="font-semibold" style={{ fontSize: 11, color: s.color }}>{s.val}</span></div>
                  ))}
                  {selected.timeLeft !== undefined && (
                    <div className="flex justify-between"><span className="text-[#4a5a7a]" style={{ fontSize: 11 }}>마감까지</span><span className="font-semibold text-[#ffd700]" style={{ fontSize: 11 }}>{fmtTime(selected.timeLeft)}</span></div>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-2">
                {/* Inline bid UI for auction territories */}
                {selected.status === 'auction' && (
                  <div className="bg-[#0d1628] border border-[#ffd70040] rounded-xl p-3 mb-1">
                    <p className="text-[#ffd700] font-bold mb-2" style={{ fontSize: 11 }}>⚡ 즉시 입찰</p>
                    {bidSuccess ? (
                      <div className="text-center py-2">
                        <p className="text-[#00ff88] font-bold" style={{ fontSize: 12 }}>✓ 입찰 완료!</p>
                        <p className="text-[#4a5a7a]" style={{ fontSize: 10 }}>잔여 AP: {ap.toLocaleString()}</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-1 mb-2">
                          {[500, 1000, 5000].map(inc => (
                            <button
                              key={inc}
                              onClick={() => setBidInput(v => String((parseInt(v) || 0) + inc))}
                              className="flex-1 h-6 rounded transition-colors hover:brightness-125"
                              style={{ fontSize: 9, background: '#1a2438', border: '1px solid #354064', color: '#c0ccdd' }}
                            >
                              +{inc >= 1000 ? `${inc / 1000}K` : inc}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1.5 mb-1.5">
                          <input
                            type="number"
                            value={bidInput}
                            onChange={e => setBidInput(e.target.value)}
                            placeholder={`${(selected.currentBid + 100).toLocaleString()}`}
                            className="flex-1 h-8 bg-[#060a14] border border-[#354064] rounded-lg px-2 text-[#e0e8ff] outline-none focus:border-[#ffd700]"
                            style={{ fontSize: 11 }}
                          />
                          <button
                            onClick={() => {
                              const amt = parseInt(bidInput);
                              if (amt > selected.currentBid && amt <= ap) {
                                useAP(amt);
                                setBidInput('');
                                setBidSuccess(true);
                                setTimeout(() => setBidSuccess(false), 2500);
                              }
                            }}
                            disabled={!bidInput || parseInt(bidInput) <= selected.currentBid || parseInt(bidInput) > ap}
                            className="h-8 px-3 rounded-lg font-bold transition-all hover:brightness-110 disabled:opacity-40"
                            style={{ background: '#ffd700', color: '#060a14', fontSize: 11, cursor: !bidInput || parseInt(bidInput) <= selected.currentBid || parseInt(bidInput) > ap ? 'not-allowed' : 'pointer' }}
                          >
                            입찰
                          </button>
                        </div>
                        <p className="text-[#4a5a7a]" style={{ fontSize: 9 }}>보유 AP {ap.toLocaleString()} · 최소 {(selected.currentBid + 1).toLocaleString()}+</p>
                      </>
                    )}
                  </div>
                )}
                <button onClick={() => navigate('/app/territory/15-22')} className="w-full h-8 rounded-xl font-bold transition-all hover:brightness-110" style={{ background: continent.color, color: '#060a14', fontSize: 11 }}>영토 상세 보기</button>
                {selected.status === 'occupied' && <button onClick={() => navigate('/app/siege')} className="w-full h-8 bg-[#ff303020] border border-[#ff3030] rounded-xl text-[#ff5050] font-bold" style={{ fontSize: 11 }}>⚔ 공성전 선언</button>}
                {selected.status === 'mine' && <button onClick={() => navigate('/app/territory-grid/15-22')} className="w-full h-8 bg-[#00ff8820] border border-[#00ff8860] rounded-xl text-[#00ff88] font-bold" style={{ fontSize: 11 }}>🏗 영토 내부 보기</button>}
                <button onClick={() => { setSelected(null); setBidInput(''); setBidSuccess(false); }} className="w-full h-7 bg-[#0d1628] border border-[#1a2438] rounded-xl text-[#4a5a7a]" style={{ fontSize: 10 }}>선택 해제</button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-4 border-b border-[#1a2438]">
                <p className="font-bold mb-3" style={{ fontSize: 13, color: continent.color }}>{continent.name}</p>
                <div className="space-y-2">
                  {[{ label: '지배자', val: continent.topOwner, color: '#c0ccdd' }, { label: '등급', val: `${GRADE_EMOJI[continent.grade as TGrade]} ${continent.grade}급`, color: GRADE_COLORS[continent.grade as TGrade] }, { label: '경매 중', val: `${auctionCount}개`, color: '#ffd700' }, { label: '내 영토', val: `${myCount}개`, color: '#00ff88' }, { label: '점령됨', val: `${occupiedCount}개`, color: '#8b50ff' }, { label: '미점령', val: `${COLS * ROWS - myCount - auctionCount - occupiedCount}개`, color: '#4a5a7a' }].map(s => (
                    <div key={s.label} className="flex justify-between"><span className="text-[#4a5a7a]" style={{ fontSize: 11 }}>{s.label}</span><span className="font-semibold" style={{ fontSize: 11, color: s.color }}>{s.val}</span></div>
                  ))}
                </div>
              </div>
              <div className="px-4 py-3 border-b border-[#1a2438]">
                <p className="text-[#4a5a7a] font-semibold mb-2" style={{ fontSize: 11 }}>점령자 현황</p>
                {OWNERS.map(owner => {
                  const cnt = allTerritories.filter(t => t.owner === owner).length;
                  if (cnt === 0) return null;
                  return (
                    <div key={owner} className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: OWNER_COLORS[owner] }} />
                      <span className="text-[#c0ccdd] flex-1 truncate" style={{ fontSize: 10 }}>{owner}</span>
                      <span style={{ fontSize: 10, color: OWNER_COLORS[owner] }}>{cnt}개</span>
                    </div>
                  );
                })}
              </div>
              <div className="p-3">
                <p className="text-[#4a5a7a] text-center mb-2" style={{ fontSize: 10 }}>영토를 클릭하여 상세 정보 확인</p>
                <button onClick={() => navigate('/app/territory/15-22')} className="w-full h-9 rounded-xl font-bold hover:brightness-110" style={{ background: continent.color, color: '#060a14', fontSize: 12 }}>경매 영토 보기</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
