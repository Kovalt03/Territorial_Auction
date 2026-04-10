import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';

type AttackType = 'normal' | 'precision';

const zones = [
  { id: 1, name: 'Zone 1 — 핵심 (성)', hp: 420, maxHp: 600, color: '#ff3333' },
  { id: 2, name: 'Zone 2 — 내부 (병영)', hp: 280, maxHp: 400, color: '#ffd700' },
  { id: 3, name: 'Zone 3 — 외부 (방벽)', hp: 180, maxHp: 300, color: '#00f5ff' },
];

function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return (
    <span>
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}

export function SiegePage() {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState(3);
  const [attackType, setAttackType] = useState<AttackType>('normal');
  const [units, setUnits] = useState({ infantry: 10, archer: 5, knight: 2 });
  const [showConfirm, setShowConfirm] = useState(false);
  const [siegeStarted, setSiegeStarted] = useState(false);

  const zone = zones.find(z => z.id === selectedZone)!;
  const totalUnits = units.infantry + units.archer + units.knight;
  const attackPower = units.infantry * 25 + units.archer * 30 + units.knight * 80;

  const handleStart = () => {
    setShowConfirm(false);
    setSiegeStarted(true);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex-1 flex overflow-hidden">
        {/* Left - Attack Setup */}
        <div className="w-[360px] bg-[#0d1220] border-r border-[#1e2a3d] flex flex-col">
          <div className="p-4 border-b border-[#1e2a3d]">
            <h2 className="text-[#ff3333] font-bold mb-1" style={{ fontSize: 18 }}>⚔ 공성전 준비</h2>
            <p className="text-[#7788a5]" style={{ fontSize: 12 }}>네온 하이웨이 (23, 17) · 강남부자 점령</p>
          </div>

          {/* Zone Selection */}
          <div className="p-4 border-b border-[#1e2a3d]">
            <p className="text-[#7788a5] font-semibold mb-3" style={{ fontSize: 12 }}>공격 구역 선택</p>
            {zones.map(z => (
              <button
                key={z.id}
                onClick={() => setSelectedZone(z.id)}
                className="w-full mb-2 rounded-xl p-3 text-left transition-all"
                style={{
                  background: selectedZone === z.id ? z.color + '20' : '#12192c',
                  border: `1px solid ${selectedZone === z.id ? z.color : '#1e2a3d'}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 13, color: z.color, fontWeight: 600 }}>{z.name}</span>
                  {selectedZone === z.id && <span className="text-[#00f5ff]" style={{ fontSize: 11 }}>선택됨</span>}
                </div>
                <div className="bg-[#1a1f35] h-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(z.hp / z.maxHp) * 100}%`, background: z.color }} />
                </div>
                <p style={{ fontSize: 10, color: z.color }} className="mt-1">{z.hp} / {z.maxHp} HP</p>
              </button>
            ))}
          </div>

          {/* Attack Type */}
          <div className="p-4 border-b border-[#1e2a3d]">
            <p className="text-[#7788a5] font-semibold mb-3" style={{ fontSize: 12 }}>공격 토큰</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'normal' as AttackType, icon: '⚔', label: '일반 공격권', desc: 'GP 500 또는 AP 100', color: '#ff8c00' },
                { id: 'precision' as AttackType, icon: '🎯', label: '정밀 공격권', desc: 'AP 300 · 건물 지정', color: '#ff3333' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setAttackType(t.id)}
                  className="rounded-xl p-3 text-left transition-all"
                  style={{
                    background: attackType === t.id ? t.color + '20' : '#12192c',
                    border: `1px solid ${attackType === t.id ? t.color : '#1e2a3d'}`,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{t.icon}</span>
                  <p style={{ fontSize: 12, color: t.color, fontWeight: 600 }} className="mt-1">{t.label}</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 10 }}>{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Unit Deployment */}
          <div className="p-4 border-b border-[#1e2a3d] flex-1">
            <p className="text-[#7788a5] font-semibold mb-3" style={{ fontSize: 12 }}>유닛 배치</p>
            {[
              { key: 'infantry' as keyof typeof units, label: '보병', icon: '🗡', max: 30, atk: 25, color: '#e0e8ff' },
              { key: 'archer' as keyof typeof units, label: '궁수', icon: '🏹', max: 20, atk: 30, color: '#00ff88' },
              { key: 'knight' as keyof typeof units, label: '기사', icon: '⚔', max: 10, atk: 80, color: '#ffd700' },
            ].map(u => (
              <div key={u.key} className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: 18 }}>{u.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 12, color: u.color }}>{u.label}</span>
                    <span className="text-[#7788a5]" style={{ fontSize: 10 }}>공격력 {u.atk} · 최대 {u.max}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={u.max}
                    value={units[u.key]}
                    onChange={e => setUnits(prev => ({ ...prev, [u.key]: Number(e.target.value) }))}
                    className="w-full"
                    style={{ accentColor: u.color }}
                  />
                </div>
                <div className="w-10 h-8 bg-[#12192c] border border-[#1e2a3d] rounded-lg flex items-center justify-center">
                  <span style={{ fontSize: 13, color: u.color }}>{units[u.key]}</span>
                </div>
              </div>
            ))}
            <div className="bg-[#12192c] rounded-xl p-3 mt-2">
              <div className="flex justify-between">
                <span className="text-[#7788a5]" style={{ fontSize: 12 }}>총 유닛: {totalUnits}명</span>
                <span className="text-[#ff3333] font-bold" style={{ fontSize: 12 }}>총 공격력: {attackPower}</span>
              </div>
            </div>
          </div>

          <div className="p-4">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={totalUnits === 0}
              className="w-full h-12 bg-[#ff3333] rounded-xl text-white font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontSize: 15 }}
            >
              ⚔ 공성전 시작
            </button>
          </div>
        </div>

        {/* Right - Siege Map + Progress */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-5 flex flex-col">
            <h2 className="text-[#e0e8ff] font-bold mb-4" style={{ fontSize: 20 }}>공성전 현황</h2>

            {/* Target territory */}
            <div className="bg-[#1a1f35] border border-[#354064] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[#e0e8ff] font-bold" style={{ fontSize: 16 }}>네온 하이웨이 (23, 17)</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 12 }}>방어자: 강남부자 · S급 영토</p>
                </div>
                <div className="text-right">
                  <p className="text-[#ffd700] font-bold" style={{ fontSize: 18 }}>
                    <Countdown seconds={7200} />
                  </p>
                  <p className="text-[#7788a5]" style={{ fontSize: 11 }}>공성 제한 시간</p>
                </div>
              </div>

              {zones.map(z => (
                <div key={z.id} className="mb-2">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 12, color: z.color }}>{z.name}</span>
                    <span style={{ fontSize: 11, color: z.color }}>{z.hp} / {z.maxHp}</span>
                  </div>
                  <div className="bg-[#0d1220] h-3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(z.hp / z.maxHp) * 100}%`, background: z.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Siege preview grid (10x10) */}
            <div className="bg-[#0d1220] border border-[#1e2a3d] rounded-xl p-4 flex-1">
              <p className="text-[#7788a5] mb-3" style={{ fontSize: 12 }}>영토 내부 구조</p>
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: 'repeat(10, 1fr)', maxWidth: 340, margin: '0 auto' }}
              >
                {Array.from({ length: 100 }, (_, i) => {
                  const x = i % 10, y = Math.floor(i / 10);
                  const isCore = x >= 3 && x <= 6 && y >= 3 && y <= 6;
                  const isInner = x >= 2 && x <= 7 && y >= 2 && y <= 7;
                  const bg = isCore ? '#ff333330' : isInner ? '#ffd70015' : '#00f5ff08';
                  const border = isCore ? '#ff333360' : isInner ? '#ffd70040' : '#00f5ff20';
                  return (
                    <div
                      key={i}
                      className="aspect-square rounded-sm"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    />
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 justify-center">
                {zones.map(z => (
                  <div key={z.id} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm border" style={{ background: z.color + '30', borderColor: z.color + '60' }} />
                    <span className="text-[#7788a5]" style={{ fontSize: 10 }}>Zone {z.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {siegeStarted && (
            <div className="bg-[#2a0a0a] border-t-2 border-[#ff3333] p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-[#ff3333] rounded-full animate-pulse" />
                <span className="text-[#ff3333] font-bold" style={{ fontSize: 14 }}>공성전 진행 중 — {zone.name} 공격 중</span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setSiegeStarted(false)} className="h-8 px-4 bg-[#2a3050] border border-[#354064] rounded-lg text-[#7788a5]" style={{ fontSize: 12 }}>
                    철수
                  </button>
                </div>
              </div>
              <div className="mt-2 bg-[#1a0505] h-3 rounded-full overflow-hidden">
                <div className="h-full bg-[#ff3333] rounded-full animate-pulse" style={{ width: '35%' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
          <div className="bg-[#1a1f35] border-2 border-[#ff3333] rounded-2xl p-8 max-w-sm mx-4 text-center">
            <span style={{ fontSize: 48 }}>⚔</span>
            <h3 className="text-[#ff3333] font-bold text-xl mt-3 mb-2">공성전 선언</h3>
            <p className="text-[#7788a5] mb-5" style={{ fontSize: 13 }}>
              {zone.name}을 {totalUnits}명의 유닛으로 공격합니다.
              공격력: {attackPower}
            </p>
            <div className="bg-[#2a0a0a] border border-[#ff3333] rounded-xl py-3 px-4 mb-5 text-left space-y-1">
              <p className="text-[#7788a5]" style={{ fontSize: 12 }}>대상: 네온 하이웨이 (23, 17)</p>
              <p className="text-[#7788a5]" style={{ fontSize: 12 }}>공격 구역: {zone.name}</p>
              <p className="text-[#7788a5]" style={{ fontSize: 12 }}>총 유닛: {totalUnits}명 · 공격력: {attackPower}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 h-11 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]"
                style={{ fontSize: 14 }}>취소</button>
              <button
                onClick={handleStart}
                className="flex-1 h-11 bg-[#ff3333] rounded-xl text-white font-bold hover:brightness-110"
                style={{ fontSize: 14 }}
              >
                공격 개시
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
