import { buildingColors, buildingNames, type Cell } from './islandGrid';

interface Props {
  selectedCell: { x: number; y: number };
  cellData: Cell;
  onStartMove: () => void;
  onStoreBuilding: () => void;
  onUpgrade: () => void;
  onClose: () => void;
}

const MAX_BUILDING_LEVEL = 3;

export function IslandBuildingActionPanel({
  selectedCell, cellData, onStartMove, onStoreBuilding, onUpgrade, onClose,
}: Props) {
  const color = buildingColors[cellData.type];
  const curLevel = cellData.level ?? 1;
  const isMaxLevel = curLevel >= MAX_BUILDING_LEVEL;
  const isCastle = cellData.type === 'castle';

  return (
    <div className="modal-sheet-overlay">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="modal-sheet-panel">
        <div
          className="modal-header"
          style={{ background: color + '20', borderBottom: `2px solid ${color}` }}
        >
          <div>
            <h3 className="font-bold text-lg" style={{ color }}>
              {buildingNames[cellData.type]}
            </h3>
            <p className="text-muted text-xs">
              위치: ({selectedCell.x}, {selectedCell.y}) · Zone {cellData.zone} · Lv.{cellData.level}
            </p>
          </div>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <div className="px-5 py-3 border-b border-outline">
          <div className="flex justify-between mb-1">
            <span className="text-muted text-[11px]">HP</span>
            <span className="text-[11px]" style={{ color }}>{cellData.hp} / {cellData.maxHp}</span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${cellData.maxHp ? Math.round((cellData.hp! / cellData.maxHp!) * 100) : 0}%`,
                background: color,
              }}
            />
          </div>
        </div>

        <div className="p-4 flex gap-3">
          <button
            onClick={onStartMove}
            className="flex-1 h-12 rounded-xl font-semibold border border-gold/40 text-gold hover:bg-gold/10 transition-all text-[13px]"
          >
            🔄 이동하기
          </button>
          <button
            onClick={onStoreBuilding}
            disabled={isCastle}
            className={`flex-1 h-12 rounded-xl font-semibold border transition-all text-[13px] ${isCastle ? 'text-outline border-outline cursor-not-allowed' : 'text-secondary border-secondary/40 cursor-pointer'}`}
            title={isCastle ? '성은 보관함에 담을 수 없습니다' : ''}
          >
            📦 보관함에 담기
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-elevated border border-outline rounded-xl text-muted text-[13px]"
          >
            닫기
          </button>
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={onUpgrade}
            disabled={isMaxLevel}
            className={`w-full h-10 rounded-xl font-semibold border transition-all text-[13px] ${isMaxLevel ? 'text-outline border-outline cursor-not-allowed' : 'text-primary border-primary/40 cursor-pointer'}`}
          >
            {isMaxLevel ? '⬆ 업그레이드 (최대 레벨)' : `⬆ 업그레이드 Lv.${curLevel} → Lv.${curLevel + 1}`}
          </button>
        </div>
        {isCastle && (
          <p className="text-center text-muted pb-3 text-[11px]">성(Castle)은 핵심 건물로 보관함에 담을 수 없습니다</p>
        )}
      </div>
    </div>
  );
}
