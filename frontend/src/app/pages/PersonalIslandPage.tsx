import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';
import { LoadingState } from '../components/LoadingState';
import { useApp } from '../context/AppContext';
import { useIsland } from '../hooks/useIsland';
import { useMilitary } from '../hooks/useMilitary';
import { storeBuilding as storeBuildingApi, moveBuilding as moveBuildingApi, placeIslandBuilding, fetchBuildingInventory, placeFromInventoryOnIsland, harvestIslandGp, upgradeBuilding as upgradeBuildingApi, fetchBuildingTypes } from '../api/island';
import { produceUnit, fetchResearch, startResearch } from '../api/military';
import type { ResearchStatus } from '../types/military';
import { ApiError } from '../api/client';
import type { InventoryItem, BuildingTypeInfo } from '../types/island';
import {
  type BuildingType, type Cell,
  buildingColors, buildingLabels, buildingNames,
  UNIT_LABELS,
  emptyGrid, buildGridFromIsland, findOriginCell, clearBuildingCells, isUnderConstruction, remainingLabel,
} from './islandGrid';
import { IslandToast } from './IslandToast';
import { IslandBuildModal } from './IslandBuildModal';
import { IslandBuildingActionPanel } from './IslandBuildingActionPanel';
import { IslandTrainUnitModal } from './IslandTrainUnitModal';
import { IslandResearchPanel } from './IslandResearchPanel';
import { IslandInventoryModal } from './IslandInventoryModal';
import { IslandDecorationShopModal } from './IslandDecorationShopModal';

export function PersonalIslandPage() {
  const navigate = useNavigate();
  const { ap, gp, username, syncAP } = useApp();
  const { island, reload: reloadIsland } = useIsland();
  const { data: militaryData, isLoading: isMilitaryLoading, reload: reloadMilitary } = useMilitary();
  // 유닛·식량은 위치별로 그룹핑돼 내려온다 — 이 페이지는 섬 위치만 본다.
  const islandMilitary = militaryData?.locations.find(l => l.locationType === 'ISLAND');
  const islandUnits = islandMilitary?.units ?? [];
  const islandFood = islandMilitary?.storedFood ?? 0;
  const gridSize = island?.gridSize ?? 10;
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [showBuild, setShowBuild] = useState(false);
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid(10, 2, 4));

  useEffect(() => {
    if (island) setGrid(buildGridFromIsland(island));
  }, [island]);

  // 건설 중인 건물이 있는 동안만 1초마다 남은 시간을 갱신하고, 완료 시점에 섬을 다시 불러온다.
  const [now, setNow] = useState(() => Date.now());
  // 서버 buildersInUse 는 폴링 사이에 낡으므로 타이머 기준으로 다시 센다.
  const buildersInUse = island?.buildings.filter(b => isUnderConstruction(b.buildCompleteAt, now)).length ?? 0;
  const builderCount = island?.builderCount ?? 1;
  const isBuilderFull = buildersInUse >= builderCount;
  const hasConstruction = buildersInUse > 0;
  useEffect(() => {
    if (!hasConstruction) return;
    const timer = setInterval(() => {
      const next = Date.now();
      setNow(next);
      const stillBuilding = island?.buildings.some(b => isUnderConstruction(b.buildCompleteAt, next));
      if (!stillBuilding) void reloadIsland();
    }, 1000);
    return () => clearInterval(timer);
  }, [hasConstruction, island, reloadIsland]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [catalog, setCatalog] = useState<BuildingTypeInfo[]>([]);
  useEffect(() => {
    fetchBuildingTypes().then(setCatalog).catch(e => console.warn('[PersonalIslandPage] building types load failed', e));
  }, []);
  // 관리자 지정 아이콘/색 우선, 없으면 기본 매핑
  const catalogByType = new Map(catalog.map(c => [c.name.toLowerCase(), c]));
  const iconFor = (t: BuildingType) => catalogByType.get(t)?.icon ?? buildingLabels[t] ?? '🏗';
  const colorFor = (t: BuildingType) => catalogByType.get(t)?.colorHex ?? buildingColors[t] ?? '#8892b0';
  const nameFor = (t: BuildingType) => catalogByType.get(t)?.displayName ?? buildingNames[t] ?? t;
  const statDesc = (c: BuildingTypeInfo) => {
    const parts: string[] = [];
    if (c.gpProductionRate) parts.push(`GP +${c.gpProductionRate}/시간`);
    if (c.foodProductionRate) parts.push(`식량 +${c.foodProductionRate}/시간`);
    if (c.unitCapacityPerLevel) parts.push(`유닛 +${c.unitCapacityPerLevel}/레벨`);
    if (c.defensePower) parts.push(`방어력 +${c.defensePower}`);
    return parts.join(' · ') || '장식';
  };
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
  const [showShop, setShowShop] = useState(false);
  const [deployFromInventoryIdx, setDeployFromInventoryIdx] = useState<number | null>(null);

  // 연구
  const [research, setResearch] = useState<ResearchStatus | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const reloadResearch = useCallback(() => {
    fetchResearch()
      .then(setResearch)
      .catch(e => console.warn('[PersonalIslandPage] research load failed', e));
  }, []);
  useEffect(() => { reloadResearch(); }, [reloadResearch]);

  const handleResearch = async (unitTypeId: number) => {
    setIsResearching(true);
    setResearchError(null);
    try {
      await startResearch(unitTypeId);
      reloadResearch();
      showToast('연구를 시작했습니다', false);
    } catch (e) {
      setResearchError(e instanceof ApiError ? e.message : '연구 시작에 실패했습니다');
    } finally {
      setIsResearching(false);
    }
  };

  // 유닛 훈련 모달
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [trainUnitTypeId, setTrainUnitTypeId] = useState<number | null>(null);
  const [trainQuantity, setTrainQuantity] = useState(1);
  const [trainLevel, setTrainLevel] = useState(1);
  const [isTraining, setIsTraining] = useState(false);
  // unitTypeId → 연구 해금 레벨
  const researchedLevels = Object.fromEntries(
    (research?.units ?? []).map(u => [u.unitTypeId, u.researchedLevel]),
  ) as Record<number, number>;

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
    fetchBuildingInventory().then(setInventory).catch((e) => console.warn('[PersonalIslandPage] inventory reload failed', e));
  }, []);

  const handleUpgradeBuilding = async () => {
    const buildingId = selectedCellData?.buildingId;
    if (!buildingId) return;
    try {
      const result = await upgradeBuildingApi(buildingId);
      // 업그레이드는 섬 저장소 GP에서 차감된다 — 금고(vault)와 무관. 섬만 다시 불러온다.
      void reloadIsland();
      setShowBuildingAction(false);
      showToast(
        result.buildCompleteAt
          ? `Lv.${result.newLevel} 업그레이드 시작 — ${remainingLabel(result.buildCompleteAt, Date.now())} 후 완료 (${result.upgradeCost.toLocaleString()} GP 소모)`
          : `Lv.${result.newLevel}으로 업그레이드 완료 (${result.upgradeCost.toLocaleString()} GP 소모)`,
        false,
      );
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : '업그레이드에 실패했습니다');
    }
  };

  const handleProduceUnit = async () => {
    if (!trainUnitTypeId || trainQuantity < 1 || !island) return;
    setIsTraining(true);
    try {
      await produceUnit(trainUnitTypeId, trainQuantity, island.islandId, 'ISLAND', trainLevel);
      // 유닛 생산은 섬 저장소 GP·식량에서 차감 — 섬·유닛 현황을 다시 불러온다(금고 무관).
      void reloadIsland();
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
      await harvestIslandGp();
      // 수확분은 섬 저장소에 적립된다 — 섬을 다시 불러오면 섬 저장 GP에 반영(금고 무관).
      void reloadIsland();
    } catch {
      // 수확 실패는 사용자에게 별도 안내 없이 무시 (GP 0인 경우 포함)
    } finally {
      setIsHarvesting(false);
    }
  };

  const handleBuild = async () => {
    if (isBuildingRef.current) return;
    setBuildError('');
    if (!selectedBuilding) { setBuildError('건물을 선택해주세요.'); return; }
    if (!selectedCell) { setBuildError('그리드에서 빈 셀을 선택해주세요.'); return; }
    const typeId = catalog.find(c => c.name.toLowerCase() === selectedBuilding)?.buildingTypeId;
    if (!typeId) { setBuildError('아직 건설할 수 없는 건물입니다.'); return; }
    isBuildingRef.current = true;
    setIsBuilding(true);
    try {
      await placeIslandBuilding(typeId, selectedCell.x, selectedCell.y);
      // 건설은 섬 저장소 GP에서 차감 — 금고(vault)와 무관. 섬만 다시 불러온다.
      setSelectedBuilding(null);
      setShowBuild(false);
      void reloadIsland();
    } catch (err) {
      setBuildError(err instanceof ApiError ? err.message : '건설에 실패했습니다. 다시 시도해주세요.');
    } finally {
      isBuildingRef.current = false;
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

  const CELL_SIZE = 36;

  return (
    <div className="page-root">
      <GNB />

      {toast && (
        <IslandToast
          message={toast.message}
          isError={toast.isError}
          onClose={() => setToast(null)}
        />
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
          <div
            className={`flex items-center gap-1 bg-elevated border rounded-lg px-2 py-1 ${isBuilderFull ? 'border-gold' : 'border-outline'}`}
            title="건축 장인 — 지금 바로 건설에 투입 가능한 장인 수 / 전체"
          >
            <span className="text-[11px]">🔨</span>
            <span className={`text-[11px] font-bold ${isBuilderFull ? 'text-gold' : 'text-muted'}`}>
              장인 {builderCount - buildersInUse}/{builderCount}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <div className="text-right" title="계정 금고(vault)의 GP. 건물 건설·생산에는 이 섬 저장소의 GP가 쓰인다(금고와 별개).">
            <p className="text-muted text-[10px]">금고 GP</p>
            <p className="text-gp font-bold text-base">💎 {gp.toLocaleString()}</p>
          </div>
          {island && (
            <div className="text-right" title="이 섬 저장소(성·저장소)의 GP. 건물 건설·유닛 생산에 실제로 차감되는 값.">
              <p className="text-muted text-[10px]">섬 저장 GP</p>
              <p className="text-gold font-bold text-base">🏝 {(island.storedGp ?? 0).toLocaleString()}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-muted text-[10px]">생산 속도</p>
            <p className="text-gold font-bold text-base">+{island?.productionRatePerHour ?? 0} GP/시간</p>
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
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[#ffd70060]" style={{ background: '#1a1200' }}>
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
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[#00f5ff60]" style={{ background: '#001020' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">🏗</span>
            <span className="font-semibold text-[13px]" style={{ color: '#00f5ff' }}>건설 위치 선택 — 빈 셀을 클릭하세요</span>
          </div>
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border text-xs transition-colors" style={{ borderColor: '#00f5ff60', color: '#00f5ff' }}>취소</button>
        </div>
      )}
      {deployFromInventoryIdx !== null && inventory[deployFromInventoryIdx] && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[#00ff8860]" style={{ background: '#001a10' }}>
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
                {selectedCell ? `선택: (${selectedCell.x}, ${selectedCell.y}) - ${nameFor(selectedCellData?.type || 'empty')}` : '셀을 클릭하여 선택'}
              </span>
              <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} className="w-6 h-6 bg-outline-soft border border-outline rounded text-muted hover:text-white text-xs flex items-center justify-center">+</button>
              <button onClick={() => setZoom(z => Math.max(0.3, z / 1.2))} className="w-6 h-6 bg-outline-soft border border-outline rounded text-muted hover:text-white text-xs flex items-center justify-center">−</button>
              <button onClick={() => { const { z, x, y } = getFitView(); setZoom(z); setPan({ x, y }); }} className="w-6 h-6 bg-outline-soft border border-outline rounded text-muted hover:text-white text-xs flex items-center justify-center">⊡</button>
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
                const bg = isMoveSource ? colorFor(cell.type) + '80' : cell.type !== 'empty' ? colorFor(cell.type) + '50' : showZones ? zoneOverlay[zone] : 'var(--color-surface)';
                const hpPct = cell.hp && cell.maxHp ? cell.hp / cell.maxHp : 0;
                const hpColor = hpPct > 0.7 ? '#00ff88' : hpPct > 0.4 ? '#ffd700' : '#ff3333';
                const building = isUnderConstruction(cell.buildCompleteAt, now);
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
                            : showZones ? `1px solid ${zoneBorder[zone]}30` : `1px solid ${cell.type !== 'empty' ? colorFor(cell.type) + '60' : 'var(--color-outline-soft)'}`,
                      boxShadow: isMoveSource ? '0 0 6px #ffd700' : isSelected ? '0 0 8px #00f5ff80' : cell.type === 'castle' ? '0 0 6px #ffd70040' : undefined,
                    }}
                  >
                    {cell.type !== 'empty' ? (
                      <>
                        {!cell.isBody && (
                          <span className="text-sm leading-none">{building ? '🔨' : iconFor(cell.type)}</span>
                        )}
                        {!cell.isBody && building && (
                          <span className="absolute bottom-0 left-0 right-0 text-[7px] text-center text-gold font-bold leading-tight">
                            {remainingLabel(cell.buildCompleteAt, now)}
                          </span>
                        )}
                        {!cell.isBody && cell.level && !building && (
                          <div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 rounded-full overflow-hidden" style={{ background: '#0a0e1a' }}>
                            <div className="h-full rounded-full" style={{ width: `${hpPct * 100}%`, background: hpColor }} />
                          </div>
                        )}
                        {!cell.isBody && cell.level && !building && (
                          <div className="absolute top-0 right-0 w-3 h-3 rounded-full flex items-center justify-center text-[6px]" style={{ background: colorFor(cell.type) }}>
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
              <button key={tabId} onClick={() => setActiveTab(tabId)} className={`flex-1 py-2.5 text-[11px] transition-colors border-b-2 ${activeTab === tabId ? 'text-gp border-gp bg-[#00ff8810]' : 'text-muted border-transparent bg-transparent'}`}>
                {{ buildings: '건물', resources: '자원', units: '유닛', expand: '확장' }[tabId]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'buildings' && (
              <div className="p-3 space-y-2">
                {catalog.map(c => {
                  const type = c.name.toLowerCase() as BuildingType;
                  const color = colorFor(type);
                  const count = countBuildings(type);
                  return (
                    <div key={c.buildingTypeId} className="bg-panel-deep rounded-xl p-2.5 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '25', border: `1px solid ${color}50` }}>
                        <span className="text-base">{iconFor(type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color }}>{nameFor(type)}</span>
                          <span className="text-muted text-[10px]">×{count}</span>
                        </div>
                        <p className="text-muted text-[10px]">{statDesc(c)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'resources' && (
              <div className="p-3 space-y-3">
                <div className="bg-panel-deep rounded-xl p-3">
                  <div className="flex justify-between"><span className="text-gold font-semibold text-xs">⚡ AP</span><span className="text-gold font-bold text-sm">{ap.toLocaleString()}</span></div>
                </div>
                <div className="bg-panel-deep rounded-xl p-3">
                  <div className="flex justify-between mb-1"><span className="text-gp font-semibold text-xs">💎 GP 생산</span><span className="text-gp font-bold text-sm">+{island?.productionRatePerHour ?? 0}/시간</span></div>
                  <div className="space-y-1 mt-2">
                    {countBuildings('workshop') > 0
                      ? <div className="flex justify-between"><span className="text-muted text-[10px]">생산소 ×{countBuildings('workshop')}개</span><span className="text-[10px]" style={{ color: '#00ff88' }}>+{island?.productionRatePerHour ?? 0}/시간</span></div>
                      : <p className="text-muted text-[10px]">생산 건물 없음</p>
                    }
                  </div>
                </div>
                <IslandResearchPanel
                  research={research}
                  isBusy={isResearching}
                  error={researchError}
                  onResearch={handleResearch}
                />
              </div>
            )}
            {activeTab === 'units' && (
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-muted font-semibold text-xs">주둔 유닛</p>
                  {islandMilitary && (
                    <span className="text-[10px] text-gold">🌾 식량 {islandFood.toLocaleString()}</span>
                  )}
                </div>
                {isMilitaryLoading && <LoadingState className="py-4" />}
                {!isMilitaryLoading && islandUnits.map(u => {
                  // 관리자 지정 값 우선, 없으면 기본 매핑
                  const fallback = UNIT_LABELS[u.name] ?? { label: u.name, icon: '⚔', color: '#e0e8ff' };
                  const meta = {
                    label: u.displayName ?? fallback.label,
                    icon: u.icon ?? fallback.icon,
                    color: u.colorHex ?? fallback.color,
                  };
                  return (
                    <div key={u.unitTypeId} className="bg-panel-deep rounded-xl p-3">
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
                {!isMilitaryLoading && islandUnits.length === 0 && (
                  <p className="text-muted text-xs text-center py-4">보유한 유닛이 없습니다</p>
                )}
                <button
                  onClick={() => {
                    if (islandUnits.length) setTrainUnitTypeId(islandUnits[0].unitTypeId);
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
              onClick={() => setShowShop(true)}
              className="w-full h-9 border border-gold text-gold rounded-xl text-xs transition-colors hover:bg-gold/10"
            >🛒 장식 상점</button>
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
        <IslandBuildModal
          selectedCell={selectedCell}
          selectedZone={selectedCellData?.zone}
          gp={gp}
          catalog={catalog}
          selectedBuilding={selectedBuilding}
          buildError={buildError}
          isBuilding={isBuilding}
          onSelectBuilding={setSelectedBuilding}
          onClose={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }}
          onBuild={() => void handleBuild()}
        />
      )}

      {showBuildingAction && selectedCell && selectedCellData && selectedCellData.type !== 'empty' && (
        <IslandBuildingActionPanel
          selectedCell={selectedCell}
          cellData={selectedCellData}
          info={catalog.find(c => c.name.toLowerCase() === selectedCellData.type)}
          onStartMove={handleStartMove}
          onStoreBuilding={handleStoreBuilding}
          onUpgrade={handleUpgradeBuilding}
          onTrain={() => {
            if (islandUnits.length) setTrainUnitTypeId(islandUnits[0].unitTypeId);
            setTrainQuantity(1);
            setShowBuildingAction(false);
            setShowTrainModal(true);
          }}
          onHarvest={() => {
            setShowBuildingAction(false);
            void handleHarvest();
          }}
          onClose={() => setShowBuildingAction(false)}
        />
      )}

      {showTrainModal && militaryData && (
        <IslandTrainUnitModal
          units={islandUnits}
          islandGp={island?.storedGp ?? 0}
          storedFood={islandFood}
          trainUnitTypeId={trainUnitTypeId}
          trainQuantity={trainQuantity}
          trainLevel={trainLevel}
          researchedLevels={researchedLevels}
          isTraining={isTraining}
          onSelectUnit={id => { setTrainUnitTypeId(id); setTrainLevel(1); }}
          onChangeQuantity={setTrainQuantity}
          onChangeLevel={setTrainLevel}
          onTrain={handleProduceUnit}
          onClose={() => setShowTrainModal(false)}
        />
      )}

      {showInventory && (
        <IslandInventoryModal
          inventory={inventory}
          onDeploy={(idx) => { setDeployFromInventoryIdx(idx); setShowInventory(false); }}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showShop && (
        <IslandDecorationShopModal
          ap={ap}
          onPurchased={(apRemaining) => { syncAP(apRemaining); reloadInventory(); }}
          onClose={() => setShowShop(false)}
        />
      )}
    </div>
  );
}
