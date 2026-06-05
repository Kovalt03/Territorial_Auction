import { buildingColors, buildingLabels, type BuildingType } from './islandGrid';

interface Props {
  selectedCell: { x: number; y: number } | null;
  selectedZone: 1 | 2 | 3 | 4 | undefined;
  gp: number;
  selectedBuilding: BuildingType | null;
  buildError: string;
  isBuilding: boolean;
  onSelectBuilding: (type: BuildingType) => void;
  onClose: () => void;
  onBuild: () => void;
}

const BUILDABLE = [
  { type: 'workshop' as BuildingType, name: '생산소 (Workshop)', desc: 'GP 생산 +20/분', cost: '500 GP', available: true },
  { type: 'barracks' as BuildingType, name: '병영 (Barracks)', desc: '유닛 훈련 및 배치', cost: '800 GP', available: true },
  { type: 'storage' as BuildingType, name: '저장소 (Storage)', desc: '자원 1,000 GP 보관', cost: '300 GP', available: true },
  { type: 'wall' as BuildingType, name: '방벽 (Wall)', desc: 'Zone 방어력 +50', cost: '100 GP', available: true },
  { type: 'tower' as BuildingType, name: '방어탑 (Tower)', desc: '자동 방어 공격', cost: '400 GP', available: true },
  { type: 'garden' as BuildingType, name: '정원 (Garden)', desc: '행복도 +5, GP 보너스 +3%', cost: '200 GP', available: false },
  { type: 'bank' as BuildingType, name: '금고 (Bank)', desc: 'GP 이자 +22/분', cost: '2,000 GP', available: false },
  { type: 'mine' as BuildingType, name: '광산 (Mine)', desc: 'GP 채굴 +35/분', cost: '1,500 GP', available: false },
] as const;

export function IslandBuildModal({
  selectedCell, selectedZone, gp,
  selectedBuilding, buildError, isBuilding,
  onSelectBuilding, onClose, onBuild,
}: Props) {
  return (
    <div className="modal-side-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="relative bg-panel border-l-2 border-gp w-[520px] flex flex-col overflow-hidden">
        <div className="bg-surface px-5 py-4 border-b-2 border-gp flex items-center justify-between">
          <div>
            <h3 className="text-gp font-bold text-lg">🏗 건물 건설</h3>
            {selectedCell
              ? <p className="text-muted text-xs">위치: ({selectedCell.x}, {selectedCell.y}) · Zone {selectedZone ?? 3} · 보유 GP: {gp.toLocaleString()}</p>
              : <p className="text-muted text-xs">빈 셀을 클릭하여 위치를 선택하세요 · 보유 GP: {gp.toLocaleString()}</p>
            }
          </div>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {BUILDABLE.map(b => {
            const isSelected = selectedBuilding === b.type;
            const color = buildingColors[b.type];
            return (
              <div
                key={b.type}
                onClick={() => b.available && onSelectBuilding(b.type)}
                className={`rounded-xl p-3 flex items-center gap-3 border transition-all ${b.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                style={{
                  background: !b.available ? '#1a1f35' : isSelected ? color + '20' : '#2a3050',
                  borderColor: !b.available ? '#2a3050' : isSelected ? color : color + '60',
                  boxShadow: isSelected ? `0 0 8px ${color}40` : undefined,
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '25' }}>
                  <span className="text-[22px]">{buildingLabels[b.type]}</span>
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-[13px] ${b.available ? 'text-foreground' : 'text-muted'}`}>{b.name}</p>
                  <p className="text-muted text-[11px]">{b.desc}</p>
                </div>
                {b.available ? (
                  <div className="border rounded px-2 py-1" style={{ background: isSelected ? color + '30' : '#1a1f35', borderColor: color }}>
                    <span className="text-xs" style={{ color }}>{b.cost}</span>
                  </div>
                ) : (
                  <div className="border rounded px-2 py-1 bg-panel border-outline">
                    <span className="text-xs text-muted">준비 중</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {buildError && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-danger/15 border border-danger">
            <span className="text-danger text-xs">⚠ {buildError}</span>
          </div>
        )}
        <div className="border-t border-outline p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-12 bg-elevated border border-outline rounded-xl text-muted text-sm"
          >
            취소
          </button>
          <button
            onClick={onBuild}
            disabled={!selectedBuilding || isBuilding}
            className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all border ${selectedBuilding && !isBuilding ? 'bg-gp text-surface border-transparent cursor-pointer' : 'bg-elevated text-muted border-outline cursor-not-allowed'}`}
          >
            건설하기
          </button>
        </div>
      </div>
    </div>
  );
}
