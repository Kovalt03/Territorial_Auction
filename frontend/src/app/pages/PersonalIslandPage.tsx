import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';

type BuildingType = 'castle' | 'workshop' | 'barracks' | 'storage' | 'wall' | 'tower' | 'garden' | 'bank' | 'lab' | 'port' | 'mine' | 'empty';

interface Cell {
  type: BuildingType;
  level?: number;
  hp?: number;
  maxHp?: number;
  zone?: 1 | 2 | 3 | 4;
}

const buildingColors: Record<BuildingType, string> = {
  castle: '#ffd700', workshop: '#00ff88', barracks: '#8b50ff', storage: '#00f5ff',
  wall: '#e0e8ff', tower: '#ff8c00', garden: '#00ffaa', bank: '#ffaa00',
  lab: '#ff44cc', port: '#44aaff', mine: '#cc8844', empty: '#1a1f35',
};

const buildingLabels: Record<BuildingType, string> = {
  castle: '🏰', workshop: '⚙', barracks: '⚔', storage: '📦',
  wall: '🧱', tower: '🗼', garden: '🌿', bank: '🏦',
  lab: '🔬', port: '⛵', mine: '⛏', empty: '',
};

const buildingNames: Record<BuildingType, string> = {
  castle: '성', workshop: '생산소', barracks: '병영', storage: '저장소',
  wall: '방벽', tower: '방어탑', garden: '정원', bank: '금고',
  lab: '연구소', port: '항구', mine: '광산', empty: '빈 공간',
};

const COLS = 20;
const ROWS = 16;

const generatePersonalGrid = (): Cell[][] => {
  const grid: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ type: 'empty' as BuildingType }))
  );

  const setCell = (x: number, y: number, type: BuildingType, level: number, hp: number, maxHp: number, zone: 1 | 2 | 3 | 4) => {
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      grid[y][x] = { type, level, hp, maxHp, zone };
    }
  };

  setCell(9, 7, 'castle', 5, 800, 1000, 1); setCell(10, 7, 'castle', 5, 800, 1000, 1);
  setCell(9, 8, 'castle', 5, 800, 1000, 1); setCell(10, 8, 'castle', 5, 800, 1000, 1);

  setCell(7, 6, 'barracks', 4, 280, 300, 2); setCell(8, 6, 'barracks', 4, 280, 300, 2);
  setCell(11, 6, 'barracks', 3, 200, 300, 2); setCell(12, 6, 'barracks', 3, 200, 300, 2);
  setCell(7, 9, 'workshop', 3, 180, 200, 2); setCell(8, 9, 'workshop', 3, 180, 200, 2);
  setCell(11, 9, 'workshop', 3, 160, 200, 2); setCell(12, 9, 'workshop', 3, 160, 200, 2);
  setCell(6, 7, 'wall', 2, 350, 400, 2); setCell(6, 8, 'wall', 2, 350, 400, 2);
  setCell(13, 7, 'wall', 2, 340, 400, 2); setCell(13, 8, 'wall', 2, 340, 400, 2);

  setCell(4, 4, 'tower', 2, 160, 200, 3); setCell(15, 4, 'tower', 2, 155, 200, 3);
  setCell(4, 11, 'tower', 2, 145, 200, 3); setCell(15, 11, 'tower', 2, 150, 200, 3);
  setCell(3, 5, 'storage', 2, 900, 1000, 3); setCell(3, 6, 'storage', 2, 880, 1000, 3);
  setCell(16, 5, 'storage', 2, 870, 1000, 3); setCell(16, 6, 'storage', 2, 860, 1000, 3);
  setCell(3, 9, 'garden', 2, 180, 200, 3); setCell(3, 10, 'garden', 2, 180, 200, 3);
  setCell(16, 9, 'garden', 1, 160, 200, 3); setCell(16, 10, 'garden', 1, 160, 200, 3);
  for (let x = 5; x <= 14; x++) {
    if (x !== 9 && x !== 10) {
      setCell(x, 4, 'wall', 1, 260, 400, 3);
      setCell(x, 11, 'wall', 1, 220, 400, 3);
    }
  }

  setCell(1, 1, 'bank', 3, 600, 800, 4); setCell(2, 1, 'bank', 3, 600, 800, 4);
  setCell(1, 2, 'bank', 3, 600, 800, 4); setCell(2, 2, 'bank', 3, 600, 800, 4);
  setCell(17, 1, 'lab', 2, 400, 500, 4); setCell(18, 1, 'lab', 2, 400, 500, 4);
  setCell(17, 2, 'lab', 2, 380, 500, 4); setCell(18, 2, 'lab', 2, 380, 500, 4);
  setCell(0, 12, 'port', 2, 450, 600, 4); setCell(1, 12, 'port', 2, 450, 600, 4);
  setCell(0, 13, 'port', 2, 440, 600, 4); setCell(1, 13, 'port', 2, 440, 600, 4);
  setCell(17, 13, 'mine', 3, 700, 800, 4); setCell(18, 13, 'mine', 3, 680, 800, 4);
  setCell(17, 14, 'mine', 3, 690, 800, 4); setCell(18, 14, 'mine', 3, 660, 800, 4);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!grid[y][x].zone) {
        const isZone1 = x >= 9 && x <= 10 && y >= 7 && y <= 8;
        const isZone2 = x >= 6 && x <= 13 && y >= 6 && y <= 9;
        const isZone3 = x >= 3 && x <= 16 && y >= 3 && y <= 12;
        grid[y][x].zone = isZone1 ? 1 : isZone2 ? 2 : isZone3 ? 3 : 4;
      }
    }
  }
  return grid;
};

const GRID_DATA = generatePersonalGrid();

function ResourceTicker() {
  const [gp, setGp] = useState(248300);
  useEffect(() => {
    const t = setInterval(() => setGp(prev => prev + 48), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{gp.toLocaleString()}</>;
}

export function PersonalIslandPage() {
  const navigate = useNavigate();
  const { ap } = useApp();
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [showBuild, setShowBuild] = useState(false);
  const [grid] = useState(GRID_DATA);
  const [showZones, setShowZones] = useState(true);
  const [activeTab, setActiveTab] = useState<'buildings' | 'resources' | 'units' | 'expand'>('buildings');

  const selectedCellData = selectedCell ? grid[selectedCell.y]?.[selectedCell.x] : null;

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });

  const ISLAND_W = COLS * 38; // CELL_SIZE(36) + gap(2)
  const ISLAND_H = ROWS * 38;

  const getFitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { z: 1, x: 0, y: 0 };
    const { width, height } = el.getBoundingClientRect();
    const z = Math.min(width / ISLAND_W, height / ISLAND_H) * 0.95;
    return { z, x: (width - ISLAND_W * z) / 2, y: (height - ISLAND_H * z) / 2 };
  }, [ISLAND_W, ISLAND_H]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const { z, x, y } = getFitView();
      setZoom(z);
      setPan({ x, y });
    });
    return () => cancelAnimationFrame(raf);
  }, [getFitView]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom(z => {
      const next = Math.max(0.3, Math.min(5, z * factor));
      const scale = next / z;
      setPan(p => ({ x: mx - (mx - p.x) * scale, y: my - (my - p.y) * scale }));
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

  const zoneOverlay: Record<number, string> = {
    1: 'rgba(255, 215, 0, 0.08)', 2: 'rgba(255, 51, 51, 0.06)',
    3: 'rgba(0, 245, 255, 0.04)', 4: 'rgba(0, 255, 136, 0.03)',
  };
  const zoneBorder: Record<number, string> = {
    1: '#ffd700', 2: '#ff3333', 3: '#00f5ff', 4: '#00ff88',
  };

  const countBuildings = (type: BuildingType) => grid.flat().filter(c => c.type === type).length;

  const buildings = [
    { type: 'castle' as BuildingType, color: '#ffd700', icon: '🏰', gp: 'GP/분 × 0' },
    { type: 'workshop' as BuildingType, color: '#00ff88', icon: '⚙', gp: '+48/분' },
    { type: 'barracks' as BuildingType, color: '#8b50ff', icon: '⚔', gp: '유닛 생산' },
    { type: 'storage' as BuildingType, color: '#00f5ff', icon: '📦', gp: '최대 4,000' },
    { type: 'tower' as BuildingType, color: '#ff8c00', icon: '🗼', gp: '방어 자동' },
    { type: 'bank' as BuildingType, color: '#ffaa00', icon: '🏦', gp: '+22/분' },
    { type: 'lab' as BuildingType, color: '#ff44cc', icon: '🔬', gp: '연구 중' },
    { type: 'port' as BuildingType, color: '#44aaff', icon: '⛵', gp: '무역 +15%' },
    { type: 'mine' as BuildingType, color: '#cc8844', icon: '⛏', gp: '+35/분' },
  ];

  const CELL_SIZE = 36;

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="bg-[#0d1628] border-b border-[#00ff8840] px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => navigate('/app/map')} className="text-[#7788a5] hover:text-[#e0e8ff] mr-1">←</button>
        <div className="w-10 h-10 bg-[#00ff8830] rounded-xl border border-[#00ff88] flex items-center justify-center">
          <span style={{ fontSize: 20 }}>🏝</span>
        </div>
        <div>
          <h1 className="text-[#00ff88] font-bold" style={{ fontSize: 20 }}>나의 섬 · 강남부자</h1>
          <p className="text-[#7788a5]" style={{ fontSize: 12 }}>중앙 대륙 · S급 개인 영토 · 20×16 그리드</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="h-7 px-3 rounded-lg bg-[#ffd70020] border border-[#ffd700] flex items-center">
            <span className="text-[#ffd700] font-bold" style={{ fontSize: 11 }}>S급</span>
          </div>
          <div className="flex items-center gap-1 bg-[#2a3050] border border-[#00ff88] rounded-lg px-2 py-1">
            <div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse" />
            <span className="text-[#00ff88]" style={{ fontSize: 11 }}>안전 보호 중</span>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <div className="text-right">
            <p className="text-[#7788a5]" style={{ fontSize: 10 }}>총 GP 보유</p>
            <p className="text-[#00ff88] font-bold" style={{ fontSize: 16 }}>💎 <ResourceTicker /></p>
          </div>
          <div className="text-right">
            <p className="text-[#7788a5]" style={{ fontSize: 10 }}>생산 속도</p>
            <p className="text-[#ffd700] font-bold" style={{ fontSize: 16 }}>+105 GP/분</p>
          </div>
          <div className="text-right">
            <p className="text-[#7788a5]" style={{ fontSize: 10 }}>총 방어력</p>
            <p className="text-[#ff3333] font-bold" style={{ fontSize: 16 }}>4,820</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className="w-10 h-5 rounded-full relative transition-colors"
              style={{ background: showZones ? '#00ff8840' : '#2a3050', border: `1px solid ${showZones ? '#00ff88' : '#354064'}` }}
              onClick={() => setShowZones(p => !p)}
            >
              <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ background: showZones ? '#00ff88' : '#7788a5', left: showZones ? 20 : 2 }} />
            </div>
            <span className="text-[#7788a5]" style={{ fontSize: 11 }}>존 표시</span>
          </label>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden bg-[#070c18]">
          {/* Legend bar */}
          <div className="px-4 pt-3 pb-2 flex justify-between items-center flex-shrink-0">
            <div className="flex gap-3">
              {[4, 3, 2, 1].map(z => (
                <div key={z} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm border" style={{ background: zoneOverlay[z], borderColor: zoneBorder[z] }} />
                  <span className="text-[#7788a5]" style={{ fontSize: 10 }}>Zone {z}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#7788a5]" style={{ fontSize: 10 }}>
                {selectedCell ? `선택: (${selectedCell.x}, ${selectedCell.y}) - ${buildingNames[selectedCellData?.type || 'empty']}` : '셀을 클릭하여 선택'}
              </span>
              <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="w-6 h-6 bg-[#1a2438] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white text-xs flex items-center justify-center">+</button>
              <button onClick={() => setZoom(z => Math.max(0.3, z / 1.2))} className="w-6 h-6 bg-[#1a2438] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white text-xs flex items-center justify-center">−</button>
              <button onClick={() => { const { z, x, y } = getFitView(); setZoom(z); setPan({ x, y }); }} className="w-6 h-6 bg-[#1a2438] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white text-xs flex items-center justify-center">⊡</button>
            </div>
          </div>

          {/* Pan/zoom viewport */}
          <div
            ref={containerRef}
            className="flex-1 relative overflow-hidden"
            style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`, gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`, gap: 2, width: COLS * (CELL_SIZE + 2) }}>
            {grid.map((row, y) =>
              row.map((cell, x) => {
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                const zone = cell.zone || 4;
                const bg = cell.type !== 'empty' ? buildingColors[cell.type] + '50' : showZones ? zoneOverlay[zone] : '#0d1220';
                const hpPct = cell.hp && cell.maxHp ? cell.hp / cell.maxHp : 0;
                const hpColor = hpPct > 0.7 ? '#00ff88' : hpPct > 0.4 ? '#ffd700' : '#ff3333';
                return (
                  <div
                    key={`${x}-${y}`}
                    data-cell="true"
                    onClick={() => { setSelectedCell({ x, y }); if (cell.type === 'empty') setShowBuild(true); }}
                    className="relative cursor-pointer flex flex-col items-center justify-center transition-all hover:brightness-125"
                    style={{
                      width: CELL_SIZE, height: CELL_SIZE, background: bg, borderRadius: 4,
                      border: isSelected ? '2px solid #00f5ff' : showZones ? `1px solid ${zoneBorder[zone]}30` : `1px solid ${cell.type !== 'empty' ? buildingColors[cell.type] + '60' : '#1a2a3a'}`,
                      boxShadow: isSelected ? '0 0 8px #00f5ff80' : cell.type === 'castle' ? '0 0 6px #ffd70040' : undefined,
                    }}
                  >
                    {cell.type !== 'empty' ? (
                      <>
                        <span style={{ fontSize: 14, lineHeight: 1 }}>{buildingLabels[cell.type]}</span>
                        {cell.level && (
                          <div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 rounded-full overflow-hidden" style={{ background: '#0a0e1a' }}>
                            <div className="h-full rounded-full" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
                          </div>
                        )}
                        {cell.level && (
                          <div className="absolute top-0 right-0 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: buildingColors[cell.type], fontSize: 6 }}>
                            {cell.level}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-[#354064] opacity-40" style={{ fontSize: 10 }}>+</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
            </div>
          </div>
        </div>

        <div className="w-[260px] bg-[#0d1220] border-l border-[#1e2a3d] flex flex-col flex-shrink-0">
          <div className="flex border-b border-[#1e2a3d]">
            {(['buildings', 'resources', 'units', 'expand'] as const).map(tabId => (
              <button key={tabId} onClick={() => setActiveTab(tabId)} className="flex-1 py-2.5 transition-colors" style={{ fontSize: 11, color: activeTab === tabId ? '#00ff88' : '#7788a5', borderBottom: activeTab === tabId ? '2px solid #00ff88' : '2px solid transparent', background: activeTab === tabId ? '#00ff8810' : 'transparent' }}>
                {{ buildings: '건물', resources: '자원', units: '유닛', expand: '확장' }[tabId]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'buildings' && (
              <div className="p-3 space-y-2">
                {buildings.map(b => {
                  const count = countBuildings(b.type);
                  return (
                    <div key={b.type} className="bg-[#12192c] rounded-xl p-2.5 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: b.color + '25', border: `1px solid ${b.color}50` }}>
                        <span style={{ fontSize: 16 }}>{b.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 12, color: b.color }}>{buildingNames[b.type]}</span>
                          <span className="text-[#7788a5]" style={{ fontSize: 10 }}>×{count}</span>
                        </div>
                        <p className="text-[#7788a5]" style={{ fontSize: 10 }}>{b.gp}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'resources' && (
              <div className="p-3 space-y-3">
                <div className="bg-[#12192c] rounded-xl p-3">
                  <div className="flex justify-between mb-2"><span className="text-[#ffd700] font-semibold" style={{ fontSize: 12 }}>⚡ AP</span><span className="text-[#ffd700] font-bold" style={{ fontSize: 14 }}>{ap.toLocaleString()}</span></div>
                  <div className="bg-[#1a1f35] h-2 rounded-full overflow-hidden"><div className="h-full bg-[#ffd700] rounded-full" style={{ width: '62%' }} /></div>
                </div>
                <div className="bg-[#12192c] rounded-xl p-3">
                  <div className="flex justify-between mb-1"><span className="text-[#00ff88] font-semibold" style={{ fontSize: 12 }}>💎 GP 생산</span><span className="text-[#00ff88] font-bold" style={{ fontSize: 14 }}>+105/분</span></div>
                  <div className="space-y-1 mt-2">
                    {[{ src: '생산소 ×4', val: '+48', color: '#00ff88' }, { src: '금고 ×2', val: '+22', color: '#ffaa00' }, { src: '광산 ×4', val: '+35', color: '#cc8844' }].map(r => (
                      <div key={r.src} className="flex justify-between"><span className="text-[#7788a5]" style={{ fontSize: 10 }}>{r.src}</span><span style={{ fontSize: 10, color: r.color }}>{r.val}/분</span></div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#12192c] rounded-xl p-3">
                  <p className="text-[#ff44cc] font-semibold mb-2" style={{ fontSize: 12 }}>🔬 연구 현황</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 11 }}>방어력 강화 Lv.3</p>
                  <div className="bg-[#1a1f35] h-1.5 rounded-full overflow-hidden mt-1"><div className="h-full bg-[#ff44cc] rounded-full" style={{ width: '45%' }} /></div>
                  <p className="text-[#7788a5]" style={{ fontSize: 9 }}>완료까지 약 4시간</p>
                </div>
              </div>
            )}
            {activeTab === 'units' && (
              <div className="p-3 space-y-2">
                <p className="text-[#7788a5] font-semibold" style={{ fontSize: 12 }}>주둔 유닛</p>
                {[
                  { label: '보병', icon: '🗡', owned: 24, max: 40, color: '#e0e8ff', attack: 25 },
                  { label: '궁수', icon: '🏹', owned: 12, max: 30, color: '#00ff88', attack: 30 },
                  { label: '기사', icon: '⚔', owned: 5, max: 15, color: '#ffd700', attack: 80 },
                  { label: '마법사', icon: '🔮', owned: 3, max: 10, color: '#ff44cc', attack: 120 },
                  { label: '발리스타', icon: '🎯', owned: 2, max: 5, color: '#ff8c00', attack: 200 },
                ].map(u => (
                  <div key={u.label} className="bg-[#12192c] rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 16 }}>{u.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span style={{ fontSize: 12, color: u.color }}>{u.label}</span>
                          <span className="text-[#7788a5]" style={{ fontSize: 11 }}>{u.owned}/{u.max}</span>
                        </div>
                        <p className="text-[#7788a5]" style={{ fontSize: 9 }}>공격력 {u.attack}</p>
                      </div>
                    </div>
                    <div className="bg-[#1a1f35] h-1.5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(u.owned / u.max) * 100}%`, background: u.color }} /></div>
                  </div>
                ))}
                <button className="w-full h-9 border border-[#8b50ff] rounded-xl text-[#8b50ff] hover:bg-[#8b50ff20] transition-colors" style={{ fontSize: 12 }}>유닛 훈련하기</button>
              </div>
            )}
            {activeTab === 'expand' && (
              <div className="p-3 space-y-3">
                <div className="bg-[#00ff8820] border border-[#00ff88] rounded-xl p-3">
                  <p className="text-[#00ff88] font-semibold" style={{ fontSize: 12 }}>섬 현황</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 11 }}>현재 크기: 20×16 (320 타일)</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 11 }}>빈 타일: {grid.flat().filter(c => c.type === 'empty').length}개</p>
                </div>
                {[
                  { label: '동쪽 확장 (+4열)', cost: '5,000 AP', color: '#00f5ff', desc: '80 타일 추가' },
                  { label: '서쪽 확장 (+4열)', cost: '5,000 AP', color: '#00f5ff', desc: '80 타일 추가' },
                  { label: '남쪽 확장 (+4행)', cost: '4,000 AP', color: '#8b50ff', desc: '96 타일 추가' },
                  { label: '섬 합병 (다른 섬)', cost: '20,000 AP', color: '#ffd700', desc: '인접 섬 흡수' },
                ].map(item => (
                  <div key={item.label} className="bg-[#12192c] rounded-xl p-3">
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: 12, color: item.color }}>{item.label}</span>
                      <span style={{ fontSize: 12, color: item.color }}>{item.cost}</span>
                    </div>
                    <p className="text-[#7788a5]" style={{ fontSize: 10 }}>{item.desc}</p>
                    <button className="mt-2 w-full h-7 rounded-lg border font-bold" style={{ fontSize: 11, borderColor: item.color, color: item.color }}>확장</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[#1e2a3d] space-y-2">
            <button onClick={() => setShowBuild(true)} className="w-full h-9 border border-[#00f5ff] rounded-xl text-[#00f5ff] hover:bg-[#00f5ff20] transition-colors" style={{ fontSize: 12 }}>🏗 건물 건설</button>
            <button className="w-full h-9 bg-[#00ff88] rounded-xl text-[#0a0e1a] font-bold hover:brightness-110 transition-all" style={{ fontSize: 12 }}>💎 GP 금고 이전</button>
            <button onClick={() => navigate('/app/map')} className="w-full h-9 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]" style={{ fontSize: 12 }}>🗺 월드맵으로</button>
          </div>
        </div>
      </div>

      {showBuild && (
        <div className="fixed inset-0 flex justify-end z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowBuild(false)} />
          <div className="relative bg-[#1a1f35] border-l-2 border-[#00ff88] w-[520px] flex flex-col overflow-hidden">
            <div className="bg-[#0d1628] px-5 py-4 border-b-2 border-[#00ff88] flex items-center justify-between">
              <div>
                <h3 className="text-[#00ff88] font-bold" style={{ fontSize: 18 }}>🏗 건물 건설</h3>
                {selectedCell && <p className="text-[#7788a5]" style={{ fontSize: 12 }}>위치: ({selectedCell.x}, {selectedCell.y}) · Zone {selectedCellData?.zone ?? 4}</p>}
              </div>
              <button onClick={() => setShowBuild(false)} className="text-[#7788a5] hover:text-[#e0e8ff] text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {[
                { type: 'workshop' as BuildingType, name: '생산소 (Workshop)', desc: 'GP 생산 +20/분', cost: '500 GP' },
                { type: 'barracks' as BuildingType, name: '병영 (Barracks)', desc: '유닛 훈련 및 배치', cost: '800 GP' },
                { type: 'storage' as BuildingType, name: '저장소 (Storage)', desc: '자원 1,000 GP 보관', cost: '300 GP' },
                { type: 'wall' as BuildingType, name: '방벽 (Wall)', desc: 'Zone 방어력 +50', cost: '100 GP' },
                { type: 'tower' as BuildingType, name: '방어탑 (Tower)', desc: '자동 방어 공격', cost: '400 GP' },
                { type: 'garden' as BuildingType, name: '정원 (Garden)', desc: '행복도 +5, GP 보너스 +3%', cost: '200 GP' },
                { type: 'bank' as BuildingType, name: '금고 (Bank)', desc: 'GP 이자 +22/분', cost: '2,000 GP' },
                { type: 'mine' as BuildingType, name: '광산 (Mine)', desc: 'GP 채굴 +35/분', cost: '1,500 GP' },
              ].map(b => (
                <div key={b.type} className="rounded-xl p-3 flex items-center gap-3 border cursor-pointer hover:brightness-110 transition-colors" style={{ background: '#2a3050', borderColor: buildingColors[b.type] + '80' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: buildingColors[b.type] + '25' }}>
                    <span style={{ fontSize: 22 }}>{buildingLabels[b.type]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>{b.name}</p>
                    <p className="text-[#7788a5]" style={{ fontSize: 11 }}>{b.desc}</p>
                  </div>
                  <div className="bg-[#2a3050] border rounded px-2 py-1" style={{ borderColor: buildingColors[b.type] }}>
                    <span style={{ fontSize: 12, color: buildingColors[b.type] }}>{b.cost}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#354064] p-4 flex gap-3">
              <button onClick={() => setShowBuild(false)} className="flex-1 h-12 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]" style={{ fontSize: 14 }}>취소</button>
              <button onClick={() => setShowBuild(false)} className="flex-1 h-12 bg-[#00ff88] rounded-xl text-[#0a0e1a] font-bold hover:brightness-110" style={{ fontSize: 14 }}>건설하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
