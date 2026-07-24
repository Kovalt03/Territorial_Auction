import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useApp } from '../context/AppContext';
import { fetchTerritoryDetail } from '../api/map';
import {
  fetchTerritoryBuildings, placeTerritoryBuilding,
  placeFromInventoryOnTerritory, upgradeTerritoryBuilding,
} from '../api/territoryBuilding';
import {
  fetchBuildingTypes, fetchBuildingInventory,
  storeBuilding as storeBuildingApi, moveBuilding as moveBuildingApi,
} from '../api/island';
import { ApiError } from '../api/client';

import { GNB } from '../components/GNB';
import { HealthBar } from '../components/HealthBar';

import type { TerritoryDetailResponse, TerritoryGridBuilding } from '../types/territory';
import type { BuildingTypeInfo, InventoryItem } from '../types/island';

import {
  type BuildingType, type Cell,
  buildingColors, buildingLabels, buildingNames,
  emptyGrid, buildGrid, isUnderConstruction, remainingLabel,
} from './islandGrid';
import { IslandToast } from './IslandToast';
import { TerritoryGridBuildModal } from './TerritoryGridBuildModal';
import { TerritoryGridBuildingActionPanel } from './TerritoryGridBuildingActionPanel';
import { TerritoryGridInventoryModal } from './TerritoryGridInventoryModal';
import { TerritoryDeployModal } from './TerritoryDeployModal';
import { IslandTrainUnitModal } from './IslandTrainUnitModal';
import { useMilitary } from '../hooks/useMilitary';
import { deployUnit, recallUnit, produceUnit, fetchTerritoryGarrison, fetchResearch } from '../api/military';
import type { GarrisonUnit, ResearchStatus } from '../types/military';

const GARRISON_CAP: Record<string, number> = { castle: 5, residence: 5, tower: 3, wall: 2 };

export function TerritoryGridPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ap, gp, userId } = useApp();
  const territoryId = Number(id);

  const { data: militaryData, reload: reloadMilitary } = useMilitary();
  const [deployBuilding, setDeployBuilding] = useState<{ buildingId: number; name: string; capacityPerLevel: number } | null>(null);
  const [garrison, setGarrison] = useState<GarrisonUnit[]>([]);
  const [isGarrisonBusy, setIsGarrisonBusy] = useState(false);
  const [showTrain, setShowTrain] = useState(false);
  const [trainUnitTypeId, setTrainUnitTypeId] = useState<number | null>(null);
  const [trainQuantity, setTrainQuantity] = useState(1);
  const [trainLevel, setTrainLevel] = useState(1);
  const [isTraining, setIsTraining] = useState(false);
  const [research, setResearch] = useState<ResearchStatus | null>(null);
  const researchedLevels = Object.fromEntries(
    (research?.units ?? []).map(u => [u.unitTypeId, u.researchedLevel]),
  ) as Record<number, number>;
  const [detail, setDetail] = useState<TerritoryDetailResponse | null>(null);
  const [buildings, setBuildings] = useState<TerritoryGridBuilding[]>([]);
  const [catalog, setCatalog] = useState<BuildingTypeInfo[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);
  const showToast = useCallback((message: string, isError = true) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const reloadDetail = useCallback(() => {
    if (!territoryId) return;
    fetchTerritoryDetail(territoryId)
      .then(setDetail)
      .catch(e => { setError(e instanceof ApiError ? e.message : '영토 정보를 불러올 수 없습니다.'); console.warn('[TerritoryGridPage] detail', e); });
  }, [territoryId]);

  const reloadBuildings = useCallback(() => {
    if (!territoryId) return;
    fetchTerritoryBuildings(territoryId)
      .then(setBuildings)
      .catch(e => { setError(e instanceof ApiError ? e.message : '건물 목록을 불러올 수 없습니다.'); console.warn('[TerritoryGridPage] buildings', e); });
  }, [territoryId]);

  const reloadInventory = useCallback(() => {
    fetchBuildingInventory().then(setInventory).catch(e => console.warn('[TerritoryGridPage] inventory', e));
  }, []);

  useEffect(() => { reloadDetail(); reloadBuildings(); reloadInventory(); }, [reloadDetail, reloadBuildings, reloadInventory]);
  useEffect(() => {
    fetchBuildingTypes().then(setCatalog).catch(e => console.warn('[TerritoryGridPage] building types', e));
  }, []);

  const gridSize = detail?.gridSize ?? 10;
  const z1 = detail?.zone1Radius ?? 2;
  const z2 = detail?.zone2Radius ?? 4;
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid(10, 2, 4));
  useEffect(() => {
    setGrid(buildGrid(gridSize, z1, z2, buildings));
  }, [gridSize, z1, z2, buildings]);

  // 건설 중인 건물이 있는 동안만 1초마다 갱신하고, 완료 시점에 다시 불러온다.
  const [now, setNow] = useState(() => Date.now());
  const hasConstruction = buildings.some(b => isUnderConstruction(b.buildCompleteAt, now));
  useEffect(() => {
    if (!hasConstruction) return;
    const timer = setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (!buildings.some(b => isUnderConstruction(b.buildCompleteAt, next))) reloadBuildings();
    }, 1000);
    return () => clearInterval(timer);
  }, [hasConstruction, buildings, reloadBuildings]);

  const isOwner = detail?.owner?.userId != null && detail.owner.userId === userId;

  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [showBuild, setShowBuild] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [buildError, setBuildError] = useState('');
  const [showBuildingAction, setShowBuildingAction] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [moveSourceCell, setMoveSourceCell] = useState<{ x: number; y: number } | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [deployFromInventoryIdx, setDeployFromInventoryIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedCellData = selectedCell ? grid[selectedCell.y]?.[selectedCell.x] : null;
  const zoneColor = { 1: '#ff000020', 2: '#ffd70010', 3: '#00f5ff08' };
  const zoneBorder = { 1: '#ff0000', 2: '#ffd700', 3: '#00f5ff' };

  const catalogByType = new Map(catalog.map(c => [c.name.toLowerCase(), c]));
  const iconFor = (t: BuildingType) => catalogByType.get(t)?.icon ?? buildingLabels[t] ?? '🏗';
  const colorFor = (t: BuildingType) => catalogByType.get(t)?.colorHex ?? buildingColors[t] ?? '#8892b0';
  const nameFor = (t: BuildingType) => catalogByType.get(t)?.displayName ?? buildingNames[t] ?? t;

  const activeBuildingStats = Array.from(new Set(buildings.map(b => b.type.toLowerCase() as BuildingType)))
    .map(type => {
      const own = buildings.filter(b => b.type.toLowerCase() === type && !b.isDestroyed);
      if (own.length === 0) return null;
      return {
        type,
        color: colorFor(type),
        count: own.length,
        hp: own.reduce((s, b) => s + b.hp, 0),
        maxHp: own.reduce((s, b) => s + b.maxHp, 0),
        level: Math.max(...own.map(b => b.level)),
      };
    })
    .filter(Boolean) as { type: BuildingType; color: string; count: number; hp: number; maxHp: number; level: number }[];

  const cancelModes = () => {
    setMoveMode(false);
    setMoveSourceCell(null);
    setDeployFromInventoryIdx(null);
  };

  const run = async (fn: () => Promise<void>, fallback: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const handleCellClick = (x: number, y: number, cell: Cell) => {
    if (moveMode && moveSourceCell) {
      if (cell.type !== 'empty') return;
      const buildingId = grid[moveSourceCell.y][moveSourceCell.x].buildingId;
      if (!buildingId) return;
      void run(async () => {
        await moveBuildingApi(buildingId, x, y);
        cancelModes();
        reloadBuildings();
        showToast('건물을 이동했습니다', false);
      }, '이동에 실패했습니다');
      return;
    }
    if (deployFromInventoryIdx !== null) {
      if (cell.type !== 'empty') return;
      const item = inventory[deployFromInventoryIdx];
      void run(async () => {
        await placeFromInventoryOnTerritory(item.inventoryId, territoryId, x, y);
        cancelModes();
        reloadBuildings();
        reloadInventory();
        showToast('건물을 배치했습니다', false);
      }, '배치에 실패했습니다');
      return;
    }
    setSelectedCell({ x, y });
    if (cell.type === 'empty') setShowBuild(true);
    else setShowBuildingAction(true);
  };

  const handleBuild = () => {
    setBuildError('');
    if (!selectedBuilding) { setBuildError('건물을 선택해주세요.'); return; }
    if (!selectedCell) { setBuildError('그리드에서 빈 셀을 선택해주세요.'); return; }
    const type = catalogByType.get(selectedBuilding);
    if (!type) { setBuildError('건물 정보를 찾을 수 없습니다.'); return; }
    void (async () => {
      try {
        await placeTerritoryBuilding(territoryId, type.buildingTypeId, selectedCell.x, selectedCell.y);
        // 건설은 영토 저장소 GP에서 차감 — 금고(vault)와 무관. 영토 상세를 다시 불러온다.
        setShowBuild(false);
        setSelectedBuilding(null);
        reloadBuildings();
        reloadDetail();
        showToast(`${nameFor(selectedBuilding)} 건설을 시작했습니다`, false);
      } catch (e) {
        setBuildError(e instanceof ApiError ? e.message : '건설에 실패했습니다.');
      }
    })();
  };

  const handleStartMove = () => {
    if (!selectedCell) return;
    setMoveSourceCell(selectedCell);
    setMoveMode(true);
    setShowBuildingAction(false);
  };

  const reloadGarrison = useCallback(() => {
    fetchTerritoryGarrison(territoryId)
      .then(setGarrison)
      .catch(e => console.warn('[TerritoryGridPage] garrison load failed', e));
  }, [territoryId]);

  const handleOpenGarrison = () => {
    if (!selectedCellData?.buildingId) return;
    const cap = GARRISON_CAP[selectedCellData.type] ?? 0;
    setDeployBuilding({ buildingId: selectedCellData.buildingId, name: nameFor(selectedCellData.type), capacityPerLevel: cap });
    setShowBuildingAction(false);
    reloadGarrison();
  };

  const territoryUnits = militaryData?.locations.find(
    l => l.locationType === 'TERRITORY' && l.locationId === territoryId,
  );

  const handleOpenTrain = () => {
    fetchResearch().then(setResearch).catch(e => console.warn('[TerritoryGridPage] research load failed', e));
    const units = territoryUnits?.units ?? [];
    if (units.length) setTrainUnitTypeId(units[0].unitTypeId);
    setTrainQuantity(1);
    setShowBuildingAction(false);
    setShowTrain(true);
  };

  const handleTrain = async () => {
    if (!trainUnitTypeId || trainQuantity < 1) return;
    setIsTraining(true);
    try {
      const res = await produceUnit(trainUnitTypeId, trainQuantity, territoryId, 'TERRITORY', trainLevel);
      reloadMilitary();
      reloadDetail();
      showToast(`유닛 ${res.quantity}기 훈련 완료`, false);
      setShowTrain(false);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '훈련에 실패했습니다', true);
    } finally {
      setIsTraining(false);
    }
  };

  const handleDeploy = async (p: { buildingId: number; unitTypeId: number; quantity: number; sourceLocationId: number; sourceLocationType: 'ISLAND' | 'TERRITORY' }) => {
    setIsGarrisonBusy(true);
    try {
      const res = await deployUnit({ territoryId, ...p });
      reloadMilitary();
      reloadBuildings();
      showToast(`유닛 ${res.deployedCount}기를 주둔시켰습니다`, false);
      setDeployBuilding(null);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '주둔에 실패했습니다', true);
    } finally {
      setIsGarrisonBusy(false);
    }
  };

  const handleRecall = async (unitTypeId: number, quantity: number) => {
    setIsGarrisonBusy(true);
    try {
      const res = await recallUnit(territoryId, unitTypeId, quantity);
      reloadMilitary();
      reloadGarrison();
      showToast(`유닛 ${res.recalledCount}기를 회수했습니다`, false);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '회수에 실패했습니다', true);
    } finally {
      setIsGarrisonBusy(false);
    }
  };

  const handleStoreBuilding = () => {
    const buildingId = selectedCellData?.buildingId;
    if (!buildingId) return;
    void run(async () => {
      await storeBuildingApi(buildingId);
      setShowBuildingAction(false);
      reloadBuildings();
      reloadInventory();
      showToast('보관함에 넣었습니다', false);
    }, '보관에 실패했습니다');
  };

  const handleUpgradeBuilding = () => {
    const buildingId = selectedCellData?.buildingId;
    if (!buildingId) return;
    void run(async () => {
      const res = await upgradeTerritoryBuilding(buildingId);
      // 업그레이드도 영토 저장소 GP에서 차감 — 금고와 무관.
      setShowBuildingAction(false);
      reloadBuildings();
      reloadDetail();
      showToast(
        res.buildCompleteAt
          ? `Lv.${res.newLevel} 업그레이드 시작 — ${remainingLabel(res.buildCompleteAt, Date.now())} 후 완료`
          : `Lv.${res.newLevel}으로 업그레이드 완료`,
        false,
      );
    }, '업그레이드에 실패했습니다');
  };

  if (!territoryId) return <div className="page-root"><GNB /><p className="text-danger p-6">잘못된 영토입니다.</p></div>;

  return (
    <div className="page-root">
      <GNB />
      {toast && <IslandToast message={toast.message} isError={toast.isError} onClose={() => setToast(null)} />}

      <div className="bg-panel border-b border-outline px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-foreground font-bold text-lg">
            {detail ? `영토 (${detail.coordX}, ${detail.coordY}) · ${detail.continentName}` : `영토 #${id} 로딩 중...`}
          </span>
          <div className="h-6 px-2 rounded bg-secondary flex items-center">
            <span className="text-white font-bold text-[11px]">{detail?.grade ?? '-'}급</span>
          </div>
          <span className="text-muted text-[11px]">{gridSize}×{gridSize}</span>
          {detail?.isInvincible && (
            <div className="flex items-center gap-1 bg-elevated border border-gp rounded px-2 py-1">
              <span className="text-gp text-[11px]">🛡 무적 보호 중</span>
            </div>
          )}
        </div>
        <span className="text-muted text-sm">
          {detail?.owner ? `소유자: ${detail.owner.nickname}` : '미점령'}
        </span>
        <button onClick={() => navigate('/app/map')} className="text-muted hover:text-foreground text-xl">✕</button>
      </div>

      {error && <p className="text-danger text-xs px-5 py-2">⚠ {error}</p>}

      {moveMode && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[#ffd70060]" style={{ background: '#1a1200' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">🔄</span>
            <span className="text-gold font-semibold text-[13px]">
              이동 모드 — 이동할 빈 셀을 클릭하세요
              {moveSourceCell && <span className="text-muted ml-2 text-[11px]">출발: ({moveSourceCell.x}, {moveSourceCell.y})</span>}
            </span>
          </div>
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border transition-colors text-xs" style={{ color: '#ffd700', borderColor: '#ffd70060' }}>취소</button>
        </div>
      )}
      {deployFromInventoryIdx !== null && inventory[deployFromInventoryIdx] && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[#00ff8860]" style={{ background: '#001a10' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">📦</span>
            <span className="text-gp font-semibold text-[13px]">
              배치 모드 — 배치할 빈 셀을 클릭하세요
              <span className="text-muted ml-2 text-[11px]">
                ({nameFor(inventory[deployFromInventoryIdx].buildingType.toLowerCase() as BuildingType)})
              </span>
            </span>
          </div>
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border transition-colors text-xs" style={{ color: '#00ff88', borderColor: '#00ff8860' }}>취소</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-5 overflow-auto">
          <div className="grid gap-1 max-w-[680px] mx-auto" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
            {grid.map((row, y) =>
              row.map((cell, x) => {
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                const isMoveSource = moveSourceCell?.x === x && moveSourceCell?.y === y;
                const isActionTarget = (moveMode || deployFromInventoryIdx !== null) && cell.type === 'empty';
                const building = isUnderConstruction(cell.buildCompleteAt, now);
                const color = colorFor(cell.type);
                const zone = cell.zone ?? 3;
                const bg = isMoveSource ? color + '80'
                  : cell.type !== 'empty' ? color + '60'
                  : zoneColor[zone];
                return (
                  <div
                    key={`${x}-${y}`}
                    onClick={() => handleCellClick(x, y, cell)}
                    className="relative aspect-square rounded cursor-pointer flex items-center justify-center transition-all hover:opacity-90"
                    style={{
                      background: bg,
                      border: isMoveSource
                        ? '2px solid #ffd700'
                        : isSelected
                          ? '2px solid #00f5ff'
                          : isActionTarget
                            ? '1px dashed #00ff8880'
                            : `1px solid ${cell.type !== 'empty' ? color + '80' : zoneBorder[zone] + '30'}`,
                      boxShadow: isMoveSource ? '0 0 8px #ffd700' : isSelected ? '0 0 8px #00f5ff' : undefined,
                    }}
                  >
                    {cell.type !== 'empty' ? (
                      <div className="flex flex-col items-center justify-center h-full w-full p-1">
                        {!cell.isBody && (
                          <span className="text-[13px] leading-none">{building ? '🔨' : iconFor(cell.type)}</span>
                        )}
                        {!cell.isBody && building && (
                          <span className="text-[7px] text-gold font-bold">{remainingLabel(cell.buildCompleteAt, now)}</span>
                        )}
                        {!cell.isBody && !building && cell.level && (
                          <div className="w-full mt-0.5">
                            <HealthBar hp={cell.hp!} maxHp={cell.maxHp!} color={color} height="h-1" />
                            <span className="text-[7px]" style={{ color }}>Lv.{cell.level}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={isActionTarget ? 'text-sm' : 'text-base'} style={{ color: isActionTarget ? '#00ff8860' : '#354064' }}>
                        {isActionTarget ? '⊕' : '+'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-4 mt-4 justify-center">
            {[3, 2, 1].map(z => (
              <div key={z} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm border" style={{ background: zoneColor[z as 1|2|3], borderColor: zoneBorder[z as 1|2|3] }} />
                <span className="text-muted text-[11px]">Zone {z}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-[240px] bg-surface border-l border-outline flex flex-col">
          <div className="p-4 space-y-3 border-b border-outline">
            <p className="text-muted font-semibold text-xs">자원 현황</p>
            {[
              { label: 'AP', val: ap.toLocaleString(), color: '#ff0066' },
              { label: '금고 GP', val: gp.toLocaleString(), color: '#00ff88' },
              { label: '영토 저장 GP', val: (detail?.storedGp ?? 0).toLocaleString(), color: '#ffd700' },
            ].map(item => (
              <div key={item.label} className="bg-panel-deep rounded-lg p-3 flex items-center justify-between">
                <span className="text-muted text-[11px]">{item.label}</span>
                <p className="font-bold text-base" style={{ color: item.color }}>{item.val}</p>
              </div>
            ))}
          </div>

          <div className="p-4 space-y-2 border-b border-outline flex-1 overflow-y-auto">
            <p className="text-muted font-semibold text-xs">건물 현황</p>
            {activeBuildingStats.length === 0 ? (
              <p className="text-outline text-[11px]">배치된 건물 없음</p>
            ) : activeBuildingStats.map(b => (
              <div key={b.type}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[11px]" style={{ color: b.color }}>{nameFor(b.type)}{b.count > 1 ? ` ×${b.count}` : ''}</span>
                  <span className="text-muted text-[10px]">Lv.{b.level}</span>
                </div>
                <HealthBar hp={b.hp} maxHp={b.maxHp} color={b.color} height="h-1.5" />
                <span className="text-muted text-[9px]">{b.hp}/{b.maxHp}</span>
              </div>
            ))}
          </div>

          {isOwner && (
            <div className="p-3 space-y-2">
              <button
                onClick={() => { setSelectedCell(null); setShowBuild(true); }}
                className="w-full h-9 border border-primary rounded-lg text-primary hover:bg-primary/10 transition-colors text-xs"
              >
                건물 추가
              </button>
              <button
                onClick={() => setShowInventory(true)}
                className="relative w-full h-9 border border-secondary rounded-lg text-secondary transition-colors hover:bg-[#8b50ff20] text-xs"
              >
                📦 보관함
                {inventory.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center text-[10px]">
                    {inventory.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {showBuild && (
        <TerritoryGridBuildModal
          selectedCell={selectedCell}
          selectedZone={selectedCellData?.zone}
          gp={gp}
          catalog={catalog}
          selectedBuilding={selectedBuilding}
          buildError={buildError}
          onSelectBuilding={setSelectedBuilding}
          onClose={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }}
          onBuild={handleBuild}
        />
      )}

      {showBuildingAction && selectedCell && selectedCellData && selectedCellData.type !== 'empty' && (
        <TerritoryGridBuildingActionPanel
          selectedCell={selectedCell}
          cellData={selectedCellData}
          isUnderConstruction={isUnderConstruction(selectedCellData.buildCompleteAt, now)}
          color={colorFor(selectedCellData.type)}
          name={nameFor(selectedCellData.type)}
          busy={busy}
          onStartMove={handleStartMove}
          onStoreBuilding={handleStoreBuilding}
          onUpgrade={handleUpgradeBuilding}
          onVaultTransfer={() => navigate('/app/vault')}
          onGarrison={handleOpenGarrison}
          onTrain={handleOpenTrain}
          onClose={() => setShowBuildingAction(false)}
        />
      )}

      {showTrain && (
        <IslandTrainUnitModal
          units={territoryUnits?.units ?? []}
          islandGp={detail?.storedGp ?? 0}
          storedFood={territoryUnits?.storedFood ?? 0}
          trainUnitTypeId={trainUnitTypeId}
          trainQuantity={trainQuantity}
          trainLevel={trainLevel}
          researchedLevels={researchedLevels}
          isTraining={isTraining}
          onSelectUnit={id => { setTrainUnitTypeId(id); setTrainLevel(1); }}
          onChangeQuantity={setTrainQuantity}
          onChangeLevel={setTrainLevel}
          onTrain={handleTrain}
          onClose={() => setShowTrain(false)}
        />
      )}

      {deployBuilding && (
        <TerritoryDeployModal
          building={deployBuilding}
          locations={militaryData?.locations ?? []}
          garrison={garrison}
          isBusy={isGarrisonBusy}
          onDeploy={handleDeploy}
          onRecall={handleRecall}
          onClose={() => setDeployBuilding(null)}
        />
      )}

      {showInventory && (
        <TerritoryGridInventoryModal
          inventory={inventory}
          catalog={catalog}
          onDeploy={(idx) => { setDeployFromInventoryIdx(idx); setShowInventory(false); }}
          onClose={() => setShowInventory(false)}
        />
      )}
    </div>
  );
}
