import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';

type BuildingType = 'castle' | 'workshop' | 'barracks' | 'storage' | 'wall' | 'tower' | 'empty';

interface Cell {
  type: BuildingType;
  level?: number;
  hp?: number;
  maxHp?: number;
  zone?: 1 | 2 | 3;
}

const buildingColors: Record<BuildingType, string> = {
  castle: '#ffd700',
  workshop: '#00ff88',
  barracks: '#8b50ff',
  storage: '#00f5ff',
  wall: '#e0e8ff',
  tower: '#ff8c00',
  empty: '#1a1f35',
};

const buildingLabels: Record<BuildingType, string> = {
  castle: '성', workshop: '생산소', barracks: '병영', storage: '저장소',
  wall: '방벽', tower: '방어탑', empty: '',
};

const generateGrid = (): Cell[][] => {
  const grid: Cell[][] = [];
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
  for (let y = 0; y < 10; y++) {
    grid[y] = [];
    for (let x = 0; x < 10; x++) {
      const t = pattern[y][x];
      const hp = t === 'castle' ? [420, 600] : t === 'barracks' ? [80, 100] : t === 'workshop' ? [180, 200] : t === 'wall' ? [320, 400] : t === 'tower' ? [150, 200] : [0, 0];
      const zone: 1 | 2 | 3 = (x >= 3 && x <= 6 && y >= 3 && y <= 6) ? 1 : (x >= 2 && x <= 7 && y >= 2 && y <= 7) ? 2 : 3;
      grid[y][x] = { type: t, level: t !== 'empty' ? (t === 'castle' ? 3 : t === 'workshop' ? 2 : 1) : undefined, hp: hp[0], maxHp: hp[1], zone };
    }
  }
  return grid;
};

const GRID_DATA = generateGrid();

export function TerritoryGridPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { territories, ap, gp } = useApp();
  const territory = territories.find(t => t.id === id) || territories[0];
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [showBuild, setShowBuild] = useState(false);
  const [grid] = useState(GRID_DATA);

  const selectedCellData = selectedCell ? grid[selectedCell.y][selectedCell.x] : null;

  const zoneColor = { 1: '#ff000020', 2: '#ffd70010', 3: '#00f5ff08' };
  const zoneBorder = { 1: '#ff0000', 2: '#ffd700', 3: '#00f5ff' };

  const buildings = [
    { type: 'castle' as BuildingType, count: 1, level: 3, maxHp: 600, hp: 420, color: '#ffd700' },
    { type: 'workshop' as BuildingType, count: 2, level: 2, maxHp: 200, hp: 180, color: '#00ff88' },
    { type: 'barracks' as BuildingType, count: 1, level: 1, maxHp: 100, hp: 80, color: '#8b50ff' },
    { type: 'wall' as BuildingType, count: 4, level: 1, maxHp: 400, hp: 320, color: '#e0e8ff' },
    { type: 'tower' as BuildingType, count: 2, level: 2, maxHp: 200, hp: 150, color: '#ff8c00' },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="bg-[#1a1f35] border-b border-[#354064] px-5 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-[#e0e8ff] font-bold" style={{ fontSize: 18 }}>
            영토 ({territory?.x}, {territory?.y}) · {territory?.name}
          </span>
          <div className="h-6 px-2 rounded bg-[#8b50ff] flex items-center">
            <span className="text-white font-bold" style={{ fontSize: 11 }}>{territory?.grade}급</span>
          </div>
          <div className="flex items-center gap-1 bg-[#2a3050] border border-[#00ff88] rounded px-2 py-1">
            <span className="text-[#00ff88]" style={{ fontSize: 11 }}>🛡 보호 잔여 8:22:14</span>
          </div>
        </div>
        <span className="text-[#e0e8ff]" style={{ fontSize: 14 }}>방어력 740 / 1000</span>
        <button className="h-8 px-4 bg-[#2a3050] border border-[#354064] rounded-lg text-[#e0e8ff] hover:border-[#00f5ff]" style={{ fontSize: 12 }}>
          내부 관리
        </button>
        <button onClick={() => navigate('/app/map')} className="text-[#7788a5] hover:text-[#e0e8ff] text-xl">✕</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-5 overflow-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, 1fr)', maxWidth: 680, margin: '0 auto' }}>
            {grid.map((row, y) =>
              row.map((cell, x) => {
                const isSelected = selectedCell?.x === x && selectedCell?.y === y;
                const bg = cell.type !== 'empty' ? buildingColors[cell.type] + '60' : '#0d1220';
                return (
                  <div
                    key={`${x}-${y}`}
                    onClick={() => { setSelectedCell({ x, y }); if (cell.type === 'empty') setShowBuild(true); }}
                    className="relative aspect-square rounded cursor-pointer flex items-center justify-center transition-all hover:opacity-90"
                    style={{
                      background: bg,
                      border: isSelected ? '2px solid #00f5ff' : `1px solid ${cell.type !== 'empty' ? buildingColors[cell.type] + '80' : '#1a2a3a'}`,
                      boxShadow: isSelected ? '0 0 8px #00f5ff' : undefined,
                    }}
                  >
                    {cell.type !== 'empty' ? (
                      <div className="flex flex-col items-center justify-center h-full w-full p-1">
                        <span className="font-bold" style={{ fontSize: 11, color: buildingColors[cell.type] }}>
                          {buildingLabels[cell.type]}
                        </span>
                        {cell.level && (
                          <div className="w-full mt-0.5">
                            <div className="h-1 bg-[#1a1f35] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.round((cell.hp! / cell.maxHp!) * 100)}%`, background: buildingColors[cell.type] }}
                              />
                            </div>
                            <span style={{ fontSize: 7, color: buildingColors[cell.type] }}>Lv.{cell.level}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#354064]" style={{ fontSize: 16 }}>+</span>
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
                <span className="text-[#7788a5]" style={{ fontSize: 11 }}>Zone {z}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-[240px] bg-[#0d1220] border-l border-[#1e2a3d] flex flex-col">
          <div className="p-4 space-y-3 border-b border-[#1e2a3d]">
            <p className="text-[#7788a5] font-semibold" style={{ fontSize: 12 }}>자원 현황</p>
            {[
              { label: 'AP', val: ap.toLocaleString(), color: '#ff0066' },
              { label: 'GP', val: gp.toLocaleString(), color: '#00ff88' },
              { label: '금고', val: '8,200', color: '#ffd700' },
            ].map(item => (
              <div key={item.label} className="bg-[#12192c] rounded-lg p-3 flex items-center justify-between">
                <span className="text-[#7788a5]" style={{ fontSize: 11 }}>{item.label}</span>
                <p className="font-bold" style={{ fontSize: 16, color: item.color }}>{item.val}</p>
              </div>
            ))}
          </div>

          <div className="p-4 space-y-2 border-b border-[#1e2a3d]">
            <p className="text-[#7788a5] font-semibold" style={{ fontSize: 12 }}>건물 현황</p>
            {buildings.map(b => (
              <div key={b.type}>
                <div className="flex justify-between mb-0.5">
                  <span style={{ fontSize: 11, color: b.color }}>{buildingLabels[b.type]} {b.count > 1 ? `×${b.count}` : ''}</span>
                  <span className="text-[#7788a5]" style={{ fontSize: 10 }}>Lv.{b.level}</span>
                </div>
                <div className="bg-[#1a1f35] h-1.5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((b.hp / b.maxHp) * 100)}%`, background: b.color }} />
                </div>
                <span className="text-[#7788a5]" style={{ fontSize: 9 }}>{b.hp}/{b.maxHp}</span>
              </div>
            ))}
          </div>

          <div className="p-4 border-b border-[#1e2a3d]">
            <p className="text-[#7788a5] font-semibold mb-2" style={{ fontSize: 12 }}>유닛 현황</p>
            {[
              { label: '보병', val: '24/30', color: '#e0e8ff' },
              { label: '궁수', val: '12/20', color: '#00ff88' },
              { label: '기사', val: '5/10', color: '#ffd700' },
            ].map(u => (
              <div key={u.label} className="flex justify-between py-1">
                <span className="text-[#7788a5]" style={{ fontSize: 12 }}>{u.label}</span>
                <span style={{ fontSize: 12, color: u.color }}>{u.val}</span>
              </div>
            ))}
          </div>

          <div className="p-3 space-y-2">
            <button onClick={() => setShowBuild(true)} className="w-full h-9 border border-[#00f5ff] rounded-lg text-[#00f5ff] hover:bg-[#00f5ff20] transition-colors" style={{ fontSize: 12 }}>
              건물 추가
            </button>
            <button className="w-full h-9 border border-[#8b50ff] rounded-lg text-[#8b50ff] hover:bg-[#8b50ff20] transition-colors" style={{ fontSize: 12 }}>
              유닛 배치
            </button>
            <button className="w-full h-9 bg-[#ffd700] rounded-lg text-[#0a0e1a] font-bold hover:brightness-110 transition-all" style={{ fontSize: 12 }}>
              금고로 이전
            </button>
          </div>
        </div>
      </div>

      {showBuild && (
        <div className="fixed inset-0 flex justify-end z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowBuild(false)} />
          <div className="relative bg-[#1a1f35] border-[1.5px] border-[#00f5ff] w-[540px] flex flex-col overflow-hidden">
            <div className="bg-[#2a3050] px-5 py-4 border-b-2 border-[#00f5ff] flex items-center justify-between">
              <div>
                <h3 className="text-[#e0e8ff] font-bold" style={{ fontSize: 20 }}>🏗  건물 건설</h3>
                <p className="text-[#7788a5]" style={{ fontSize: 12 }}>
                  위치: ({selectedCell?.x ?? 5}, {selectedCell?.y ?? 4}) · Zone {selectedCellData?.zone ?? 2}
                </p>
              </div>
              <button onClick={() => setShowBuild(false)} className="text-[#7788a5] hover:text-[#e0e8ff] text-2xl">✕</button>
            </div>

            <div className="bg-[#2a3050] border border-[#ffd700] rounded-xl mx-4 mt-4 px-4 py-2.5">
              <span className="text-[#ffd700]" style={{ fontSize: 11 }}>ℹ  성(Castle)은 Zone 1 핵심 구역에만 배치 가능합니다</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 mt-4 space-y-2">
              {[
                { type: 'castle' as BuildingType, name: '성 (Castle)', desc: '영토의 핵심 — HP 0 시 경매 전환', size: '2×2', zone: 'Zone 1 전용', cost: null, zoneRestricted: true },
                { type: 'workshop' as BuildingType, name: '생산소 (Workshop)', desc: 'GP 생산 +20/분', size: '2×2', zone: '어디든', cost: '500 GP', zoneRestricted: false },
                { type: 'barracks' as BuildingType, name: '병영 (Barracks)', desc: '유닛 생산 가능', size: '2×2', zone: '어디든', cost: '800 GP', zoneRestricted: false },
                { type: 'storage' as BuildingType, name: '저장소 (Storage)', desc: '자원 1,000 GP 보관', size: '1×2', zone: '어디든', cost: '300 GP', zoneRestricted: false },
                { type: 'wall' as BuildingType, name: '방벽 (Wall)', desc: 'Zone 방어력 +50', size: '1×1', zone: '어디든', cost: '100 GP', zoneRestricted: false },
                { type: 'tower' as BuildingType, name: '방어탑 (Tower)', desc: '자동 방어 +자동 공격', size: '1×1', zone: '어디든', cost: '400 GP', zoneRestricted: false },
              ].map(b => (
                <div
                  key={b.type}
                  className="rounded-xl p-4 flex items-center gap-3 border transition-colors"
                  style={{ background: '#2a3050', borderColor: buildingColors[b.type], opacity: b.zoneRestricted ? 0.5 : 1 }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: buildingColors[b.type] + '30' }}>
                    <span style={{ fontSize: 22, color: buildingColors[b.type] }}>{buildingLabels[b.type]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 14 }}>{b.name}</p>
                    <p className="text-[#7788a5]" style={{ fontSize: 11 }}>{b.desc}</p>
                    <p className="text-[#7788a5]" style={{ fontSize: 10 }}>크기: {b.size}  ·  Zone: {b.zone}</p>
                  </div>
                  {b.zoneRestricted ? (
                    <div className="bg-[#ff333330] border border-[#ff3333] rounded px-2 py-1">
                      <span className="text-[#ff3333]" style={{ fontSize: 10 }}>Zone 제한</span>
                    </div>
                  ) : b.cost && (
                    <div className="bg-[#2a3050] border rounded px-2 py-1" style={{ borderColor: buildingColors[b.type] }}>
                      <span style={{ fontSize: 12, color: buildingColors[b.type] }}>{b.cost}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-[#354064] p-4 flex gap-3">
              <button onClick={() => setShowBuild(false)} className="flex-1 h-14 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]" style={{ fontSize: 14 }}>
                미리보기
              </button>
              <button onClick={() => setShowBuild(false)} className="flex-1 h-14 bg-[#00f5ff] rounded-xl text-[#0a0e1a] font-bold hover:brightness-110" style={{ fontSize: 14 }}>
                건설하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
