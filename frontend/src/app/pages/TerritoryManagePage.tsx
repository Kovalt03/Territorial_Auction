import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import { fetchTerritoryDetail, fetchTerritoryBuildings, placeBuilding, collectTerritory } from '../api/map';
import { storeBuilding, upgradeBuilding } from '../api/island';
import { fetchUnits, deployUnit, recallUnit } from '../api/military';
import { fetchInventory, useItem } from '../api/item';
import { ApiError } from '../api/client';
import { GRADE_COLOR } from '../types/grade';
import type { TerritoryDetailResponse } from '../types/territory';
import type { UnitInfo } from '../types/military';
import type { UserItemInfo } from '../types/item';

type BuildingType =
  | 'castle' | 'workshop' | 'barracks' | 'storage'
  | 'wall' | 'tower' | 'farmland' | 'residence' | 'empty';

interface Cell {
  type: BuildingType;
  level?: number;
  hp?: number;
  maxHp?: number;
  zone?: 1 | 2 | 3;
  buildingId?: number;
  isBody?: boolean;
  width?: number;
  height?: number;
}

const buildingColors: Record<BuildingType, string> = {
  castle: '#ffd700', workshop: '#00ff88', barracks: '#8b50ff', storage: '#00f5ff',
  wall: '#e0e8ff', tower: '#ff8c00', farmland: '#66cc44', residence: '#44aaff', empty: '#1a1f35',
};
const buildingLabels: Record<BuildingType, string> = {
  castle: '🏰', workshop: '⚙', barracks: '⚔', storage: '📦',
  wall: '🧱', tower: '🗼', farmland: '🌾', residence: '🏠', empty: '',
};
const buildingNames: Record<BuildingType, string> = {
  castle: '성', workshop: '생산소', barracks: '병영', storage: '저장소',
  wall: '방벽', tower: '방어탑', farmland: '농지', residence: '주거지', empty: '빈 공간',
};

// 백엔드 building_types 시드 순서 기준 ID 매핑 (building-types.yml)
const BUILDING_TYPE_ID: Partial<Record<BuildingType, number>> = {
  castle: 1, storage: 2, workshop: 3, barracks: 4, wall: 5, tower: 6, farmland: 7, residence: 8,
};

const BUILD_OPTIONS: { type: BuildingType; cost: string; desc: string; available: boolean }[] = [
  { type: 'castle', cost: '5,000 GP', desc: 'GP 생산 +10/분, Zone 1 전용', available: true },
  { type: 'storage', cost: '1,000 GP', desc: '자원 보관 증가', available: true },
  { type: 'workshop', cost: '1,500 GP', desc: 'GP 생산 +50/분', available: true },
  { type: 'barracks', cost: '2,000 GP', desc: '유닛 수용력 증가', available: true },
  { type: 'wall', cost: '300 GP', desc: '방어력 +30', available: true },
  { type: 'tower', cost: '600 GP', desc: '방어력 +60', available: true },
  { type: 'farmland', cost: '800 GP', desc: '식량 생산 +10/분, Zone 2 전용', available: true },
  { type: 'residence', cost: '1,200 GP', desc: '유닛 수용력 +5/레벨', available: true },
];

const UNIT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  INFANTRY: { label: '보병', icon: '🗡', color: '#e0e8ff' },
  ARCHER: { label: '궁수', icon: '🏹', color: '#00ff88' },
  KNIGHT: { label: '기사', icon: '⚔', color: '#ffd700' },
};

function assignZone(x: number, y: number, size: number): 1 | 2 | 3 {
  const center = Math.floor(size / 2);
  const dist = Math.max(Math.abs(x - center), Math.abs(y - center));
  const z1 = Math.max(1, Math.floor(size * 0.15));
  const z2 = Math.max(2, Math.floor(size * 0.40));
  if (dist <= z1) return 1;
  if (dist <= z2) return 2;
  return 3;
}

function emptyGrid(size: number): Cell[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({ type: 'empty' as BuildingType, zone: assignZone(x, y, size) }))
  );
}

const zoneOverlay: Record<number, string> = {
  1: 'rgba(255, 215, 0, 0.08)', 2: 'rgba(255, 51, 51, 0.06)', 3: 'rgba(0, 245, 255, 0.04)',
};
const zoneBorder: Record<number, string> = { 1: '#ffd700', 2: '#ff3333', 3: '#00f5ff' };

const CELL_SIZE = 36;

export function TerritoryManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { gp, syncGP } = useApp();
  const territoryId = Number(id);

  const [territory, setTerritory] = useState<TerritoryDetailResponse | null>(null);
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid(10));
  const [activeTab, setActiveTab] = useState<'buildings' | 'units' | 'items'>('buildings');
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [showBuild, setShowBuild] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [buildError, setBuildError] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [showBuildingAction, setShowBuildingAction] = useState(false);
  const [buildPending, setBuildPending] = useState(false);

  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [deployTypeId, setDeployTypeId] = useState<number | null>(null);
  const [deployQty, setDeployQty] = useState(1);
  const [recallTypeId, setRecallTypeId] = useState<number | null>(null);
  const [recallQty, setRecallQty] = useState(1);

  const [items, setItems] = useState<UserItemInfo[]>([]);
  const [usingItemId, setUsingItemId] = useState<number | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const showToast = useCallback((message: string, isError = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, isError });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const reloadBuildings = useCallback(() => {
    fetchTerritoryBuildings(territoryId).then(res => {
      const size = territory?.gridSize ?? 10;
      const g = emptyGrid(size);
      for (const b of res.buildings) {
        if (b.isDestroyed) continue;
        const type = b.type.toLowerCase() as BuildingType;
        const w = b.width ?? 1;
        const h = b.height ?? 1;
        for (let dy = 0; dy < h; dy++) {
          for (let dx = 0; dx < w; dx++) {
            const gx = b.posX + dx;
            const gy = b.posY + dy;
            if (gy < size && gx < size) {
              g[gy][gx] = {
                type, level: b.level, hp: b.hp, maxHp: b.maxHp,
                buildingId: b.buildingId, zone: b.zone as 1 | 2 | 3,
                isBody: dx > 0 || dy > 0, width: w, height: h,
              };
            }
          }
        }
      }
      setGrid(g);
    }).catch(() => {});
  }, [territoryId, territory?.gridSize]);

  const reloadUnits = useCallback(() => {
    fetchUnits().then(res => {
      setUnits(res.units);
      if (deployTypeId === null && res.units.length > 0) setDeployTypeId(res.units[0].unitTypeId);
      if (recallTypeId === null && res.units.length > 0) setRecallTypeId(res.units[0].unitTypeId);
    }).catch(() => {});
  }, [deployTypeId, recallTypeId]);

  useEffect(() => {
    fetchTerritoryDetail(territoryId).then(setTerritory).catch(() => {});
    fetchUnits().then(res => {
      setUnits(res.units);
      if (res.units.length > 0) {
        setDeployTypeId(prev => prev ?? res.units[0].unitTypeId);
        setRecallTypeId(prev => prev ?? res.units[0].unitTypeId);
      }
    }).catch(() => {});
    fetchInventory().then(res => setItems(res.items)).catch(() => {});
  }, [territoryId]);

  useEffect(() => {
    if (territory) reloadBuildings();
  }, [territory, reloadBuildings]);

  const gridSize = territory?.gridSize ?? 10;
  const GRID_W = gridSize * (CELL_SIZE + 2);
  const GRID_H = gridSize * (CELL_SIZE + 2);

  const getFitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { z: 1, x: 0, y: 0 };
    const { width, height } = el.getBoundingClientRect();
    const z = Math.min(width / GRID_W, height / GRID_H) * 0.92;
    return { z, x: (width - GRID_W * z) / 2, y: (height - GRID_H * z) / 2 };
  }, [GRID_W, GRID_H]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const { z, x, y } = getFitView();
      setZoom(z); setPan({ x, y });
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

  const handleCellClick = (x: number, y: number, cell: Cell) => {
    if (buildPending) {
      if (cell.type === 'empty') {
        setSelectedCell({ x, y });
        setBuildPending(false);
        setShowBuild(true);
      }
      return;
    }
    setSelectedCell({ x, y });
    if (cell.type === 'empty') setShowBuild(true);
    else setShowBuildingAction(true);
  };

  const handleBuild = async () => {
    if (!selectedBuilding || !selectedCell || isBuilding) return;
    const typeId = BUILDING_TYPE_ID[selectedBuilding];
    if (!typeId) return;
    setIsBuilding(true);
    setBuildError('');
    try {
      const res = await placeBuilding(territoryId, typeId, selectedCell.x, selectedCell.y);
      syncGP(res.gpRemaining);
      setSelectedBuilding(null);
      setShowBuild(false);
      reloadBuildings();
      showToast('건물 설치 완료');
    } catch (err) {
      setBuildError(err instanceof ApiError ? err.message : '건설에 실패했습니다.');
    } finally {
      setIsBuilding(false);
    }
  };

  const selectedCellData = selectedCell ? grid[selectedCell.y]?.[selectedCell.x] : null;

  const handleUpgrade = async () => {
    const buildingId = selectedCellData?.buildingId;
    if (!buildingId) return;
    try {
      const res = await upgradeBuilding(buildingId);
      syncGP(res.gpRemaining);
      reloadBuildings();
      setShowBuildingAction(false);
      showToast(`Lv.${res.newLevel}으로 업그레이드 완료`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '업그레이드 실패', true);
    }
  };

  const handleStore = async () => {
    const buildingId = selectedCellData?.buildingId;
    if (!buildingId) return;
    try {
      await storeBuilding(buildingId);
      reloadBuildings();
      setShowBuildingAction(false);
      showToast('보관함에 담았습니다');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '보관 실패', true);
    }
  };

  const handleDeploy = async () => {
    if (!deployTypeId) return;
    try {
      const res = await deployUnit(territoryId, deployTypeId, deployQty);
      showToast(`${res.deployedCount}기 배치 완료`);
      reloadUnits();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '배치 실패', true);
    }
  };

  const handleRecall = async () => {
    if (!recallTypeId) return;
    try {
      const res = await recallUnit(territoryId, recallTypeId, recallQty);
      showToast(`${res.recalledCount}기 철수 완료`);
      reloadUnits();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '철수 실패', true);
    }
  };

  const handleUseItem = async (item: UserItemInfo) => {
    setUsingItemId(item.userItemId);
    try {
      await useItem(item.itemId, territoryId);
      showToast(`${item.itemName} 사용 완료`);
      fetchInventory().then(res => setItems(res.items)).catch(() => {});
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '아이템 사용 실패', true);
    } finally {
      setUsingItemId(null);
    }
  };

  const handleCollect = async () => {
    setIsCollecting(true);
    try {
      const res = await collectTerritory(territoryId);
      setTerritory(prev => prev ? { ...prev, storedGp: res.storedGp, productionRatePerMin: res.productionRatePerMin, lastProducedAt: res.lastProducedAt, storageCapacity: res.storageCapacity } : prev);
      showToast(`${res.creditedGp.toLocaleString()} GP 수령 완료`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '수령에 실패했습니다.', true);
    } finally {
      setIsCollecting(false);
    }
  };

  const gradeColor = territory
    ? (GRADE_COLOR[territory.grade as keyof typeof GRADE_COLOR] ?? '#8892b0')
    : '#8892b0';

  const countBuildings = (type: BuildingType) => grid.flat().filter(c => c.type === type).length;
  const territoryItems = items.filter(i => i.itemType === 'INVINCIBILITY');

  return (
    <div className="page-root">
      <GNB />

      {toast && (
        <div className="fixed top-5 left-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold"
          style={{ transform: 'translateX(-50%)', background: toast.isError ? '#1a0a0a' : '#0a1a0f', border: `1.5px solid ${toast.isError ? '#ff3333' : '#00ff88'}`, color: toast.isError ? '#ff6666' : '#00ff88', animation: 'fadeInDown 0.2s ease' }}>
          <span>{toast.isError ? '⚠' : '✓'}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {buildPending && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[#00f5ff60]" style={{ background: '#001020' }}>
          <span className="font-semibold text-[13px]" style={{ color: '#00f5ff' }}>🏗 건설 위치 선택 — 빈 셀을 클릭하세요</span>
          <button onClick={() => setBuildPending(false)} className="h-7 px-3 rounded-lg border text-xs" style={{ borderColor: '#00f5ff60', color: '#00f5ff' }}>취소</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface border-b border-outline px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="text-muted hover:text-foreground">←</button>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
          style={{ background: gradeColor + '30', border: `1px solid ${gradeColor}60`, color: gradeColor }}>
          {territory?.grade ?? '?'}
        </div>
        <div>
          <h1 className="text-foreground font-bold text-xl">영토 #{territoryId} 관리</h1>
          {territory && <p className="text-muted text-xs">({territory.coordX}, {territory.coordY}) · {territory.continentName} · {gridSize}×{gridSize} 그리드</p>}
        </div>
        <div className="ml-auto flex items-center gap-4">
          {territory?.storedGp != null && (
            <div className="text-right">
              <p className="text-muted text-[10px]">Storage GP <span className="text-[9px]">(+{territory.productionRatePerMin ?? 0}/분)</span></p>
              <div className="flex items-center gap-2">
                <p className="font-bold text-base" style={{ color: '#00ff88' }}>
                  🏦 {territory.storedGp.toLocaleString()}
                  {territory.storageCapacity != null && (
                    <span className="text-muted font-normal text-[10px]"> / {territory.storageCapacity.toLocaleString()}</span>
                  )}
                </p>
                <button onClick={() => void handleCollect()} disabled={isCollecting || territory.storedGp === 0}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold disabled:opacity-50"
                  style={{ background: '#00ff8820', color: '#00ff88', border: '1px solid #00ff8860' }}>
                  {isCollecting ? '...' : '수령'}
                </button>
              </div>
            </div>
          )}
          <div className="text-right">
            <p className="text-muted text-[10px]">보유 GP</p>
            <p className="text-gp font-bold text-base">💎 {gp.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Grid viewport */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#070c18]">
          <div className="px-4 pt-3 pb-2 flex justify-between items-center flex-shrink-0">
            <div className="flex gap-3">
              {[3, 2, 1].map(z => (
                <div key={z} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm border" style={{ background: zoneOverlay[z], borderColor: zoneBorder[z] }} />
                  <span className="text-muted text-[10px]">Zone {z}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted text-[10px]">
                {selectedCell ? `(${selectedCell.x}, ${selectedCell.y}) — ${buildingNames[selectedCellData?.type ?? 'empty']}` : '셀 클릭으로 선택'}
              </span>
              <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="w-6 h-6 bg-[#1a2438] border border-[#2a3a5a] rounded text-muted text-xs flex items-center justify-center">+</button>
              <button onClick={() => setZoom(z => Math.max(0.3, z / 1.2))} className="w-6 h-6 bg-[#1a2438] border border-[#2a3a5a] rounded text-muted text-xs flex items-center justify-center">−</button>
              <button onClick={() => { const { z, x, y } = getFitView(); setZoom(z); setPan({ x, y }); }} className="w-6 h-6 bg-[#1a2438] border border-[#2a3a5a] rounded text-muted text-xs flex items-center justify-center">⊡</button>
            </div>
          </div>
          <div ref={containerRef} className="flex-1 relative overflow-hidden"
            style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE}px)`, gridTemplateRows: `repeat(${gridSize}, ${CELL_SIZE}px)`, gap: 2 }}>
                {grid.map((row, y) => row.map((cell, x) => {
                  const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                  const isPendingTarget = buildPending && cell.type === 'empty';
                  const zone = cell.zone ?? 3;
                  const bg = cell.type !== 'empty' ? buildingColors[cell.type] + '50' : zoneOverlay[zone];
                  const hpPct = cell.hp && cell.maxHp ? cell.hp / cell.maxHp : 0;
                  const hpColor = hpPct > 0.7 ? '#00ff88' : hpPct > 0.4 ? '#ffd700' : '#ff3333';
                  return (
                    <div key={`${x}-${y}`} data-cell="true"
                      onClick={() => handleCellClick(x, y, cell)}
                      className="relative cursor-pointer flex flex-col items-center justify-center transition-all hover:brightness-125"
                      style={{
                        width: CELL_SIZE, height: CELL_SIZE, background: bg, borderRadius: 4,
                        border: isSelected ? '2px solid #00f5ff' : isPendingTarget ? '1px dashed #00ff8880' : `1px solid ${cell.type !== 'empty' ? buildingColors[cell.type] + '60' : zoneBorder[zone] + '30'}`,
                        boxShadow: isSelected ? '0 0 8px #00f5ff80' : cell.type === 'castle' ? '0 0 6px #ffd70040' : undefined,
                      }}>
                      {cell.type !== 'empty' ? (
                        <>
                          {!cell.isBody && <span className="text-sm leading-none">{buildingLabels[cell.type]}</span>}
                          {!cell.isBody && cell.level != null && (
                            <div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 rounded-full overflow-hidden" style={{ background: '#0a0e1a' }}>
                              <div className="h-full rounded-full" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
                            </div>
                          )}
                          {!cell.isBody && cell.level != null && (
                            <div className="absolute top-0 right-0 w-3 h-3 rounded-full flex items-center justify-center text-[6px]" style={{ background: buildingColors[cell.type] }}>{cell.level}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] opacity-40" style={{ color: isPendingTarget ? '#00ff88' : '#354064' }}>{isPendingTarget ? '⊕' : '+'}</span>
                      )}
                    </div>
                  );
                }))}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-[260px] bg-surface border-l border-outline flex flex-col flex-shrink-0">
          <div className="flex border-b border-outline">
            {(['buildings', 'units', 'items'] as const).map(tabId => (
              <button key={tabId} onClick={() => setActiveTab(tabId)}
                className={`flex-1 py-2.5 text-[11px] transition-colors border-b-2 ${activeTab === tabId ? 'text-primary border-primary bg-[#00f5ff10]' : 'text-muted border-transparent bg-transparent'}`}>
                {{ buildings: '건물', units: '유닛', items: '아이템' }[tabId]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'buildings' && (
              <div className="p-3 space-y-2">
                {BUILD_OPTIONS.map(b => {
                  const count = countBuildings(b.type);
                  const color = buildingColors[b.type];
                  return (
                    <div key={b.type} className="bg-[#12192c] rounded-xl p-2.5 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '25', border: `1px solid ${color}50` }}>
                        <span className="text-base">{buildingLabels[b.type]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color }}>{buildingNames[b.type]}</span>
                          <span className="text-muted text-[10px]">×{count}</span>
                        </div>
                        <p className="text-muted text-[10px]">{b.cost}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'units' && (
              <div className="p-3 space-y-2">
                <p className="text-muted font-semibold text-xs mb-1">이 영토 유닛 관리</p>
                {units.length === 0 ? (
                  <p className="text-muted text-xs text-center py-4">보유 유닛 없음</p>
                ) : units.map(u => {
                  const meta = UNIT_LABELS[u.name] ?? { label: u.name, icon: '⚔', color: '#e0e8ff' };
                  return (
                    <div key={u.unitTypeId} className="bg-[#12192c] rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{meta.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="text-xs" style={{ color: meta.color }}>{meta.label}</span>
                            <span className="text-muted text-[11px]">{u.quantity}개</span>
                          </div>
                          <p className="text-muted text-[9px]">대기 {u.idleCount} · 배치 {u.deployedCount}</p>
                        </div>
                      </div>
                      {u.quantity > 0 && (
                        <div className="bg-panel h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round((u.deployedCount / u.quantity) * 100)}%`, background: meta.color }} />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-[#12192c] rounded-xl p-2.5 space-y-1.5">
                    <p className="text-primary text-[10px] font-semibold">배치</p>
                    <select value={deployTypeId ?? ''} onChange={e => setDeployTypeId(Number(e.target.value))}
                      className="w-full p-1 rounded text-[10px]"
                      style={{ background: '#2a3050', color: '#e0e8ff', border: '1px solid #354064' }}>
                      {units.map(u => <option key={u.unitTypeId} value={u.unitTypeId}>{u.name.slice(0,3)} ({u.idleCount})</option>)}
                    </select>
                    <input type="number" min={1} value={deployQty} onChange={e => setDeployQty(Number(e.target.value))}
                      className="w-full p-1 rounded text-[10px] text-center"
                      style={{ background: '#2a3050', color: '#e0e8ff', border: '1px solid #354064' }} />
                    <button onClick={() => void handleDeploy()} className="w-full py-1 rounded text-[10px] font-semibold"
                      style={{ background: '#8b50ff', color: '#e0e8ff' }}>배치</button>
                  </div>
                  <div className="bg-[#12192c] rounded-xl p-2.5 space-y-1.5">
                    <p className="text-[10px] font-semibold" style={{ color: '#ff8c00' }}>철수</p>
                    <select value={recallTypeId ?? ''} onChange={e => setRecallTypeId(Number(e.target.value))}
                      className="w-full p-1 rounded text-[10px]"
                      style={{ background: '#2a3050', color: '#e0e8ff', border: '1px solid #354064' }}>
                      {units.map(u => <option key={u.unitTypeId} value={u.unitTypeId}>{u.name.slice(0,3)} ({u.deployedCount})</option>)}
                    </select>
                    <input type="number" min={1} value={recallQty} onChange={e => setRecallQty(Number(e.target.value))}
                      className="w-full p-1 rounded text-[10px] text-center"
                      style={{ background: '#2a3050', color: '#e0e8ff', border: '1px solid #354064' }} />
                    <button onClick={() => void handleRecall()} className="w-full py-1 rounded text-[10px] font-semibold"
                      style={{ background: '#ff8c00', color: '#0a0e1a' }}>철수</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="p-3 space-y-2">
                <p className="text-muted font-semibold text-xs mb-1">영토에 사용 가능한 아이템</p>
                {territoryItems.length === 0 ? (
                  <p className="text-muted text-xs text-center py-4">사용 가능한 아이템 없음</p>
                ) : territoryItems.map(item => (
                  <div key={item.userItemId} className="bg-[#12192c] rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-foreground text-xs font-semibold">{item.itemName}</p>
                        <p className="text-muted text-[10px]">{item.description}</p>
                      </div>
                      <span className="text-muted text-[10px] flex-shrink-0">×{item.quantity}</span>
                    </div>
                    <button onClick={() => void handleUseItem(item)}
                      disabled={usingItemId === item.userItemId || item.quantity <= 0}
                      className="w-full py-1.5 rounded-lg text-[10px] font-semibold disabled:opacity-50"
                      style={{ background: '#00f5ff20', color: '#00f5ff', border: '1px solid #00f5ff60' }}>
                      {usingItemId === item.userItemId ? '사용 중...' : '이 영토에 사용'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-outline space-y-2">
            <button onClick={() => { setSelectedBuilding(null); setBuildError(''); if (selectedCell && selectedCellData?.type === 'empty') setShowBuild(true); else { setBuildPending(true); } }}
              className="w-full h-9 border border-primary rounded-xl text-primary text-xs hover:bg-primary/10 transition-colors">
              🏗 건물 건설
            </button>
            <button onClick={() => navigate(-1)} className="w-full h-9 bg-elevated border border-outline rounded-xl text-muted text-xs">
              ← 뒤로 가기
            </button>
          </div>
        </div>
      </div>

      {/* Build modal */}
      {showBuild && (
        <div className="modal-side-overlay">
          <div className="modal-backdrop" onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }} />
          <div className="relative bg-panel border-l-2 border-primary w-[520px] flex flex-col overflow-hidden">
            <div className="bg-surface px-5 py-4 border-b-2 border-primary flex items-center justify-between">
              <div>
                <h3 className="text-primary font-bold text-lg">🏗 건물 건설</h3>
                {selectedCell
                  ? <p className="text-muted text-xs">위치: ({selectedCell.x}, {selectedCell.y}) · Zone {selectedCellData?.zone ?? 3} · 보유 GP: {gp.toLocaleString()}</p>
                  : <p className="text-muted text-xs">빈 셀을 클릭하여 위치 선택 · 보유 GP: {gp.toLocaleString()}</p>
                }
              </div>
              <button onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }} className="btn-close">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {BUILD_OPTIONS.map(b => {
                const isSelected = selectedBuilding === b.type;
                const color = buildingColors[b.type];
                return (
                  <div key={b.type} onClick={() => setSelectedBuilding(b.type)}
                    className="rounded-xl p-3 flex items-center gap-3 border transition-all cursor-pointer"
                    style={{ background: isSelected ? color + '20' : '#2a3050', borderColor: isSelected ? color : color + '60', boxShadow: isSelected ? `0 0 8px ${color}40` : undefined }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '25' }}>
                      <span className="text-[22px]">{buildingLabels[b.type]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[13px] text-foreground">{buildingNames[b.type]}</p>
                      <p className="text-muted text-[11px]">{b.desc}</p>
                    </div>
                    <div className="border rounded px-2 py-1" style={{ background: isSelected ? color + '30' : '#1a1f35', borderColor: color }}>
                      <span className="text-xs" style={{ color }}>{b.cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {buildError && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-lg" style={{ background: '#ff004420', border: '1px solid #ff0044' }}>
                <span className="text-[#ff3333] text-xs">⚠ {buildError}</span>
              </div>
            )}
            <div className="border-t border-outline p-4 flex gap-3">
              <button onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }}
                className="flex-1 h-12 bg-elevated border border-outline rounded-xl text-muted text-sm">취소</button>
              <button onClick={() => void handleBuild()} disabled={!selectedBuilding || isBuilding}
                className="flex-1 h-12 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background: selectedBuilding && !isBuilding ? '#00f5ff' : '#2a3050', color: selectedBuilding && !isBuilding ? '#0a0e1a' : '#7788a5', border: selectedBuilding && !isBuilding ? 'none' : '1px solid #354064' }}>
                {isBuilding ? '건설 중...' : '건설하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Building action bottom sheet */}
      {showBuildingAction && selectedCell && selectedCellData && selectedCellData.type !== 'empty' && (
        <div className="modal-sheet-overlay">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBuildingAction(false)} />
          <div className="modal-sheet-panel">
            <div className="modal-header" style={{ background: buildingColors[selectedCellData.type] + '20', borderBottom: `2px solid ${buildingColors[selectedCellData.type]}` }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: buildingColors[selectedCellData.type] }}>{buildingNames[selectedCellData.type]}</h3>
                <p className="text-muted text-xs">위치: ({selectedCell.x}, {selectedCell.y}) · Zone {selectedCellData.zone} · Lv.{selectedCellData.level}</p>
              </div>
              <button onClick={() => setShowBuildingAction(false)} className="btn-close">✕</button>
            </div>
            <div className="px-5 py-3 border-b border-outline">
              <div className="flex justify-between mb-1">
                <span className="text-muted text-[11px]">HP</span>
                <span className="text-[11px]" style={{ color: buildingColors[selectedCellData.type] }}>{selectedCellData.hp} / {selectedCellData.maxHp}</span>
              </div>
              <div className="h-2 bg-[#0a0e1a] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${selectedCellData.maxHp ? Math.round((selectedCellData.hp! / selectedCellData.maxHp!) * 100) : 0}%`, background: buildingColors[selectedCellData.type] }} />
              </div>
            </div>
            <div className="p-4 flex gap-3">
              <button onClick={() => void handleUpgrade()}
                className="flex-1 h-12 rounded-xl font-semibold border hover:bg-[#ffd70015] text-[13px]"
                style={{ color: '#ffd700', borderColor: '#ffd70060' }}>⬆ 업그레이드</button>
              <button onClick={() => void handleStore()} disabled={selectedCellData.type === 'castle'}
                className="flex-1 h-12 rounded-xl font-semibold border text-[13px] disabled:opacity-40"
                style={{ color: '#8b50ff', borderColor: '#8b50ff60' }}>📦 보관함</button>
              <button onClick={() => setShowBuildingAction(false)}
                className="flex-1 h-12 rounded-xl font-semibold border text-[13px] text-muted border-outline">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
