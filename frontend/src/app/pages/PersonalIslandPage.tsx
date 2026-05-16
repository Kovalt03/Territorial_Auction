import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import { useIsland } from '../hooks/useIsland';
import { storeBuilding as storeBuildingApi, moveBuilding as moveBuildingApi } from '../api/island';
import type { IslandData } from '../types/island';

type BuildingType = 'castle' | 'workshop' | 'barracks' | 'storage' | 'wall' | 'tower' | 'garden' | 'bank' | 'lab' | 'port' | 'mine' | 'empty';

interface Cell {
  type: BuildingType;
  level?: number;
  hp?: number;
  maxHp?: number;
  zone?: 1 | 2 | 3 | 4;
  buildingId?: number;
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

function assignZone(x: number, y: number): 1 | 2 | 3 | 4 {
  if (x >= 9 && x <= 10 && y >= 7 && y <= 8) return 1;
  if (x >= 6 && x <= 13 && y >= 6 && y <= 9) return 2;
  if (x >= 3 && x <= 16 && y >= 3 && y <= 12) return 3;
  return 4;
}

function emptyGrid(): Cell[][] {
  return Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) => ({ type: 'empty' as BuildingType, zone: assignZone(x, y) }))
  );
}

function buildGridFromIsland(island: IslandData): Cell[][] {
  const grid = emptyGrid();
  for (const b of island.buildings) {
    if (b.isDestroyed || b.posY >= ROWS || b.posX >= COLS) continue;
    grid[b.posY][b.posX] = {
      type: b.type.toLowerCase() as BuildingType,
      level: b.level,
      hp: b.hp,
      maxHp: b.maxHp,
      buildingId: b.buildingId,
      zone: assignZone(b.posX, b.posY),
    };
  }
  return grid;
}

export function PersonalIslandPage() {
  const navigate = useNavigate();
  const { ap, gp, username, useGP } = useApp();
  const { island } = useIsland();
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [showBuild, setShowBuild] = useState(false);
  const [grid, setGrid] = useState<Cell[][]>(emptyGrid);

  useEffect(() => {
    if (island) setGrid(buildGridFromIsland(island));
  }, [island]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [buildError, setBuildError] = useState('');
  const [showZones, setShowZones] = useState(true);
  const [activeTab, setActiveTab] = useState<'buildings' | 'resources' | 'units' | 'expand'>('buildings');

  // Building action panel (for occupied cells)
  const [showBuildingAction, setShowBuildingAction] = useState(false);

  // Move mode
  const [moveMode, setMoveMode] = useState(false);
  const [moveSourceCell, setMoveSourceCell] = useState<{ x: number; y: number } | null>(null);

  // Inventory
  const [inventory, setInventory] = useState<{ type: BuildingType; level: number; hp: number; maxHp: number }[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [deployFromInventoryIdx, setDeployFromInventoryIdx] = useState<number | null>(null);

  const selectedCellData = selectedCell ? grid[selectedCell.y]?.[selectedCell.x] : null;

  const cancelModes = () => {
    setMoveMode(false);
    setMoveSourceCell(null);
    setDeployFromInventoryIdx(null);
  };

  const handleCellClick = (x: number, y: number, cell: { type: BuildingType; level?: number; hp?: number; maxHp?: number; zone?: 1 | 2 | 3 | 4 }) => {
    if (moveMode && moveSourceCell) {
      if (cell.type === 'empty') {
        const sourceCell = grid[moveSourceCell.y][moveSourceCell.x];
        const destZone = grid[y][x].zone;
        if (sourceCell.type === 'castle' && destZone !== 1) return;
        if (sourceCell.buildingId) {
          moveBuildingApi(sourceCell.buildingId, x, y).catch(() => {});
        }
        setGrid(prev => {
          const next = prev.map(row => row.map(c => ({ ...c })));
          next[y][x] = { ...next[moveSourceCell.y][moveSourceCell.x], zone: destZone };
          next[moveSourceCell.y][moveSourceCell.x] = { type: 'empty', zone: next[moveSourceCell.y][moveSourceCell.x].zone };
          return next;
        });
        cancelModes();
      }
      return;
    }
    if (deployFromInventoryIdx !== null) {
      if (cell.type === 'empty') {
        const item = inventory[deployFromInventoryIdx];
        const zone = grid[y][x].zone;
        if (item.type === 'castle' && zone !== 1) return;
        setGrid(prev => {
          const next = prev.map(row => row.map(c => ({ ...c })));
          next[y][x] = { type: item.type, level: item.level, hp: item.hp, maxHp: item.maxHp, zone };
          return next;
        });
        setInventory(prev => prev.filter((_, i) => i !== deployFromInventoryIdx));
        setDeployFromInventoryIdx(null);
      }
      return;
    }
    setSelectedCell({ x, y });
    if (cell.type === 'empty') {
      setShowBuild(true);
    } else {
      setShowBuildingAction(true);
    }
  };

  const handleStartMove = () => {
    if (!selectedCell) return;
    setMoveSourceCell(selectedCell);
    setMoveMode(true);
    setShowBuildingAction(false);
  };

  const handleStoreBuilding = () => {
    if (!selectedCell) return;
    const cell = grid[selectedCell.y][selectedCell.x];
    if (cell.type === 'castle') return;
    if (cell.buildingId) {
      storeBuildingApi(cell.buildingId).catch(() => {});
    }
    setInventory(prev => [...prev, { type: cell.type, level: cell.level ?? 1, hp: cell.hp ?? 0, maxHp: cell.maxHp ?? 0 }]);
    setGrid(prev => {
      const next = prev.map(row => row.map(c => ({ ...c })));
      next[selectedCell.y][selectedCell.x] = { type: 'empty', zone: next[selectedCell.y][selectedCell.x].zone };
      return next;
    });
    setShowBuildingAction(false);
  };

  const buildingCosts: Partial<Record<BuildingType, number>> = {
    workshop: 500, barracks: 800, storage: 300, wall: 100, tower: 400,
    garden: 200, bank: 2000, mine: 1500,
  };

  const handleBuild = () => {
    setBuildError('');
    if (!selectedBuilding) { setBuildError('건물을 선택해주세요.'); return; }
    if (!selectedCell) { setBuildError('그리드에서 빈 셀을 선택해주세요.'); return; }
    const cost = buildingCosts[selectedBuilding] ?? 0;
    if (!useGP(cost)) { setBuildError(`GP가 부족합니다. (필요: ${cost} GP)`); return; }
    const maxHpMap: Partial<Record<BuildingType, number>> = {
      workshop: 200, barracks: 300, storage: 150, wall: 400, tower: 200,
      garden: 200, bank: 800, mine: 800,
    };
    const maxHp = maxHpMap[selectedBuilding] ?? 100;
    const zone = selectedCellData?.zone ?? 4;
    setGrid(prev => {
      const next = prev.map(row => row.map(cell => ({ ...cell })));
      next[selectedCell.y][selectedCell.x] = { type: selectedBuilding, level: 1, hp: maxHp, maxHp, zone };
      return next;
    });
    setSelectedBuilding(null);
    setShowBuild(false);
  };

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
          <h1 className="text-[#00ff88] font-bold" style={{ fontSize: 20 }}>나의 섬 · {username || '—'}</h1>
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
            <p className="text-[#00ff88] font-bold" style={{ fontSize: 16 }}>💎 {gp.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[#7788a5]" style={{ fontSize: 10 }}>생산 속도</p>
            <p className="text-[#ffd700] font-bold" style={{ fontSize: 16 }}>+{island?.productionRate ?? 0} GP/분</p>
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

      {/* Mode indicator banners */}
      {moveMode && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0" style={{ background: '#1a1200', borderBottom: '1px solid #ffd70060' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14 }}>🔄</span>
            <span className="text-[#ffd700] font-semibold" style={{ fontSize: 13 }}>
              이동 모드 — 이동할 빈 셀을 클릭하세요
              {moveSourceCell && <span className="text-[#7788a5] ml-2" style={{ fontSize: 11 }}>출발: ({moveSourceCell.x}, {moveSourceCell.y})</span>}
            </span>
          </div>
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border transition-colors" style={{ fontSize: 12, color: '#ffd700', borderColor: '#ffd70060' }}>취소</button>
        </div>
      )}
      {deployFromInventoryIdx !== null && inventory[deployFromInventoryIdx] && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0" style={{ background: '#001a10', borderBottom: '1px solid #00ff8860' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14 }}>📦</span>
            <span className="text-[#00ff88] font-semibold" style={{ fontSize: 13 }}>
              배치 모드 — 배치할 빈 셀을 클릭하세요
              <span className="text-[#7788a5] ml-2" style={{ fontSize: 11 }}>({buildingNames[inventory[deployFromInventoryIdx].type]})</span>
            </span>
          </div>
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border transition-colors" style={{ fontSize: 12, color: '#00ff88', borderColor: '#00ff8860' }}>취소</button>
        </div>
      )}

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
                const isMoveSource = moveSourceCell?.x === x && moveSourceCell?.y === y;
                const isActionTarget = (moveMode || deployFromInventoryIdx !== null) && cell.type === 'empty';
                const zone = cell.zone || 4;
                const bg = isMoveSource ? buildingColors[cell.type] + '80' : cell.type !== 'empty' ? buildingColors[cell.type] + '50' : showZones ? zoneOverlay[zone] : '#0d1220';
                const hpPct = cell.hp && cell.maxHp ? cell.hp / cell.maxHp : 0;
                const hpColor = hpPct > 0.7 ? '#00ff88' : hpPct > 0.4 ? '#ffd700' : '#ff3333';
                return (
                  <div
                    key={`${x}-${y}`}
                    data-cell="true"
                    onClick={() => handleCellClick(x, y, cell)}
                    className="relative cursor-pointer flex flex-col items-center justify-center transition-all hover:brightness-125"
                    style={{
                      width: CELL_SIZE, height: CELL_SIZE, background: bg, borderRadius: 4,
                      border: isMoveSource
                        ? '2px solid #ffd700'
                        : isSelected
                          ? '2px solid #00f5ff'
                          : isActionTarget
                            ? '1px dashed #00ff8880'
                            : showZones ? `1px solid ${zoneBorder[zone]}30` : `1px solid ${cell.type !== 'empty' ? buildingColors[cell.type] + '60' : '#1a2a3a'}`,
                      boxShadow: isMoveSource ? '0 0 6px #ffd700' : isSelected ? '0 0 8px #00f5ff80' : cell.type === 'castle' ? '0 0 6px #ffd70040' : undefined,
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
                      <span style={{ fontSize: 10, color: isActionTarget ? '#00ff8870' : undefined }} className={isActionTarget ? '' : 'text-[#354064] opacity-40'}>
                        {isActionTarget ? '⊕' : '+'}
                      </span>
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
                  <p className="text-[#7788a5]" style={{ fontSize: 11 }}>현재 크기: {island?.gridSize ?? COLS}×{ROWS} ({(island?.gridSize ?? COLS) * ROWS} 타일)</p>
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
            <button onClick={() => { setSelectedCell(null); setShowBuild(true); }} className="w-full h-9 border border-[#00f5ff] rounded-xl text-[#00f5ff] hover:bg-[#00f5ff20] transition-colors" style={{ fontSize: 12 }}>🏗 건물 건설</button>
            <button
              onClick={() => setShowInventory(true)}
              className="relative w-full h-9 border rounded-xl transition-colors hover:bg-[#8b50ff20]"
              style={{ fontSize: 12, borderColor: '#8b50ff', color: '#8b50ff' }}
            >
              📦 보관함
              {inventory.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#8b50ff] text-white flex items-center justify-center" style={{ fontSize: 10 }}>
                  {inventory.length}
                </span>
              )}
            </button>
            <button className="w-full h-9 bg-[#00ff88] rounded-xl text-[#0a0e1a] font-bold hover:brightness-110 transition-all" style={{ fontSize: 12 }}>💎 GP 금고 이전</button>
            <button onClick={() => navigate('/app/map')} className="w-full h-9 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]" style={{ fontSize: 12 }}>🗺 월드맵으로</button>
          </div>
        </div>
      </div>

      {showBuild && (
        <div className="fixed inset-0 flex justify-end z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }} />
          <div className="relative bg-[#1a1f35] border-l-2 border-[#00ff88] w-[520px] flex flex-col overflow-hidden">
            <div className="bg-[#0d1628] px-5 py-4 border-b-2 border-[#00ff88] flex items-center justify-between">
              <div>
                <h3 className="text-[#00ff88] font-bold" style={{ fontSize: 18 }}>🏗 건물 건설</h3>
                {selectedCell
                  ? <p className="text-[#7788a5]" style={{ fontSize: 12 }}>위치: ({selectedCell.x}, {selectedCell.y}) · Zone {selectedCellData?.zone ?? 4} · 보유 GP: {gp.toLocaleString()}</p>
                  : <p className="text-[#7788a5]" style={{ fontSize: 12 }}>빈 셀을 클릭하여 위치를 선택하세요 · 보유 GP: {gp.toLocaleString()}</p>
                }
              </div>
              <button onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }} className="text-[#7788a5] hover:text-[#e0e8ff] text-2xl">✕</button>
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
              ].map(b => {
                const isSelected = selectedBuilding === b.type;
                return (
                  <div
                    key={b.type}
                    onClick={() => setSelectedBuilding(b.type)}
                    className="rounded-xl p-3 flex items-center gap-3 border cursor-pointer transition-all"
                    style={{
                      background: isSelected ? buildingColors[b.type] + '20' : '#2a3050',
                      borderColor: isSelected ? buildingColors[b.type] : buildingColors[b.type] + '60',
                      boxShadow: isSelected ? `0 0 8px ${buildingColors[b.type]}40` : undefined,
                    }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: buildingColors[b.type] + '25' }}>
                      <span style={{ fontSize: 22 }}>{buildingLabels[b.type]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>{b.name}</p>
                      <p className="text-[#7788a5]" style={{ fontSize: 11 }}>{b.desc}</p>
                    </div>
                    <div className="border rounded px-2 py-1" style={{ background: isSelected ? buildingColors[b.type] + '30' : '#1a1f35', borderColor: buildingColors[b.type] }}>
                      <span style={{ fontSize: 12, color: buildingColors[b.type] }}>{b.cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {buildError && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-[#ff004420] border border-[#ff0044]">
                <span className="text-[#ff4466]" style={{ fontSize: 12 }}>⚠ {buildError}</span>
              </div>
            )}
            <div className="border-t border-[#354064] p-4 flex gap-3">
              <button
                onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }}
                className="flex-1 h-12 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]"
                style={{ fontSize: 14 }}
              >
                취소
              </button>
              <button
                onClick={handleBuild}
                disabled={!selectedBuilding}
                className="flex-1 h-12 rounded-xl font-bold transition-all"
                style={{
                  fontSize: 14,
                  background: selectedBuilding ? '#00ff88' : '#2a3050',
                  color: selectedBuilding ? '#0a0e1a' : '#7788a5',
                  border: selectedBuilding ? 'none' : '1px solid #354064',
                  cursor: selectedBuilding ? 'pointer' : 'not-allowed',
                }}
              >
                건설하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───── Building action panel ───── */}
      {showBuildingAction && selectedCell && selectedCellData && selectedCellData.type !== 'empty' && (
        <div className="fixed inset-0 flex items-end justify-center z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBuildingAction(false)} />
          <div className="relative w-full max-w-lg rounded-t-2xl overflow-hidden" style={{ background: '#1a1f35', border: '1px solid #354064', borderBottom: 'none' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: buildingColors[selectedCellData.type] + '20', borderBottom: `2px solid ${buildingColors[selectedCellData.type]}` }}>
              <div>
                <h3 className="font-bold" style={{ fontSize: 18, color: buildingColors[selectedCellData.type] }}>
                  {buildingNames[selectedCellData.type]}
                </h3>
                <p className="text-[#7788a5]" style={{ fontSize: 12 }}>
                  위치: ({selectedCell.x}, {selectedCell.y}) · Zone {selectedCellData.zone} · Lv.{selectedCellData.level}
                </p>
              </div>
              <button onClick={() => setShowBuildingAction(false)} className="text-[#7788a5] hover:text-[#e0e8ff] text-2xl">✕</button>
            </div>

            <div className="px-5 py-3 border-b border-[#354064]">
              <div className="flex justify-between mb-1">
                <span className="text-[#7788a5]" style={{ fontSize: 11 }}>HP</span>
                <span style={{ fontSize: 11, color: buildingColors[selectedCellData.type] }}>{selectedCellData.hp} / {selectedCellData.maxHp}</span>
              </div>
              <div className="h-2 bg-[#0d1220] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${selectedCellData.maxHp ? Math.round((selectedCellData.hp! / selectedCellData.maxHp!) * 100) : 0}%`,
                    background: buildingColors[selectedCellData.type],
                  }}
                />
              </div>
            </div>

            <div className="p-4 flex gap-3">
              <button
                onClick={handleStartMove}
                className="flex-1 h-12 rounded-xl font-semibold border transition-all hover:bg-[#ffd70015]"
                style={{ fontSize: 13, color: '#ffd700', borderColor: '#ffd70060' }}
              >
                🔄 이동하기
              </button>
              <button
                onClick={handleStoreBuilding}
                disabled={selectedCellData.type === 'castle'}
                className="flex-1 h-12 rounded-xl font-semibold border transition-all"
                style={{
                  fontSize: 13,
                  color: selectedCellData.type === 'castle' ? '#354064' : '#8b50ff',
                  borderColor: selectedCellData.type === 'castle' ? '#354064' : '#8b50ff60',
                  cursor: selectedCellData.type === 'castle' ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                }}
                title={selectedCellData.type === 'castle' ? '성은 보관함에 담을 수 없습니다' : ''}
              >
                📦 보관함에 담기
              </button>
              <button
                onClick={() => setShowBuildingAction(false)}
                className="flex-1 h-12 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]"
                style={{ fontSize: 13 }}
              >
                닫기
              </button>
            </div>
            {selectedCellData.type === 'castle' && (
              <p className="text-center text-[#7788a5] pb-3" style={{ fontSize: 11 }}>성(Castle)은 핵심 건물로 보관함에 담을 수 없습니다</p>
            )}
          </div>
        </div>
      )}

      {/* ───── Inventory modal ───── */}
      {showInventory && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowInventory(false)} />
          <div className="relative rounded-2xl overflow-hidden flex flex-col" style={{ width: 480, maxHeight: '70vh', background: '#1a1f35', border: '1.5px solid #8b50ff' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#1a0a35', borderBottom: '2px solid #8b50ff' }}>
              <div>
                <h3 className="text-[#8b50ff] font-bold" style={{ fontSize: 20 }}>📦 보관함</h3>
                <p className="text-[#7788a5]" style={{ fontSize: 12 }}>건물 {inventory.length}개 보관 중 · 배치하기를 눌러 그리드에 재배치</p>
              </div>
              <button onClick={() => setShowInventory(false)} className="text-[#7788a5] hover:text-[#e0e8ff] text-2xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {inventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span style={{ fontSize: 40 }}>📭</span>
                  <p className="text-[#7788a5]" style={{ fontSize: 14 }}>보관함이 비어 있습니다</p>
                  <p className="text-[#354064]" style={{ fontSize: 12 }}>건물 셀을 클릭한 뒤 "보관함에 담기"를 선택하세요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inventory.map((item, idx) => {
                    const color = buildingColors[item.type];
                    const hpPct = item.maxHp > 0 ? item.hp / item.maxHp : 0;
                    return (
                      <div key={idx} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#2a3050', border: `1px solid ${color}50` }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '25', border: `1px solid ${color}60` }}>
                          <span style={{ fontSize: 22 }}>{buildingLabels[item.type]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold" style={{ fontSize: 14, color }}>{buildingNames[item.type]}</p>
                          <p className="text-[#7788a5]" style={{ fontSize: 11 }}>Lv.{item.level}</p>
                          <div className="mt-1 h-1.5 bg-[#1a1f35] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${hpPct * 100}%`, background: color }} />
                          </div>
                          <span className="text-[#7788a5]" style={{ fontSize: 9 }}>HP {item.hp}/{item.maxHp}</span>
                        </div>
                        <button
                          onClick={() => { setDeployFromInventoryIdx(idx); setShowInventory(false); }}
                          className="h-9 px-4 rounded-lg font-semibold transition-all hover:brightness-110"
                          style={{ fontSize: 12, background: color + '30', color, border: `1px solid ${color}` }}
                        >
                          배치하기
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
