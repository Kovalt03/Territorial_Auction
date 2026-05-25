import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import { useIsland } from '../hooks/useIsland';
import { useMilitary } from '../hooks/useMilitary';
import { storeBuilding as storeBuildingApi, moveBuilding as moveBuildingApi, placeIslandBuilding, fetchBuildingInventory, placeFromInventoryOnIsland, harvestIslandGp, upgradeBuilding as upgradeBuildingApi } from '../api/island';
import { produceUnit } from '../api/military';
import { ApiError } from '../api/client';
import type { InventoryItem, IslandData } from '../types/island';

type BuildingType = 'castle' | 'workshop' | 'barracks' | 'storage' | 'wall' | 'tower' | 'garden' | 'bank' | 'lab' | 'port' | 'mine' | 'empty';

interface Cell {
  type: BuildingType;
  level?: number;
  hp?: number;
  maxHp?: number;
  zone?: 1 | 2 | 3;
  buildingId?: number;
  isBody?: boolean; // 2x2 등 다중 셀 건물의 원점(posX,posY) 이외 셀
  width?: number;
  height?: number;
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

function assignZone(x: number, y: number, size: number, zone1Radius: number, zone2Radius: number): 1 | 2 | 3 {
  const center = Math.floor(size / 2);
  const dist = Math.max(Math.abs(x - center), Math.abs(y - center));
  if (dist <= zone1Radius) return 1;
  if (dist <= zone2Radius) return 2;
  return 3;
}

function emptyGrid(size: number, zone1Radius: number, zone2Radius: number): Cell[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({ type: 'empty' as BuildingType, zone: assignZone(x, y, size, zone1Radius, zone2Radius) }))
  );
}

function buildGridFromIsland(island: IslandData): Cell[][] {
  const size = island.gridSize;
  const z1 = island.zone1Radius;
  const z2 = island.zone2Radius;
  const grid = emptyGrid(size, z1, z2);
  for (const b of island.buildings) {
    if (b.isDestroyed || b.posY >= size || b.posX >= size) continue;
    const w = b.width ?? 1;
    const h = b.height ?? 1;
    const type = b.type.toLowerCase() as BuildingType;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const gx = b.posX + dx;
        const gy = b.posY + dy;
        if (gx >= size || gy >= size) continue;
        grid[gy][gx] = {
          type,
          level: b.level,
          hp: b.hp,
          maxHp: b.maxHp,
          buildingId: b.buildingId,
          zone: assignZone(gx, gy, size, z1, z2),
          isBody: dx > 0 || dy > 0,
          width: w,
          height: h,
        };
      }
    }
  }
  return grid;
}

function findOriginCell(grid: Cell[][], buildingId: number): { x: number; y: number } | null {
  for (let gy = 0; gy < grid.length; gy++) {
    for (let gx = 0; gx < grid[gy].length; gx++) {
      const c = grid[gy][gx];
      if (c.buildingId === buildingId && !c.isBody) return { x: gx, y: gy };
    }
  }
  return null;
}

function clearBuildingCells(grid: Cell[][], buildingId: number): Cell[][] {
  return grid.map(row =>
    row.map(c => c.buildingId === buildingId ? { type: 'empty' as BuildingType, zone: c.zone } : { ...c })
  );
}

const UNIT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  INFANTRY: { label: '보병', icon: '🗡', color: '#e0e8ff' },
  ARCHER: { label: '궁수', icon: '🏹', color: '#00ff88' },
  KNIGHT: { label: '기사', icon: '⚔', color: '#ffd700' },
};

// 백엔드 building_types 시드 순서 기준 ID 매핑 (building-types.yml)
const BUILDING_TYPE_ID: Partial<Record<string, number>> = {
  castle: 1, storage: 2, workshop: 3, barracks: 4, wall: 5, tower: 6,
};

export function PersonalIslandPage() {
  const navigate = useNavigate();
  const { ap, gp, username, syncGP } = useApp();
  const { island, reload: reloadIsland } = useIsland();
  const { data: militaryData, isLoading: isMilitaryLoading, reload: reloadMilitary } = useMilitary();
  const gridSize = island?.gridSize ?? 10;
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [showBuild, setShowBuild] = useState(false);
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid(10, 2, 4));

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

  // Inventory (서버 보관함)
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [deployFromInventoryIdx, setDeployFromInventoryIdx] = useState<number | null>(null);


  // 유닛 훈련 모달
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [trainUnitTypeId, setTrainUnitTypeId] = useState<number | null>(null);
  const [trainQuantity, setTrainQuantity] = useState(1);
  const [isTraining, setIsTraining] = useState(false);

  // 건설 위치 선택 모드 (사이드바 버튼 → 셀 클릭)
  const [buildPending, setBuildPending] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const showToast = useCallback((message: string, isError = true) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, isError });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const reloadInventory = useCallback(() => {
    fetchBuildingInventory().then(setInventory).catch(() => {});
  }, []);

  const handleUpgradeBuilding = async () => {
    const buildingId = selectedCellData?.buildingId;
    if (!buildingId) return;
    try {
      const result = await upgradeBuildingApi(buildingId);
      syncGP(result.gpRemaining);
      void reloadIsland();
      setShowBuildingAction(false);
      showToast(`Lv.${result.newLevel}으로 업그레이드 완료 (${result.upgradeCost.toLocaleString()} GP 소모)`, false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '업그레이드에 실패했습니다');
    }
  };

  const handleProduceUnit = async () => {
    if (!trainUnitTypeId || trainQuantity < 1) return;
    setIsTraining(true);
    try {
      const result = await produceUnit(trainUnitTypeId, trainQuantity);
      syncGP(result.gpRemaining);
      void reloadMilitary();
      setShowTrainModal(false);
      showToast(`유닛 ${trainQuantity}개 훈련 완료`, false);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '훈련에 실패했습니다');
    } finally {
      setIsTraining(false);
    }
  };

  useEffect(() => { reloadInventory(); }, [reloadInventory]);

  const selectedCellData = selectedCell ? grid[selectedCell.y]?.[selectedCell.x] : null;

  const cancelModes = () => {
    setMoveMode(false);
    setMoveSourceCell(null);
    setDeployFromInventoryIdx(null);
    setBuildPending(false);
  };

  const handleCellClick = (x: number, y: number, cell: { type: BuildingType; level?: number; hp?: number; maxHp?: number; zone?: 1 | 2 | 3 | 4 }) => {
    if (buildPending) {
      if (cell.type === 'empty') {
        setSelectedCell({ x, y });
        setBuildPending(false);
        setShowBuild(true);
      }
      return;
    }
    if (moveMode && moveSourceCell) {
      if (cell.type === 'empty') {
        const sourceCell = grid[moveSourceCell.y][moveSourceCell.x];
        if (!sourceCell.buildingId) { cancelModes(); return; }
        const destZone = grid[y][x].zone;
        if (sourceCell.type === 'castle') {
          showToast('성은 이동할 수 없습니다');
          cancelModes();
          return;
        }

        const origin = findOriginCell(grid, sourceCell.buildingId);
        if (!origin) { cancelModes(); return; }
        const originCell = grid[origin.y][origin.x];
        const w = originCell.width ?? 1;
        const h = originCell.height ?? 1;

        moveBuildingApi(sourceCell.buildingId, x, y).catch((err) => {
          void reloadIsland();
          showToast(err instanceof ApiError ? err.message : '이동에 실패했습니다');
        });
        setGrid(prev => {
          let next = clearBuildingCells(prev, sourceCell.buildingId!);
          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              const destX = x + dx;
              const destY = y + dy;
              if (destY < next.length && destX < next[destY].length) {
                next = next.map((row, ry) => row.map((c, rx) =>
                  ry === destY && rx === destX
                    ? { ...originCell, zone: prev[destY][destX].zone, isBody: dx > 0 || dy > 0 }
                    : c
                ));
              }
            }
          }
          return next;
        });
        cancelModes();
      }
      return;
    }
    if (deployFromInventoryIdx !== null) {
      if (cell.type === 'empty') {
        const item = inventory[deployFromInventoryIdx];
        const itemType = item.buildingType.toLowerCase() as BuildingType;
        const zone = grid[y][x].zone;
        if (itemType === 'castle' && zone !== 1) return;
        setGrid(prev => {
          const next = prev.map(row => row.map(c => ({ ...c })));
          next[y][x] = { type: itemType, level: 1, hp: 0, maxHp: 0, zone };
          return next;
        });
        setInventory(prev => prev.filter((_, i) => i !== deployFromInventoryIdx));
        setDeployFromInventoryIdx(null);
        placeFromInventoryOnIsland(item.inventoryId, x, y)
          .then(() => { reloadInventory(); void reloadIsland(); })
          .catch((err) => {
            reloadInventory();
            void reloadIsland();
            showToast(err instanceof ApiError ? err.message : '배치에 실패했습니다');
          });
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
    if (!cell.buildingId) return;
    if (cell.type === 'castle') {
      showToast('성은 보관함에 담을 수 없습니다');
      return;
    }
    const buildingId = cell.buildingId;
    storeBuildingApi(buildingId)
      .then(() => reloadInventory())
      .catch((err) => {
        void reloadIsland();
        showToast(err instanceof ApiError ? err.message : '보관에 실패했습니다');
      });
    setGrid(prev => clearBuildingCells(prev, buildingId));
    setShowBuildingAction(false);
  };

  const [isBuilding, setIsBuilding] = useState(false);

  const isBuildingRef = useRef(false);
  const [isHarvesting, setIsHarvesting] = useState(false);

  const handleHarvest = async () => {
    if (isHarvesting) return;
    setIsHarvesting(true);
    try {
      const result = await harvestIslandGp();
      syncGP(result.gpBalance);
      void reloadIsland();
    } catch {
      // 수확 실패는 사용자에게 별도 안내 없이 무시 (GP 0인 경우 포함)
    } finally {
      setIsHarvesting(false);
    }
  };


  const handleBuild = async () => {
    setBuildError('');
    if (!selectedBuilding) { setBuildError('건물을 선택해주세요.'); return; }
    if (!selectedCell) { setBuildError('그리드에서 빈 셀을 선택해주세요.'); return; }
    const typeId = BUILDING_TYPE_ID[selectedBuilding];
    if (!typeId) { setBuildError('아직 건설할 수 없는 건물입니다.'); return; }
    setIsBuilding(true);
    try {
      const result = await placeIslandBuilding(typeId, selectedCell.x, selectedCell.y);
      syncGP(result.gpRemaining);
      setSelectedBuilding(null);
      setShowBuild(false);
      void reloadIsland();
    } catch (err) {
      setBuildError(err instanceof ApiError ? err.message : '건설에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsBuilding(false);
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });

  const ISLAND_W = gridSize * 38; // CELL_SIZE(36) + gap(2)
  const ISLAND_H = gridSize * 38;

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
    1: 'rgba(255, 215, 0, 0.08)', 2: 'rgba(255, 51, 51, 0.06)', 3: 'rgba(0, 245, 255, 0.04)',
  };
  const zoneBorder: Record<number, string> = {
    1: '#ffd700', 2: '#ff3333', 3: '#00f5ff',
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
    <div className="page-root">
      <GNB />

      {toast && (
        <div
          className="fixed top-5 left-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold"
          style={{
            transform: 'translateX(-50%)',
            background: toast.isError ? '#1a0a0a' : '#0a1a0f',
            border: `1.5px solid ${toast.isError ? '#ff3333' : '#00ff88'}`,
            color: toast.isError ? '#ff6666' : '#00ff88',
            animation: 'fadeInDown 0.2s ease',
          }}
        >
          <span>{toast.isError ? '⚠' : '✓'}</span>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 opacity-60 hover:opacity-100 text-base leading-none"
          >✕</button>
        </div>
      )}

      <div className="bg-surface border-b border-[#00ff8840] px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => navigate('/app/map')} className="text-muted hover:text-foreground mr-1">←</button>
        <div className="w-10 h-10 bg-[#00ff8830] rounded-xl border border-gp flex items-center justify-center">
          <span className="text-xl">🏝</span>
        </div>
        <div>
          <h1 className="text-gp font-bold text-xl">나의 섬 · {username || '—'}</h1>
          <p className="text-muted text-xs">중앙 대륙 · {island?.grade ?? 'D'}급 개인 영토 · {gridSize}×{gridSize} 그리드</p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="h-7 px-3 rounded-lg bg-[#ffd70020] border border-gold flex items-center">
            <span className="text-gold font-bold text-[11px]">{island?.grade ?? 'D'}급</span>
          </div>
          <div className="flex items-center gap-1 bg-elevated border border-gp rounded-lg px-2 py-1">
            <div className="w-2 h-2 bg-gp rounded-full animate-pulse" />
            <span className="text-gp text-[11px]">안전 보호 중</span>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <div className="text-right">
            <p className="text-muted text-[10px]">총 GP 보유</p>
            <p className="text-gp font-bold text-base">💎 {gp.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-muted text-[10px]">생산 속도</p>
            <p className="text-gold font-bold text-base">+{island?.productionRate ?? 0} GP/분</p>
          </div>
          <div className="text-right">
            <p className="text-muted text-[10px]">총 방어력</p>
            <p className="text-danger font-bold text-base">4,820</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              className="w-10 h-5 rounded-full relative transition-colors"
              style={{ background: showZones ? '#00ff8840' : '#2a3050', border: `1px solid ${showZones ? '#00ff88' : '#354064'}` }}
              onClick={() => setShowZones(p => !p)}
            >
              <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ background: showZones ? '#00ff88' : '#7788a5', left: showZones ? 20 : 2 }} />
            </div>
            <span className="text-muted text-[11px]">존 표시</span>
          </label>
        </div>
      </div>

      {/* Mode indicator banners */}
      {moveMode && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0" style={{ background: '#1a1200', borderBottom: '1px solid #ffd70060' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">🔄</span>
            <span className="text-gold font-semibold text-[13px]">
              이동 모드 — 이동할 빈 셀을 클릭하세요
              {moveSourceCell && <span className="text-muted ml-2 text-[11px]">출발: ({moveSourceCell.x}, {moveSourceCell.y})</span>}
            </span>
          </div>
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border border-[#ffd70060] text-gold text-xs transition-colors">취소</button>
        </div>
      )}
      {buildPending && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0" style={{ background: '#001020', borderBottom: '1px solid #00f5ff60' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">🏗</span>
            <span className="font-semibold text-[13px]" style={{ color: '#00f5ff' }}>건설 위치 선택 — 빈 셀을 클릭하세요</span>
          </div>
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border text-xs transition-colors" style={{ borderColor: '#00f5ff60', color: '#00f5ff' }}>취소</button>
        </div>
      )}
      {deployFromInventoryIdx !== null && inventory[deployFromInventoryIdx] && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0" style={{ background: '#001a10', borderBottom: '1px solid #00ff8860' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">📦</span>
            <span className="text-gp font-semibold text-[13px]">
              배치 모드 — 배치할 빈 셀을 클릭하세요
              <span className="text-muted ml-2 text-[11px]">({inventory[deployFromInventoryIdx].buildingTypeName})</span>
            </span>
          </div>
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border border-[#00ff8860] text-gp text-xs transition-colors">취소</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden bg-[#070c18]">
          {/* Legend bar */}
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
                {selectedCell ? `선택: (${selectedCell.x}, ${selectedCell.y}) - ${buildingNames[selectedCellData?.type || 'empty']}` : '셀을 클릭하여 선택'}
              </span>
              <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="w-6 h-6 bg-[#1a2438] border border-[#2a3a5a] rounded text-muted hover:text-white text-xs flex items-center justify-center">+</button>
              <button onClick={() => setZoom(z => Math.max(0.3, z / 1.2))} className="w-6 h-6 bg-[#1a2438] border border-[#2a3a5a] rounded text-muted hover:text-white text-xs flex items-center justify-center">−</button>
              <button onClick={() => { const { z, x, y } = getFitView(); setZoom(z); setPan({ x, y }); }} className="w-6 h-6 bg-[#1a2438] border border-[#2a3a5a] rounded text-muted hover:text-white text-xs flex items-center justify-center">⊡</button>
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
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE}px)`, gridTemplateRows: `repeat(${gridSize}, ${CELL_SIZE}px)`, gap: 2, width: gridSize * (CELL_SIZE + 2) }}>
            {grid.map((row, y) =>
              row.map((cell, x) => {
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                const isMoveSource = moveSourceCell?.x === x && moveSourceCell?.y === y;
                const isActionTarget = (moveMode || deployFromInventoryIdx !== null || buildPending) && cell.type === 'empty';
                const zone = cell.zone || 4;
                const bg = isMoveSource ? buildingColors[cell.type] + '80' : cell.type !== 'empty' ? buildingColors[cell.type] + '50' : showZones ? zoneOverlay[zone] : 'var(--color-surface)';
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
                        {!cell.isBody && (
                          <span className="text-sm leading-none">{buildingLabels[cell.type]}</span>
                        )}
                        {!cell.isBody && cell.level && (
                          <div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 rounded-full overflow-hidden" style={{ background: '#0a0e1a' }}>
                            <div className="h-full rounded-full" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
                          </div>
                        )}
                        {!cell.isBody && cell.level && (
                          <div className="absolute top-0 right-0 w-3 h-3 rounded-full flex items-center justify-center text-[6px]" style={{ background: buildingColors[cell.type] }}>
                            {cell.level}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className={`text-[10px] ${isActionTarget ? 'text-[#00ff8870]' : 'text-outline opacity-40'}`}>
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

        <div className="w-[260px] bg-surface border-l border-outline flex flex-col flex-shrink-0">
          <div className="flex border-b border-outline">
            {(['buildings', 'resources', 'units', 'expand'] as const).map(tabId => (
              <button key={tabId} onClick={() => setActiveTab(tabId)} className="flex-1 py-2.5 text-[11px] transition-colors" style={{ color: activeTab === tabId ? '#00ff88' : '#7788a5', borderBottom: activeTab === tabId ? '2px solid #00ff88' : '2px solid transparent', background: activeTab === tabId ? '#00ff8810' : 'transparent' }}>
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
                        <span className="text-base">{b.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: b.color }}>{buildingNames[b.type]}</span>
                          <span className="text-muted text-[10px]">×{count}</span>
                        </div>
                        <p className="text-muted text-[10px]">{b.gp}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'resources' && (
              <div className="p-3 space-y-3">
                <div className="bg-[#12192c] rounded-xl p-3">
                  <div className="flex justify-between"><span className="text-gold font-semibold text-xs">⚡ AP</span><span className="text-gold font-bold text-sm">{ap.toLocaleString()}</span></div>
                </div>
                <div className="bg-[#12192c] rounded-xl p-3">
                  <div className="flex justify-between mb-1"><span className="text-gp font-semibold text-xs">💎 GP 생산</span><span className="text-gp font-bold text-sm">+{island?.productionRate ?? 0}/분</span></div>
                  <div className="space-y-1 mt-2">
                    {countBuildings('workshop') > 0
                      ? <div className="flex justify-between"><span className="text-muted text-[10px]">생산소 ×{countBuildings('workshop')}개</span><span className="text-[10px]" style={{ color: '#00ff88' }}>+{island?.productionRate ?? 0}/분</span></div>
                      : <p className="text-muted text-[10px]">생산 건물 없음</p>
                    }
                  </div>
                </div>
                <div className="bg-[#12192c] rounded-xl p-3">
                  <p className="text-[#ff44cc] font-semibold mb-2 text-xs">🔬 연구 현황</p>
                  <p className="text-muted text-[10px]">준비 중</p>
                </div>
              </div>
            )}
            {activeTab === 'units' && (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-muted font-semibold text-xs">주둔 유닛</p>
                  {militaryData && (
                    <span className="text-[10px] text-gold">🌾 식량 {militaryData.availableFood.toLocaleString()}</span>
                  )}
                </div>
                {isMilitaryLoading && <p className="text-muted text-xs text-center py-4">불러오는 중...</p>}
                {!isMilitaryLoading && militaryData?.units.map(u => {
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
                          <p className="text-muted text-[9px]">대기 {u.idleCount} · 배치 {u.deployedCount} · 공격력 {u.attackPower}</p>
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
                {!isMilitaryLoading && militaryData?.units.length === 0 && (
                  <p className="text-muted text-xs text-center py-4">보유한 유닛이 없습니다</p>
                )}
                <button
                  onClick={() => {
                    if (militaryData?.units.length) setTrainUnitTypeId(militaryData.units[0].unitTypeId);
                    setTrainQuantity(1);
                    setShowTrainModal(true);
                  }}
                  className="w-full h-9 border border-secondary rounded-xl text-secondary text-xs hover:bg-[#8b50ff20] transition-colors"
                >유닛 훈련하기</button>
              </div>
            )}
            {activeTab === 'expand' && (
              <div className="p-3 flex flex-col items-center justify-center gap-3 py-12">
                <span className="text-[40px]">🚧</span>
                <p className="text-foreground font-semibold text-sm">준비 중</p>
                <p className="text-muted text-[11px] text-center">섬 확장 기능은 추후 업데이트 예정입니다</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-outline space-y-2">
            <button
              onClick={() => {
                const cell = selectedCell ? grid[selectedCell.y]?.[selectedCell.x] : null;
                if (cell?.type === 'empty') {
                  setShowBuild(true);
                } else {
                  cancelModes();
                  setBuildPending(true);
                }
              }}
              className="w-full h-9 border border-primary rounded-xl text-primary text-xs hover:bg-primary/10 transition-colors"
            >🏗 건물 건설</button>
            <button
              onClick={() => setShowInventory(true)}
              className="relative w-full h-9 border border-secondary text-secondary rounded-xl text-xs transition-colors hover:bg-[#8b50ff20]"
            >
              📦 보관함
              {inventory.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-secondary text-white text-[10px] flex items-center justify-center">
                  {inventory.length}
                </span>
              )}
            </button>
            <button
              onClick={() => void handleHarvest()}
              disabled={isHarvesting}
              className="w-full h-9 rounded-xl font-bold text-xs transition-all"
              style={{
                background: isHarvesting ? '#2a3050' : '#00ff88',
                color: isHarvesting ? '#7788a5' : '#0a0e1a',
                border: isHarvesting ? '1px solid #354064' : 'none',
              }}
            >
              {isHarvesting
                ? '수확 중...'
                : `🌾 GP 수확하기${island && island.accumulatedGp > 0 ? ` (+${island.accumulatedGp.toLocaleString()})` : ''}`}
            </button>
            <button onClick={() => navigate('/app/map')} className="w-full h-9 bg-elevated border border-outline rounded-xl text-muted text-xs">🗺 월드맵으로</button>
          </div>
        </div>
      </div>

      {showBuild && (
        <div className="fixed inset-0 flex justify-end z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }} />
          <div className="relative bg-panel border-l-2 border-gp w-[520px] flex flex-col overflow-hidden">
            <div className="bg-surface px-5 py-4 border-b-2 border-gp flex items-center justify-between">
              <div>
                <h3 className="text-gp font-bold text-lg">🏗 건물 건설</h3>
                {selectedCell
                  ? <p className="text-muted text-xs">위치: ({selectedCell.x}, {selectedCell.y}) · Zone {selectedCellData?.zone ?? 3} · 보유 GP: {gp.toLocaleString()}</p>
                  : <p className="text-muted text-xs">빈 셀을 클릭하여 위치를 선택하세요 · 보유 GP: {gp.toLocaleString()}</p>
                }
              </div>
              <button onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }} className="btn-close">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {([
                { type: 'workshop' as BuildingType, name: '생산소 (Workshop)', desc: 'GP 생산 +20/분', cost: '500 GP', available: true },
                { type: 'barracks' as BuildingType, name: '병영 (Barracks)', desc: '유닛 훈련 및 배치', cost: '800 GP', available: true },
                { type: 'storage' as BuildingType, name: '저장소 (Storage)', desc: '자원 1,000 GP 보관', cost: '300 GP', available: true },
                { type: 'wall' as BuildingType, name: '방벽 (Wall)', desc: 'Zone 방어력 +50', cost: '100 GP', available: true },
                { type: 'tower' as BuildingType, name: '방어탑 (Tower)', desc: '자동 방어 공격', cost: '400 GP', available: true },
                { type: 'garden' as BuildingType, name: '정원 (Garden)', desc: '행복도 +5, GP 보너스 +3%', cost: '200 GP', available: false },
                { type: 'bank' as BuildingType, name: '금고 (Bank)', desc: 'GP 이자 +22/분', cost: '2,000 GP', available: false },
                { type: 'mine' as BuildingType, name: '광산 (Mine)', desc: 'GP 채굴 +35/분', cost: '1,500 GP', available: false },
              ] as const).map(b => {
                const isSelected = selectedBuilding === b.type;
                const color = buildingColors[b.type];
                return (
                  <div
                    key={b.type}
                    onClick={() => b.available && setSelectedBuilding(b.type)}
                    className="rounded-xl p-3 flex items-center gap-3 border transition-all"
                    style={{
                      background: !b.available ? '#1a1f35' : isSelected ? color + '20' : '#2a3050',
                      borderColor: !b.available ? '#2a3050' : isSelected ? color : color + '60',
                      boxShadow: isSelected ? `0 0 8px ${color}40` : undefined,
                      cursor: b.available ? 'pointer' : 'not-allowed',
                      opacity: b.available ? 1 : 0.5,
                    }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '25' }}>
                      <span className="text-[22px]">{buildingLabels[b.type]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-[13px]" style={{ color: b.available ? '#e0e8ff' : '#7788a5' }}>{b.name}</p>
                      <p className="text-muted text-[11px]">{b.desc}</p>
                    </div>
                    {b.available ? (
                      <div className="border rounded px-2 py-1" style={{ background: isSelected ? color + '30' : '#1a1f35', borderColor: color }}>
                        <span className="text-xs" style={{ color }}>{b.cost}</span>
                      </div>
                    ) : (
                      <div className="border rounded px-2 py-1" style={{ background: '#1a1f35', borderColor: '#354064' }}>
                        <span className="text-xs text-muted">준비 중</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {buildError && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-[#ff004420] border border-[#ff0044]">
                <span className="text-[#ff3333] text-xs">⚠ {buildError}</span>
              </div>
            )}
            <div className="border-t border-outline p-4 flex gap-3">
              <button
                onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }}
                className="flex-1 h-12 bg-elevated border border-outline rounded-xl text-muted text-sm"
              >
                취소
              </button>
              <button
                onClick={() => void handleBuild()}
                disabled={!selectedBuilding || isBuilding}
                className="flex-1 h-12 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: selectedBuilding && !isBuilding ? '#00ff88' : '#2a3050',
                  color: selectedBuilding && !isBuilding ? '#0a0e1a' : '#7788a5',
                  border: selectedBuilding && !isBuilding ? 'none' : '1px solid #354064',
                  cursor: selectedBuilding && !isBuilding ? 'pointer' : 'not-allowed',
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
                <h3 className="font-bold text-lg" style={{ color: buildingColors[selectedCellData.type] }}>
                  {buildingNames[selectedCellData.type]}
                </h3>
                <p className="text-[#7788a5] text-xs">
                  위치: ({selectedCell.x}, {selectedCell.y}) · Zone {selectedCellData.zone} · Lv.{selectedCellData.level}
                </p>
              </div>
              <button onClick={() => setShowBuildingAction(false)} className="btn-close">✕</button>
            </div>

            <div className="px-5 py-3 border-b border-outline">
              <div className="flex justify-between mb-1">
                <span className="text-muted text-[11px]">HP</span>
                <span className="text-[11px]" style={{ color: buildingColors[selectedCellData.type] }}>{selectedCellData.hp} / {selectedCellData.maxHp}</span>
              </div>
              <div className="h-2 bg-[#0a0e1a] rounded-full overflow-hidden">
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
                className="flex-1 h-12 rounded-xl font-semibold border transition-all hover:bg-[#ffd70015] text-[13px]"
                style={{ color: '#ffd700', borderColor: '#ffd70060' }}
              >
                🔄 이동하기
              </button>
              <button
                onClick={handleStoreBuilding}
                disabled={selectedCellData.type === 'castle'}
                className="flex-1 h-12 rounded-xl font-semibold border transition-all text-[13px]"
                style={{
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
                className="flex-1 h-12 bg-elevated border border-outline rounded-xl text-muted text-[13px]"
              >
                닫기
              </button>
            </div>
            <div className="px-4 pb-4">
              {(() => {
                const curLevel = selectedCellData.level ?? 1;
                const isMaxLevel = curLevel >= 3;
                return (
                  <button
                    onClick={handleUpgradeBuilding}
                    disabled={isMaxLevel}
                    className="w-full h-10 rounded-xl font-semibold border transition-all text-[13px]"
                    style={{
                      color: isMaxLevel ? '#354064' : '#00f5ff',
                      borderColor: isMaxLevel ? '#354064' : '#00f5ff60',
                      cursor: isMaxLevel ? 'not-allowed' : 'pointer',
                      background: 'transparent',
                    }}
                  >
                    {isMaxLevel ? '⬆ 업그레이드 (최대 레벨)' : `⬆ 업그레이드 Lv.${curLevel} → Lv.${curLevel + 1}`}
                  </button>
                );
              })()}
            </div>
            {selectedCellData.type === 'castle' && (
              <p className="text-center text-muted pb-3 text-[11px]">성(Castle)은 핵심 건물로 보관함에 담을 수 없습니다</p>
            )}
          </div>
        </div>
      )}

      {/* ───── Train unit modal ───── */}
      {showTrainModal && militaryData && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTrainModal(false)} />
          <div className="relative rounded-2xl overflow-hidden flex flex-col" style={{ width: 400, background: '#1a1f35', border: '1.5px solid #8b50ff' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: '#1a0a35', borderBottom: '2px solid #8b50ff' }}>
              <div>
                <h3 className="text-secondary font-bold text-xl">⚔ 유닛 훈련</h3>
                <p className="text-muted text-xs">보유 GP: {gp.toLocaleString()} · 식량: {militaryData.availableFood.toLocaleString()}</p>
              </div>
              <button onClick={() => setShowTrainModal(false)} className="btn-close">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-muted text-xs mb-2">유닛 선택</p>
                <div className="grid grid-cols-3 gap-2">
                  {militaryData.units.map(u => {
                    const meta = UNIT_LABELS[u.name] ?? { label: u.name, icon: '⚔', color: '#e0e8ff' };
                    const isSelected = trainUnitTypeId === u.unitTypeId;
                    return (
                      <button
                        key={u.unitTypeId}
                        onClick={() => setTrainUnitTypeId(u.unitTypeId)}
                        className="rounded-xl p-2 flex flex-col items-center gap-1 transition-all"
                        style={{ background: isSelected ? meta.color + '20' : '#12192c', border: `1.5px solid ${isSelected ? meta.color : '#354064'}`, color: meta.color }}
                      >
                        <span className="text-lg">{meta.icon}</span>
                        <span className="text-[11px] font-semibold">{meta.label}</span>
                        <span className="text-[10px] text-muted">식량 {u.foodCost}/개</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-muted text-xs mb-1">수량</p>
                <input
                  type="number"
                  min={1}
                  value={trainQuantity}
                  onChange={e => setTrainQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-9 rounded-xl px-3 text-sm"
                  style={{ background: '#2a3050', border: '1px solid #354064', color: '#e0e8ff' }}
                />
              </div>
              <button
                onClick={handleProduceUnit}
                disabled={isTraining || !trainUnitTypeId}
                className="w-full h-10 rounded-xl font-semibold text-sm transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: '#8b50ff30', color: '#8b50ff', border: '1.5px solid #8b50ff' }}
              >
                {isTraining ? '훈련 중...' : '훈련하기'}
              </button>
            </div>
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
                <h3 className="text-secondary font-bold text-xl">📦 보관함</h3>
                <p className="text-muted text-xs">건물 {inventory.length}개 보관 중 · 배치하기를 눌러 그리드에 재배치</p>
              </div>
              <button onClick={() => setShowInventory(false)} className="btn-close">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {inventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-[40px]">📭</span>
                  <p className="text-muted text-sm">보관함이 비어 있습니다</p>
                  <p className="text-outline text-xs">건물 셀을 클릭한 뒤 "보관함에 담기"를 선택하세요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inventory.map((item, idx) => {
                    const itemType = item.buildingType.toLowerCase() as BuildingType;
                    const color = buildingColors[itemType] ?? '#8892b0';
                    return (
                      <div key={item.inventoryId} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#2a3050', border: `1px solid ${color}50` }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '25', border: `1px solid ${color}60` }}>
                          <span className="text-[22px]">{buildingLabels[itemType] ?? '🏗'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color }}>{item.buildingTypeName}</p>
                          <p className="text-muted text-[11px]">수량: {item.quantity}개</p>
                        </div>
                        <button
                          onClick={() => { setDeployFromInventoryIdx(idx); setShowInventory(false); }}
                          className="h-9 px-4 rounded-lg font-semibold transition-all hover:brightness-110 text-xs"
                          style={{ background: color + '30', color, border: `1px solid ${color}` }}
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
