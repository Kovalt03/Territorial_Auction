import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GNB } from '../components/GNB';
import { HealthBar } from '../components/HealthBar';
import { EmptyState } from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { fetchTerritoryDetail } from '../api/map';
import type { TerritoryDetailResponse } from '../types/territory';

type BuildingType = 'castle' | 'workshop' | 'barracks' | 'storage' | 'wall' | 'tower' | 'empty';

interface Cell {
  type: BuildingType;
  level?: number;
  hp?: number;
  maxHp?: number;
  zone?: 1 | 2 | 3;
}

interface InventoryItem {
  type: BuildingType;
  level: number;
  hp: number;
  maxHp: number;
}

const buildingColors: Record<BuildingType, string> = {
  castle: '#ffd700', workshop: '#00ff88', barracks: '#8b50ff',
  storage: '#00f5ff', wall: '#e0e8ff', tower: '#ff8c00', empty: '#1a1f35',
};

const buildingLabels: Record<BuildingType, string> = {
  castle: '성', workshop: '생산소', barracks: '병영', storage: '저장소',
  wall: '방벽', tower: '방어탑', empty: '',
};

const buildingNames: Record<BuildingType, string> = {
  castle: '성 (Castle)', workshop: '생산소 (Workshop)', barracks: '병영 (Barracks)',
  storage: '저장소 (Storage)', wall: '방벽 (Wall)', tower: '방어탑 (Tower)', empty: '빈 공간',
};

const generateGrid = (): Cell[][] => {
  const pattern: BuildingType[][] = [
    ['empty','empty','empty','empty','empty','empty','empty','empty','empty','empty'],
    ['empty','empty','empty','empty','empty','empty','empty','empty','empty','empty'],
    ['empty','empty','empty','wall','wall','wall','wall','empty','empty','empty'],
    ['empty','empty','workshop','empty','empty','empty','empty','workshop','empty','empty'],
    ['empty','wall','barracks','barracks','barracks','barracks','barracks','wall','empty','empty'],
    ['empty','wall','barracks','castle','castle','barracks','barracks','wall','empty','empty'],
    ['empty','wall','barracks','castle','castle','barracks','barracks','wall','empty','empty'],
    ['empty','wall','barracks','barracks','barracks','barracks','barracks','wall','empty','empty'],
    ['empty','empty','empty','empty','empty','empty','empty','empty','empty','empty'],
    ['empty','empty','empty','empty','empty','empty','empty','empty','empty','empty'],
  ];
  return Array.from({ length: 10 }, (_, y) =>
    Array.from({ length: 10 }, (_, x) => {
      const t = pattern[y][x];
      const hp = t === 'castle' ? [420, 600] : t === 'barracks' ? [80, 100] : t === 'workshop' ? [180, 200] : t === 'wall' ? [320, 400] : t === 'tower' ? [150, 200] : [0, 0];
      const zone: 1 | 2 | 3 = (x >= 3 && x <= 6 && y >= 3 && y <= 6) ? 1 : (x >= 2 && x <= 7 && y >= 2 && y <= 7) ? 2 : 3;
      return { type: t, level: t !== 'empty' ? (t === 'castle' ? 3 : t === 'workshop' ? 2 : 1) : undefined, hp: hp[0], maxHp: hp[1], zone };
    })
  );
};

const GRID_DATA = generateGrid();

export function TerritoryGridPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ap, gp, spendGP } = useApp();
  const [territoryDetail, setTerritoryDetail] = useState<TerritoryDetailResponse | null>(null);

  useEffect(() => {
    const numId = Number(id);
    if (!id || isNaN(numId)) return;
    fetchTerritoryDetail(numId)
      .then(setTerritoryDetail)
      .catch(() => {});
  }, [id]);

  const [grid, setGrid] = useState(GRID_DATA);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);

  // Build modal
  const [showBuild, setShowBuild] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [buildError, setBuildError] = useState('');

  // Building action panel (for occupied cells)
  const [showBuildingAction, setShowBuildingAction] = useState(false);

  // Move mode
  const [moveMode, setMoveMode] = useState(false);
  const [moveSourceCell, setMoveSourceCell] = useState<{ x: number; y: number } | null>(null);

  // Inventory
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [deployFromInventoryIdx, setDeployFromInventoryIdx] = useState<number | null>(null);

  const selectedCellData = selectedCell ? grid[selectedCell.y]?.[selectedCell.x] : null;
  const zoneColor = { 1: '#ff000020', 2: '#ffd70010', 3: '#00f5ff08' };
  const zoneBorder = { 1: '#ff0000', 2: '#ffd700', 3: '#00f5ff' };

  const buildingCosts: Partial<Record<BuildingType, number>> = {
    workshop: 500, barracks: 800, storage: 300, wall: 100, tower: 400,
  };

  const activeBuildingStats = (['castle', 'workshop', 'barracks', 'storage', 'wall', 'tower'] as BuildingType[])
    .map(type => {
      const cells = grid.flat().filter(c => c.type === type);
      if (cells.length === 0) return null;
      const hp = cells.reduce((s, c) => s + (c.hp ?? 0), 0);
      const maxHp = cells.reduce((s, c) => s + (c.maxHp ?? 0), 0);
      const level = Math.max(...cells.map(c => c.level ?? 1));
      return { type, color: buildingColors[type], count: cells.length, hp, maxHp, level };
    })
    .filter(Boolean) as { type: BuildingType; color: string; count: number; hp: number; maxHp: number; level: number }[];

  const cancelModes = () => {
    setMoveMode(false);
    setMoveSourceCell(null);
    setDeployFromInventoryIdx(null);
  };

  const handleCellClick = (x: number, y: number, cell: Cell) => {
    if (moveMode && moveSourceCell) {
      if (cell.type === 'empty') {
        const movingType = grid[moveSourceCell.y][moveSourceCell.x].type;
        const destZone = grid[y][x].zone;
        if (movingType === 'castle' && destZone !== 1) return;
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

  const handleBuild = () => {
    setBuildError('');
    if (!selectedBuilding) { setBuildError('건물을 선택해주세요.'); return; }
    if (!selectedCell) { setBuildError('그리드에서 빈 셀을 선택해주세요.'); return; }
    const cost = buildingCosts[selectedBuilding] ?? 0;
    if (!spendGP(cost)) { setBuildError(`GP가 부족합니다. (필요: ${cost} GP)`); return; }
    const maxHpMap: Partial<Record<BuildingType, number>> = { workshop: 200, barracks: 100, storage: 150, wall: 400, tower: 200 };
    const maxHp = maxHpMap[selectedBuilding] ?? 100;
    setGrid(prev => {
      const next = prev.map(row => row.map(c => ({ ...c })));
      next[selectedCell.y][selectedCell.x] = { type: selectedBuilding, level: 1, hp: maxHp, maxHp, zone: selectedCellData?.zone };
      return next;
    });
    setSelectedBuilding(null);
    setShowBuild(false);
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
    setInventory(prev => [...prev, { type: cell.type, level: cell.level ?? 1, hp: cell.hp ?? 0, maxHp: cell.maxHp ?? 0 }]);
    setGrid(prev => {
      const next = prev.map(row => row.map(c => ({ ...c })));
      next[selectedCell.y][selectedCell.x] = { type: 'empty', zone: next[selectedCell.y][selectedCell.x].zone };
      return next;
    });
    setShowBuildingAction(false);
  };

  return (
    <div className="page-root">
      <GNB />

      <div className="bg-panel border-b border-outline px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-foreground font-bold text-lg">
            {territoryDetail
              ? `영토 (${territoryDetail.coordX}, ${territoryDetail.coordY}) · ${territoryDetail.continentName}`
              : `영토 #${id} 로딩 중...`}
          </span>
          <div className="h-6 px-2 rounded bg-secondary flex items-center">
            <span className="text-white font-bold text-[11px]">{territoryDetail?.grade ?? '-'}급</span>
          </div>
          {territoryDetail?.isInvincible && (
            <div className="flex items-center gap-1 bg-elevated border border-gp rounded px-2 py-1">
              <span className="text-gp text-[11px]">🛡 무적 보호 중</span>
            </div>
          )}
        </div>
        <span className="text-muted text-sm">
          {territoryDetail?.owner ? `소유자: ${territoryDetail.owner.nickname}` : '미점령'}
        </span>
        <button onClick={() => navigate('/app/map')} className="text-muted hover:text-foreground text-xl">✕</button>
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
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border transition-colors text-xs" style={{ color: '#ffd700', borderColor: '#ffd70060' }}>취소</button>
        </div>
      )}
      {deployFromInventoryIdx !== null && inventory[deployFromInventoryIdx] && (
        <div className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b border-[#00ff8860]" style={{ background: '#001a10' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">📦</span>
            <span className="text-gp font-semibold text-[13px]">
              배치 모드 — 배치할 빈 셀을 클릭하세요
              <span className="text-muted ml-2 text-[11px]">({buildingNames[inventory[deployFromInventoryIdx].type]})</span>
            </span>
          </div>
          <button onClick={cancelModes} className="h-7 px-3 rounded-lg border transition-colors text-xs" style={{ color: '#00ff88', borderColor: '#00ff8860' }}>취소</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Grid */}
        <div className="flex-1 p-5 overflow-auto">
          <div className="grid gap-1 max-w-[680px] mx-auto" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
            {grid.map((row, y) =>
              row.map((cell, x) => {
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                const isMoveSource = moveSourceCell?.x === x && moveSourceCell?.y === y;
                const isActionTarget = (moveMode || deployFromInventoryIdx !== null) && cell.type === 'empty';
                const bg = isMoveSource ? buildingColors[cell.type] + '80' : cell.type !== 'empty' ? buildingColors[cell.type] + '60' : 'var(--color-surface)';
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
                            : `1px solid ${cell.type !== 'empty' ? buildingColors[cell.type] + '80' : '#1a2a3a'}`,
                      boxShadow: isMoveSource ? '0 0 8px #ffd700' : isSelected ? '0 0 8px #00f5ff' : undefined,
                    }}
                  >
                    {cell.type !== 'empty' ? (
                      <div className="flex flex-col items-center justify-center h-full w-full p-1">
                        <span className="font-bold text-[11px]" style={{ color: buildingColors[cell.type] }}>
                          {buildingLabels[cell.type]}
                        </span>
                        {cell.level && (
                          <div className="w-full mt-0.5">
                            <HealthBar hp={cell.hp!} maxHp={cell.maxHp!} color={buildingColors[cell.type]} height="h-1" />
                            <span className="text-[7px]" style={{ color: buildingColors[cell.type] }}>Lv.{cell.level}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span
                        className={isActionTarget ? 'text-sm' : 'text-base'}
                        style={{ color: isActionTarget ? '#00ff8860' : '#354064' }}
                      >
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

        {/* Sidebar */}
        <div className="w-[240px] bg-surface border-l border-outline flex flex-col">
          <div className="p-4 space-y-3 border-b border-outline">
            <p className="text-muted font-semibold text-xs">자원 현황</p>
            {[
              { label: 'AP', val: ap.toLocaleString(), color: '#ff0066' },
              { label: 'GP', val: gp.toLocaleString(), color: '#00ff88' },
              { label: '금고', val: '8,200', color: '#ffd700' },
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
                  <span className="text-[11px]" style={{ color: b.color }}>{buildingLabels[b.type]}{b.count > 1 ? ` ×${b.count}` : ''}</span>
                  <span className="text-muted text-[10px]">Lv.{b.level}</span>
                </div>
                <HealthBar hp={b.hp} maxHp={b.maxHp} color={b.color} height="h-1.5" />
                <span className="text-muted text-[9px]">{b.hp}/{b.maxHp}</span>
              </div>
            ))}
          </div>

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
            <button className="w-full h-9 border border-secondary rounded-lg text-secondary hover:bg-[#8b50ff20] transition-colors text-xs">
              유닛 배치
            </button>
            <button className="w-full h-9 bg-gold rounded-lg text-surface font-bold hover:brightness-110 transition-all text-xs">
              금고로 이전
            </button>
          </div>
        </div>
      </div>

      {/* ───── Build modal ───── */}
      {showBuild && (
        <div className="modal-side-overlay">
          <div className="modal-backdrop" onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }} />
          <div className="relative bg-panel border-[1.5px] border-primary w-[540px] flex flex-col overflow-hidden">
            <div className="bg-elevated px-5 py-4 border-b-2 border-primary flex items-center justify-between">
              <div>
                <h3 className="text-foreground font-bold text-xl">🏗  건물 건설</h3>
                <p className="text-muted text-xs">
                  {selectedCell
                    ? `위치: (${selectedCell.x}, ${selectedCell.y}) · Zone ${selectedCellData?.zone ?? '-'} · `
                    : '빈 셀을 클릭하여 위치를 선택하세요 · '}
                  보유 GP: {gp.toLocaleString()}
                </p>
              </div>
              <button onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }} className="btn-close">✕</button>
            </div>

            <div className="bg-elevated border border-gold rounded-xl mx-4 mt-4 px-4 py-2.5">
              <span className="text-gold text-[11px]">ℹ  성(Castle)은 Zone 1 핵심 구역에만 배치 가능합니다</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 mt-4 space-y-2">
              {[
                { type: 'castle' as BuildingType, name: '성 (Castle)', desc: '영토의 핵심 — HP 0 시 경매 전환', size: '2×2', zone: 'Zone 1 전용', cost: null, zoneRestricted: true },
                { type: 'workshop' as BuildingType, name: '생산소 (Workshop)', desc: 'GP 생산 +20/분', size: '2×2', zone: '어디든', cost: '500 GP', zoneRestricted: false },
                { type: 'barracks' as BuildingType, name: '병영 (Barracks)', desc: '유닛 생산 가능', size: '2×2', zone: '어디든', cost: '800 GP', zoneRestricted: false },
                { type: 'storage' as BuildingType, name: '저장소 (Storage)', desc: '자원 1,000 GP 보관', size: '1×2', zone: '어디든', cost: '300 GP', zoneRestricted: false },
                { type: 'wall' as BuildingType, name: '방벽 (Wall)', desc: 'Zone 방어력 +50', size: '1×1', zone: '어디든', cost: '100 GP', zoneRestricted: false },
                { type: 'tower' as BuildingType, name: '방어탑 (Tower)', desc: '자동 방어 +자동 공격', size: '1×1', zone: '어디든', cost: '400 GP', zoneRestricted: false },
              ].map(b => {
                const isSel = selectedBuilding === b.type;
                return (
                  <div
                    key={b.type}
                    onClick={() => !b.zoneRestricted && setSelectedBuilding(b.type)}
                    className="rounded-xl p-4 flex items-center gap-3 border transition-all"
                    style={{
                      background: isSel ? buildingColors[b.type] + '20' : '#2a3050',
                      borderColor: isSel ? buildingColors[b.type] : buildingColors[b.type] + '60',
                      opacity: b.zoneRestricted ? 0.4 : 1,
                      cursor: b.zoneRestricted ? 'not-allowed' : 'pointer',
                      boxShadow: isSel ? `0 0 8px ${buildingColors[b.type]}40` : undefined,
                    }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: buildingColors[b.type] + '30' }}>
                      <span className="text-[22px]" style={{ color: buildingColors[b.type] }}>{buildingLabels[b.type]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground font-semibold text-sm">{b.name}</p>
                      <p className="text-muted text-[11px]">{b.desc}</p>
                      <p className="text-muted text-[10px]">크기: {b.size}  ·  Zone: {b.zone}</p>
                    </div>
                    {b.zoneRestricted ? (
                      <div className="bg-danger/10 border border-danger/25 rounded px-2 py-1">
                        <span className="text-danger text-[10px]">Zone 제한</span>
                      </div>
                    ) : b.cost && (
                      <div className="border rounded px-2 py-1" style={{ background: isSel ? buildingColors[b.type] + '30' : 'var(--color-panel)', borderColor: buildingColors[b.type] }}>
                        <span className="text-xs" style={{ color: buildingColors[b.type] }}>{b.cost}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {buildError && (
              <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-[#ff004420] border border-[#ff0044]">
                <span className="text-danger text-xs">⚠ {buildError}</span>
              </div>
            )}

            <div className="border-t border-outline p-4 flex gap-3">
              <button
                onClick={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }}
                className="flex-1 h-14 bg-elevated border border-outline rounded-xl text-muted text-sm"
              >
                취소
              </button>
              <button
                onClick={handleBuild}
                disabled={!selectedBuilding}
                className="flex-1 h-14 rounded-xl font-bold transition-all text-sm"
                style={{
                  background: selectedBuilding ? '#00f5ff' : '#2a3050',
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
        <div className="modal-sheet-overlay">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBuildingAction(false)} />
          <div className="modal-sheet-panel">
            <div className="modal-header" style={{ background: buildingColors[selectedCellData.type] + '20', borderBottom: `2px solid ${buildingColors[selectedCellData.type]}` }}>
              <div>
                <h3 className="font-bold text-lg" style={{ color: buildingColors[selectedCellData.type] }}>
                  {buildingNames[selectedCellData.type]}
                </h3>
                <p className="text-muted text-xs">
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
              <HealthBar hp={selectedCellData.hp ?? 0} maxHp={selectedCellData.maxHp ?? 0} color={buildingColors[selectedCellData.type]} height="h-2" bg="bg-surface" />
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
            {selectedCellData.type === 'castle' && (
              <p className="text-center text-muted pb-3 text-[11px]">성(Castle)은 영토의 핵심 건물로 보관함에 담을 수 없습니다</p>
            )}
          </div>
        </div>
      )}

      {/* ───── Inventory modal ───── */}
      {showInventory && (
        <div className="modal-center-overlay">
          <div className="modal-backdrop" onClick={() => setShowInventory(false)} />
          <div className="relative rounded-2xl overflow-hidden flex flex-col" style={{ width: 480, maxHeight: '70vh', background: '#1a1f35', border: '1.5px solid #8b50ff' }}>
            <div className="modal-header-secondary" style={{ background: '#1a0a35' }}>
              <div>
                <h3 className="text-secondary font-bold text-xl">📦 보관함</h3>
                <p className="text-muted text-xs">건물 {inventory.length}개 보관 중 · 배치하기를 눌러 그리드에 재배치</p>
              </div>
              <button onClick={() => setShowInventory(false)} className="btn-close">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {inventory.length === 0 ? (
                <EmptyState
                  emoji="📭"
                  message="보관함이 비어 있습니다"
                  subMessage='건물 셀을 클릭한 뒤 "보관함에 담기"를 선택하세요'
                  className="py-16"
                />
              ) : (
                <div className="space-y-2">
                  {inventory.map((item, idx) => {
                    const color = buildingColors[item.type];
                    return (
                      <div key={idx} className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#2a3050', border: `1px solid ${color}50` }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '25', border: `1px solid ${color}60` }}>
                          <span className="text-[22px]" style={{ color }}>{buildingLabels[item.type]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color }}>{buildingNames[item.type]}</p>
                          <p className="text-muted text-[11px]">Lv.{item.level}</p>
                          <HealthBar hp={item.hp} maxHp={item.maxHp} color={color} height="h-1.5" className="mt-1" />
                          <span className="text-muted text-[9px]">HP {item.hp}/{item.maxHp}</span>
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
