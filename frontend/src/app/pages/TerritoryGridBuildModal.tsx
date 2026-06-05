type BuildingType = 'castle' | 'workshop' | 'barracks' | 'storage' | 'wall' | 'tower' | 'empty';

interface Props {
  selectedCell: { x: number; y: number } | null;
  selectedZone: 1 | 2 | 3 | undefined;
  gp: number;
  selectedBuilding: BuildingType | null;
  buildError: string;
  buildingColors: Record<BuildingType, string>;
  buildingLabels: Record<BuildingType, string>;
  onSelectBuilding: (type: BuildingType) => void;
  onClose: () => void;
  onBuild: () => void;
}

const BUILDABLE = [
  { type: 'castle' as BuildingType, name: '성 (Castle)', desc: '영토의 핵심 — HP 0 시 경매 전환', size: '2×2', zone: 'Zone 1 전용', cost: null, zoneRestricted: true },
  { type: 'workshop' as BuildingType, name: '생산소 (Workshop)', desc: 'GP 생산 +20/분', size: '2×2', zone: '어디든', cost: '500 GP', zoneRestricted: false },
  { type: 'barracks' as BuildingType, name: '병영 (Barracks)', desc: '유닛 생산 가능', size: '2×2', zone: '어디든', cost: '800 GP', zoneRestricted: false },
  { type: 'storage' as BuildingType, name: '저장소 (Storage)', desc: '자원 1,000 GP 보관', size: '1×2', zone: '어디든', cost: '300 GP', zoneRestricted: false },
  { type: 'wall' as BuildingType, name: '방벽 (Wall)', desc: 'Zone 방어력 +50', size: '1×1', zone: '어디든', cost: '100 GP', zoneRestricted: false },
  { type: 'tower' as BuildingType, name: '방어탑 (Tower)', desc: '자동 방어 +자동 공격', size: '1×1', zone: '어디든', cost: '400 GP', zoneRestricted: false },
] as const;

export function TerritoryGridBuildModal({
  selectedCell, selectedZone, gp,
  selectedBuilding, buildError, buildingColors, buildingLabels,
  onSelectBuilding, onClose, onBuild,
}: Props) {
  return (
    <div className="modal-side-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="relative bg-panel border-[1.5px] border-primary w-[540px] flex flex-col overflow-hidden">
        <div className="bg-elevated px-5 py-4 border-b-2 border-primary flex items-center justify-between">
          <div>
            <h3 className="text-foreground font-bold text-xl">🏗  건물 건설</h3>
            <p className="text-muted text-xs">
              {selectedCell
                ? `위치: (${selectedCell.x}, ${selectedCell.y}) · Zone ${selectedZone ?? '-'} · `
                : '빈 셀을 클릭하여 위치를 선택하세요 · '}
              보유 GP: {gp.toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        <div className="bg-elevated border border-gold rounded-xl mx-4 mt-4 px-4 py-2.5">
          <span className="text-gold text-[11px]">ℹ  성(Castle)은 Zone 1 핵심 구역에만 배치 가능합니다</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 mt-4 space-y-2">
          {BUILDABLE.map(b => {
            const isSel = selectedBuilding === b.type;
            const color = buildingColors[b.type];
            return (
              <div
                key={b.type}
                onClick={() => !b.zoneRestricted && onSelectBuilding(b.type)}
                className={`rounded-xl p-4 flex items-center gap-3 border transition-all ${b.zoneRestricted ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  background: isSel ? color + '20' : '#2a3050',
                  borderColor: isSel ? color : color + '60',
                  boxShadow: isSel ? `0 0 8px ${color}40` : undefined,
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '30' }}>
                  <span className="text-[22px]" style={{ color }}>{buildingLabels[b.type]}</span>
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
                  <div className="border rounded px-2 py-1" style={{ background: isSel ? color + '30' : 'var(--color-panel)', borderColor: color }}>
                    <span className="text-xs" style={{ color }}>{b.cost}</span>
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
            className="flex-1 h-14 bg-elevated border border-outline rounded-xl text-muted text-sm"
          >
            취소
          </button>
          <button
            onClick={onBuild}
            disabled={!selectedBuilding}
            className={`flex-1 h-14 rounded-xl font-bold transition-all text-sm border ${selectedBuilding ? 'bg-primary text-surface border-transparent cursor-pointer' : 'bg-elevated text-muted border-outline cursor-not-allowed'}`}
          >
            건설하기
          </button>
        </div>
      </div>
    </div>
  );
}
