import { useState, useEffect } from 'react';

import { declareSiege } from '../api/siege';
import { fetchTerritoryDetail } from '../api/map';
import { useMilitary } from '../hooks/useMilitary';
import { ApiError } from '../api/client';

import { GNB } from '../components/GNB';
import { Button } from '../components/Button';
import { UNIT_LABELS } from './islandGrid';

import type { TerritoryDetailResponse } from '../types/territory';
import type { StructureEntry } from '../api/siege';

const SIEGE_TIME_LIMIT_SEC = 7200;
const STAGING_CAP_PER = 10; // 주둔지 1개당 공격 병력 상한
const STAGING_COST_GP = 500; // 주둔지 1개 건설비(공격자 금고 GP)

// 대상 영토 인접 타일(체비쇼프 1) — 주둔지 자동 배치용
const ADJACENT_OFFSETS = [
  [0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1],
] as const;
const GRID_MAX = 49;

function buildStagingStructures(t: TerritoryDetailResponse, count: number): StructureEntry[] {
  const clamp = (v: number) => Math.max(0, Math.min(GRID_MAX, v));
  return ADJACENT_OFFSETS.slice(0, count).map(([dx, dy]) => ({
    type: 'STAGING' as const,
    coordX: clamp(t.coordX + dx),
    coordY: clamp(t.coordY + dy),
  }));
}

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
  const { data: militaryData } = useMilitary();
  const [selectedZone, setSelectedZone] = useState(3);
  // unitTypeId → 커밋 수량
  const [forces, setForces] = useState<Record<number, number>>({});
  const [stagingCount, setStagingCount] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSiegeStarted, setIsSiegeStarted] = useState(false);
  const [siegeError, setSiegeError] = useState<string | null>(null);

  const [targetInput, setTargetInput] = useState('');
  const [targetTerritory, setTargetTerritory] = useState<TerritoryDetailResponse | null>(null);
  const [targetError, setTargetError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const targetId = parseInt(targetInput, 10);

  const handleSearchTarget = async () => {
    if (!targetId) return;
    setIsSearching(true);
    setTargetError(null);
    setTargetTerritory(null);
    try {
      const detail = await fetchTerritoryDetail(targetId);
      if (!detail.owner) {
        setTargetError('점령자가 없는 영토는 공격할 수 없습니다.');
      } else {
        setTargetTerritory(detail);
      }
    } catch {
      setTargetError('영토를 찾을 수 없습니다. ID를 확인해주세요.');
    } finally {
      setIsSearching(false);
    }
  };

  const zone = zones.find(z => z.id === selectedZone)!;

  // 대기 유닛을 타입별로 합산(위치 무관) — 공격 병력 후보
  const idleUnits = (() => {
    const map = new Map<number, { unitTypeId: number; name: string; displayName: string | null; icon: string | null; colorHex: string | null; attackPower: number; idle: number }>();
    militaryData?.locations.forEach(l => l.units.forEach(u => {
      if (u.idleCount <= 0) return;
      const ex = map.get(u.unitTypeId);
      if (ex) ex.idle += u.idleCount;
      else map.set(u.unitTypeId, { unitTypeId: u.unitTypeId, name: u.name, displayName: u.displayName, icon: u.icon, colorHex: u.colorHex, attackPower: u.attackPower, idle: u.idleCount });
    }));
    return [...map.values()];
  })();

  const totalUnits = Object.values(forces).reduce((a, b) => a + b, 0);
  const attackPower = idleUnits.reduce((sum, u) => sum + u.attackPower * (forces[u.unitTypeId] ?? 0), 0);
  const capacity = stagingCount * STAGING_CAP_PER;
  const overCapacity = totalUnits > capacity;
  const structureCost = stagingCount * STAGING_COST_GP;

  const handleStart = async () => {
    if (!targetTerritory) { setSiegeError('대상 영토를 먼저 검색해주세요.'); return; }
    if (totalUnits === 0) { setSiegeError('공격 병력을 1기 이상 선택해주세요.'); return; }
    if (overCapacity) { setSiegeError(`병력이 주둔지 수용량(${capacity})을 초과합니다.`); return; }
    setShowConfirm(false);
    setSiegeError(null);
    try {
      await declareSiege({
        targetTerritoryId: targetTerritory.territoryId,
        attackZone: selectedZone,
        forces: idleUnits
          .filter(u => (forces[u.unitTypeId] ?? 0) > 0)
          .map(u => ({ unitTypeId: u.unitTypeId, quantity: forces[u.unitTypeId] })),
        structures: buildStagingStructures(targetTerritory, stagingCount),
      });
      setIsSiegeStarted(true);
    } catch (e) {
      setSiegeError(
        e instanceof ApiError && e.status >= 400 && e.status < 500
          ? e.message
          : '공성전 선언에 실패했습니다. 조건을 확인하고 다시 시도해주세요.',
      );
    }
  };

  const unitMeta = (u: { name: string; displayName: string | null; icon: string | null; colorHex: string | null }) => {
    const fb = UNIT_LABELS[u.name] ?? { label: u.name, icon: '⚔', color: '#e0e8ff' };
    return { label: u.displayName ?? fb.label, icon: u.icon ?? fb.icon, color: u.colorHex ?? fb.color };
  };

  return (
    <div className="page-root">
      <GNB />

      <div className="flex-1 flex overflow-hidden">
        {/* Left - Attack Setup */}
        <div className="w-[360px] bg-surface border-r border-outline flex flex-col">
          <div className="p-4 border-b border-outline">
            <h2 className="text-danger font-bold mb-3 text-lg">⚔ 공성전 준비</h2>
            <div className="flex gap-2">
              <input
                type="number"
                value={targetInput}
                onChange={e => { setTargetInput(e.target.value); setTargetTerritory(null); setTargetError(null); }}
                onKeyDown={e => e.key === 'Enter' && !isSearching && void handleSearchTarget()}
                placeholder="영토 ID 입력"
                className="flex-1 bg-elevated border border-outline rounded-lg px-3 h-9 text-foreground text-xs outline-none focus:border-danger transition-colors"
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => void handleSearchTarget()}
                disabled={!targetInput || isSearching}
              >
                {isSearching ? '검색 중...' : '검색'}
              </Button>
            </div>
            {targetError && <p className="text-danger text-[11px] mt-1.5">⚠ {targetError}</p>}
            {targetTerritory && (
              <div className="mt-2 bg-[#2a0a0a] border border-[#ff333360] rounded-lg px-3 py-2">
                <p className="text-danger text-xs font-semibold">
                  ({targetTerritory.coordX}, {targetTerritory.coordY}) · {targetTerritory.continentName}
                </p>
                <p className="text-muted text-[11px]">
                  {targetTerritory.grade}급 · {targetTerritory.owner?.nickname ?? '미점령'}
                </p>
              </div>
            )}
          </div>

          {/* Zone Selection */}
          <div className="p-4 border-b border-outline">
            <p className="text-muted font-semibold mb-3 text-xs">공격 구역 선택</p>
            {zones.map(z => (
              <button
                key={z.id}
                onClick={() => setSelectedZone(z.id)}
                className="w-full mb-2 rounded-xl p-3 text-left transition-all"
                style={{
                  background: selectedZone === z.id ? z.color + '20' : 'var(--color-panel-deep)',
                  border: `1px solid ${selectedZone === z.id ? z.color : '#354064'}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold" style={{ color: z.color }}>{z.name}</span>
                  {selectedZone === z.id && <span className="text-primary text-[11px]">선택됨</span>}
                </div>
                <div className="bg-panel h-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(z.hp / z.maxHp) * 100}%`, background: z.color }} />
                </div>
                <p className="mt-1 text-[10px]" style={{ color: z.color }}>{z.hp} / {z.maxHp} HP</p>
              </button>
            ))}
          </div>

          {/* 공성 건물 — 주둔지 (공격 병력 상한 제공, 금고 GP 결제) */}
          <div className="p-4 border-b border-outline">
            <p className="text-muted font-semibold mb-2 text-xs">주둔지 (공격 병력 상한)</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => setStagingCount(n)}
                  className="flex-1 rounded-xl py-2 text-center transition-all"
                  style={{
                    background: stagingCount === n ? '#ff333320' : 'var(--color-panel-deep)',
                    border: `1px solid ${stagingCount === n ? '#ff3333' : '#354064'}`,
                    color: stagingCount === n ? '#ff3333' : '#8892b0',
                  }}
                >
                  <span className="text-[13px] font-bold">×{n}</span>
                </button>
              ))}
            </div>
            <p className="text-muted text-[10px] mt-2">
              수용량 {capacity}기 · 금고 {structureCost.toLocaleString()} GP · 대상 인접 타일 자동 배치
            </p>
          </div>

          {/* 공격 병력 — 보유 대기 유닛에서 선택 */}
          <div className="p-4 border-b border-outline flex-1 overflow-y-auto">
            <p className="text-muted font-semibold mb-3 text-xs">공격 병력 (대기 유닛)</p>
            {idleUnits.length === 0 && (
              <p className="text-muted text-[11px] py-3 text-center">대기 유닛이 없습니다. 병영에서 먼저 훈련하세요.</p>
            )}
            {idleUnits.map(u => {
              const m = unitMeta(u);
              const qty = forces[u.unitTypeId] ?? 0;
              return (
                <div key={u.unitTypeId} className="flex items-center gap-3 mb-3">
                  <span className="text-lg">{m.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: m.color }}>{m.label}</span>
                      <span className="text-muted text-[10px]">공격력 {u.attackPower} · 대기 {u.idle}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={u.idle}
                      value={qty}
                      onChange={e => setForces(prev => ({ ...prev, [u.unitTypeId]: Number(e.target.value) }))}
                      className="w-full"
                      style={{ accentColor: m.color }}
                    />
                  </div>
                  <div className="w-10 h-8 bg-panel-deep border border-outline rounded-lg flex items-center justify-center">
                    <span className="text-[13px]" style={{ color: m.color }}>{qty}</span>
                  </div>
                </div>
              );
            })}
            <div className="bg-panel-deep rounded-xl p-3 mt-2">
              <div className="flex justify-between">
                <span className={overCapacity ? 'text-danger text-xs' : 'text-muted text-xs'}>
                  병력 {totalUnits} / 수용 {capacity}
                </span>
                <span className="text-danger font-bold text-xs">총 공격력: {attackPower}</span>
              </div>
              {overCapacity && <p className="text-danger text-[10px] mt-1">주둔지 수용량 초과 — 주둔지를 늘리거나 병력을 줄이세요</p>}
            </div>
          </div>

          <div className="p-4 space-y-2">
            {siegeError && (
              <p className="text-danger text-xs text-center">⚠ {siegeError}</p>
            )}
            <Button
              variant="danger"
              size="lg"
              fullWidth
              onClick={() => setShowConfirm(true)}
              disabled={totalUnits === 0 || !targetTerritory}
            >
              {!targetTerritory ? '대상 영토를 선택하세요' : '⚔ 공성전 시작'}
            </Button>
          </div>
        </div>

        {/* Right - Siege Map + Progress */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-5 flex flex-col">
            <h2 className="text-foreground font-bold mb-4 text-xl">공성전 현황</h2>

            {/* Target territory */}
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  {targetTerritory ? (
                    <>
                      <p className="text-foreground font-bold text-base">
                        ({targetTerritory.coordX}, {targetTerritory.coordY}) · {targetTerritory.continentName}
                      </p>
                      <p className="text-muted text-xs">
                        방어자: {targetTerritory.owner?.nickname ?? '미점령'} · {targetTerritory.grade}급 영토
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-outline font-bold text-base">대상 영토 미선택</p>
                      <p className="text-muted text-xs">왼쪽에서 영토 ID를 검색하세요</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-gold font-bold text-lg">
                    <Countdown seconds={SIEGE_TIME_LIMIT_SEC} />
                  </p>
                  <p className="text-muted text-[11px]">공성 제한 시간</p>
                </div>
              </div>

              {zones.map(z => (
                <div key={z.id} className="mb-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: z.color }}>{z.name}</span>
                    <span className="text-[11px]" style={{ color: z.color }}>{z.hp} / {z.maxHp}</span>
                  </div>
                  <div className="bg-surface h-3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(z.hp / z.maxHp) * 100}%`, background: z.color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Siege preview grid (10x10) */}
            <div className="bg-surface border border-outline rounded-xl p-4 flex-1">
              <p className="text-muted mb-3 text-xs">영토 내부 구조</p>
              <div
                className="grid gap-1 max-w-[340px] mx-auto"
                style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}
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
                    <span className="text-muted text-[10px]">Zone {z.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isSiegeStarted && (
            <div className="bg-[#2a0a0a] border-t-2 border-danger p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-danger rounded-full animate-pulse" />
                <span className="text-danger font-bold text-sm">공성전 진행 중 — {zone.name} 공격 중</span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setIsSiegeStarted(false)} className="h-8 px-4 bg-elevated border border-outline rounded-lg text-muted text-xs">
                    철수
                  </button>
                </div>
              </div>
              <div className="mt-2 bg-[#1a0505] h-3 rounded-full overflow-hidden">
                <div className="h-full bg-danger rounded-full animate-pulse" style={{ width: '35%' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="bg-panel border-2 border-danger rounded-2xl p-8 max-w-sm mx-4 text-center">
            <span className="text-5xl">⚔</span>
            <h3 className="text-danger font-bold text-xl mt-3 mb-2">공성전 선언</h3>
            <p className="text-muted mb-5 text-[13px]">
              {zone.name}을 {totalUnits}명의 유닛으로 공격합니다.
              공격력: {attackPower}
            </p>
            <div className="bg-[#2a0a0a] border border-danger rounded-xl py-3 px-4 mb-5 text-left space-y-1">
              <p className="text-muted text-xs">
                대상: ({targetTerritory?.coordX}, {targetTerritory?.coordY}) · {targetTerritory?.continentName}
              </p>
              <p className="text-muted text-xs">방어자: {targetTerritory?.owner?.nickname}</p>
              <p className="text-muted text-xs">공격 구역: {zone.name}</p>
              <p className="text-muted text-xs">총 유닛: {totalUnits}명 · 공격력: {attackPower}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="btn-cancel">취소</button>
              <Button
                variant="danger"
                onClick={() => void handleStart()}
                className="flex-1"
              >
                공격 개시
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
