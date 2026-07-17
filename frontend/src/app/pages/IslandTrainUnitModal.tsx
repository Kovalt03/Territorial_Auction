import type { UnitInfo } from '../types/military';

import { UNIT_LABELS } from './islandGrid';

interface Props {
  units: UnitInfo[];
  islandGp: number;
  storedFood: number;
  trainUnitTypeId: number | null;
  trainQuantity: number;
  isTraining: boolean;
  onSelectUnit: (id: number) => void;
  onChangeQuantity: (q: number) => void;
  onTrain: () => void;
  onClose: () => void;
}

export function IslandTrainUnitModal({
  units, islandGp, storedFood, trainUnitTypeId, trainQuantity, isTraining,
  onSelectUnit, onChangeQuantity, onTrain, onClose,
}: Props) {
  return (
    <div className="modal-center-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="relative rounded-2xl overflow-hidden flex flex-col w-[400px] bg-panel border-[1.5px] border-secondary">
        <div className="modal-header-secondary bg-[#1a0a35]">
          <div>
            <h3 className="text-secondary font-bold text-xl">⚔ 유닛 훈련</h3>
            <p className="text-muted text-xs">섬 GP: {islandGp.toLocaleString()} · 식량: {storedFood.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-muted text-xs mb-2">유닛 선택</p>
            <div className="grid grid-cols-3 gap-2">
              {units.map(u => {
                // 관리자 지정 값 우선, 없으면 기본 매핑
                const fallback = UNIT_LABELS[u.name] ?? { label: u.name, icon: '⚔', color: '#e0e8ff' };
                const meta = {
                  label: u.displayName ?? fallback.label,
                  icon: u.icon ?? fallback.icon,
                  color: u.colorHex ?? fallback.color,
                };
                const isSelected = trainUnitTypeId === u.unitTypeId;
                return (
                  <button
                    key={u.unitTypeId}
                    onClick={() => onSelectUnit(u.unitTypeId)}
                    className="rounded-xl p-2 flex flex-col items-center gap-1 transition-all"
                    style={{
                      background: isSelected ? meta.color + '20' : 'var(--color-panel-deep)',
                      border: `1.5px solid ${isSelected ? meta.color : '#354064'}`,
                      color: meta.color,
                    }}
                  >
                    <span className="text-lg">{meta.icon}</span>
                    <span className="text-[11px] font-semibold">{meta.label}</span>
                    <span className="text-[10px] text-muted">{u.costGp} GP · 식량 {u.foodCost}</span>
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
              onChange={e => onChangeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full h-9 rounded-xl px-3 text-sm bg-elevated border border-outline text-foreground"
            />
          </div>
          <button
            onClick={onTrain}
            disabled={isTraining || !trainUnitTypeId}
            className="w-full h-10 rounded-xl font-semibold text-sm transition-all hover:brightness-110 disabled:opacity-50 bg-secondary/20 text-secondary border-[1.5px] border-secondary"
          >
            {isTraining ? '훈련 중...' : '훈련하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
