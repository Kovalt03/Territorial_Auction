import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useApp } from '../context/AppContext';
import { fetchTerritoryDetail } from '../api/map';

import { GNB } from '../components/GNB';
import { HealthBar } from '../components/HealthBar';

import type { TerritoryDetailResponse } from '../types/territory';

import { TerritoryGridBuildModal } from './TerritoryGridBuildModal';
import { TerritoryGridBuildingActionPanel } from './TerritoryGridBuildingActionPanel';
import { TerritoryGridInventoryModal } from './TerritoryGridInventoryModal';

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
      .catch((e) => console.warn('[TerritoryGridPage] detail load failed', e));
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
                            : `1px solid ${cell.type !== 'empty' ? buildingColors[cell.type] + '80' : 'var(--color-outline-soft)'}`,
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

      {showBuild && (
        <TerritoryGridBuildModal
          selectedCell={selectedCell}
          selectedZone={selectedCellData?.zone}
          gp={gp}
          selectedBuilding={selectedBuilding}
          buildError={buildError}
          buildingColors={buildingColors}
          buildingLabels={buildingLabels}
          onSelectBuilding={setSelectedBuilding}
          onClose={() => { setShowBuild(false); setSelectedBuilding(null); setBuildError(''); }}
          onBuild={handleBuild}
        />
      )}

      {showBuildingAction && selectedCell && selectedCellData && selectedCellData.type !== 'empty' && (
        <TerritoryGridBuildingActionPanel
          selectedCell={selectedCell}
          cellData={selectedCellData}
          buildingColors={buildingColors}
          buildingNames={buildingNames}
          onStartMove={handleStartMove}
          onStoreBuilding={handleStoreBuilding}
          onClose={() => setShowBuildingAction(false)}
        />
      )}

      {showInventory && (
        <TerritoryGridInventoryModal
          inventory={inventory}
          buildingColors={buildingColors}
          buildingLabels={buildingLabels}
          buildingNames={buildingNames}
          onDeploy={(idx) => { setDeployFromInventoryIdx(idx); setShowInventory(false); }}
          onClose={() => setShowInventory(false)}
        />
      )}
    </div>
  );
}
