import { useState, useEffect } from 'react';

import { declareSiege } from '../api/siege';
import { fetchTerritoryDetail } from '../api/map';

import { GNB } from '../components/GNB';
import { Button } from '../components/Button';

import type { TerritoryDetailResponse } from '../types/territory';

type AttackType = 'normal' | 'precision';

const SIEGE_TIME_LIMIT_SEC = 7200;
const UNIT_ATK = { infantry: 25, archer: 30, knight: 80 } as const;

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
  const [selectedZone, setSelectedZone] = useState(3);
  const [attackType, setAttackType] = useState<AttackType>('normal');
  const [units, setUnits] = useState({ infantry: 10, archer: 5, knight: 2 });
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
  const totalUnits = units.infantry + units.archer + units.knight;
  const attackPower = units.infantry * UNIT_ATK.infantry + units.archer * UNIT_ATK.archer + units.knight * UNIT_ATK.knight;

  const handleStart = async () => {
    if (!targetTerritory) { setSiegeError('대상 영토를 먼저 검색해주세요.'); return; }
    setShowConfirm(false);
    setSiegeError(null);
    try {
      await declareSiege({
        targetTerritoryId: targetTerritory.territoryId,
        attackZone: selectedZone,
        attackType: attackType === 'normal' ? 'NORMAL' : 'PRECISION',
        units: [
          { unitTypeId: 1, quantity: units.infantry },
          { unitTypeId: 2, quantity: units.archer },
          { unitTypeId: 3, quantity: units.knight },
        ],
      });
      setIsSiegeStarted(true);
    } catch {
      setSiegeError('공성전 선언에 실패했습니다. 조건을 확인하고 다시 시도해주세요.');
    }
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

          {/* Attack Type */}
          <div className="p-4 border-b border-outline">
            <p className="text-muted font-semibold mb-3 text-xs">공격 토큰</p>
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
                    background: attackType === t.id ? t.color + '20' : 'var(--color-panel-deep)',
                    border: `1px solid ${attackType === t.id ? t.color : '#354064'}`,
                  }}
                >
                  <span className="text-xl">{t.icon}</span>
                  <p className="mt-1 text-xs font-semibold" style={{ color: t.color }}>{t.label}</p>
                  <p className="text-muted text-[10px]">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Unit Deployment */}
          <div className="p-4 border-b border-outline flex-1">
            <p className="text-muted font-semibold mb-3 text-xs">유닛 배치</p>
            {[
              { key: 'infantry' as keyof typeof units, label: '보병', icon: '🗡', max: 30, atk: UNIT_ATK.infantry, color: '#e0e8ff' },
              { key: 'archer' as keyof typeof units, label: '궁수', icon: '🏹', max: 20, atk: UNIT_ATK.archer, color: '#00ff88' },
              { key: 'knight' as keyof typeof units, label: '기사', icon: '⚔', max: 10, atk: UNIT_ATK.knight, color: '#ffd700' },
            ].map(u => (
              <div key={u.key} className="flex items-center gap-3 mb-3">
                <span className="text-lg">{u.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: u.color }}>{u.label}</span>
                    <span className="text-muted text-[10px]">공격력 {u.atk} · 최대 {u.max}</span>
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
                <div className="w-10 h-8 bg-panel-deep border border-outline rounded-lg flex items-center justify-center">
                  <span className="text-[13px]" style={{ color: u.color }}>{units[u.key]}</span>
                </div>
              </div>
            ))}
            <div className="bg-panel-deep rounded-xl p-3 mt-2">
              <div className="flex justify-between">
                <span className="text-muted text-xs">총 유닛: {totalUnits}명</span>
                <span className="text-danger font-bold text-xs">총 공격력: {attackPower}</span>
              </div>
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
