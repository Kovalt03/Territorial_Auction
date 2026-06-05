import { HealthBar } from '../components/HealthBar';
import { EmptyState } from '../components/EmptyState';

type BuildingType = 'castle' | 'workshop' | 'barracks' | 'storage' | 'wall' | 'tower' | 'empty';

interface InventoryItem {
  type: BuildingType;
  level: number;
  hp: number;
  maxHp: number;
}

interface Props {
  inventory: InventoryItem[];
  buildingColors: Record<BuildingType, string>;
  buildingLabels: Record<BuildingType, string>;
  buildingNames: Record<BuildingType, string>;
  onDeploy: (idx: number) => void;
  onClose: () => void;
}

export function TerritoryGridInventoryModal({
  inventory, buildingColors, buildingLabels, buildingNames,
  onDeploy, onClose,
}: Props) {
  return (
    <div className="modal-center-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="relative rounded-2xl overflow-hidden flex flex-col w-[480px] max-h-[70vh] bg-panel border-[1.5px] border-secondary">
        <div className="modal-header-secondary bg-[#1a0a35]">
          <div>
            <h3 className="text-secondary font-bold text-xl">📦 보관함</h3>
            <p className="text-muted text-xs">건물 {inventory.length}개 보관 중 · 배치하기를 눌러 그리드에 재배치</p>
          </div>
          <button onClick={onClose} className="btn-close">✕</button>
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
                  <div key={idx} className="rounded-xl p-3 flex items-center gap-3 bg-elevated" style={{ border: `1px solid ${color}50` }}>
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
                      onClick={() => onDeploy(idx)}
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
  );
}
