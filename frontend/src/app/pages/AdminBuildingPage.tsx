import { Fragment, useEffect, useState } from 'react';

import {
  fetchAdminBuildingTypes, createBuildingType, updateBuildingType, deleteBuildingType,
  fetchLevelSpecs, updateLevelSpecs,
  type BuildingTypeForm, type LevelSpecValues,
} from '../api/admin';
import { ApiError } from '../api/client';

import type { BuildingTypeInfo } from '../types/island';

type Field = { key: keyof BuildingTypeForm; label: string; nullable?: boolean; production?: boolean };

// 컴팩트 행에 항상 보이는 필드
const MAIN_FIELDS: Field[] = [
  { key: 'maxHp', label: 'HP' },
  { key: 'baseCostGp', label: '건설비용' },
];
// 상세 토글에서만 보이는 필드
const DETAIL_FIELDS: Field[] = [
  { key: 'upgradeCostGp', label: '업글비용', nullable: true },
  { key: 'width', label: '너비' },
  { key: 'height', label: '높이' },
  { key: 'zoneRestriction', label: 'Zone제한', nullable: true },
  { key: 'defensePower', label: '방어력', nullable: true },
  { key: 'foodProductionRate', label: '식량/시간', nullable: true, production: true },
  { key: 'unitCapacityPerLevel', label: '유닛/레벨', nullable: true, production: true },
  { key: 'gpProductionRate', label: 'GP/시간', nullable: true, production: true },
];

function toForm(b: BuildingTypeInfo): BuildingTypeForm {
  return {
    displayName: b.displayName,
    width: b.width, height: b.height, maxHp: b.maxHp, baseCostGp: b.baseCostGp,
    upgradeCostGp: b.upgradeCostGp, zoneRestriction: b.zoneRestriction, defensePower: b.defensePower,
    foodProductionRate: b.foodProductionRate, unitCapacityPerLevel: b.unitCapacityPerLevel,
    gpProductionRate: b.gpProductionRate, icon: b.icon, colorHex: b.colorHex,
  };
}

const input = 'w-full bg-elevated border border-outline rounded px-1.5 h-7 text-foreground text-[11px] outline-none focus:border-primary';

// 최대 레벨 3 → 업그레이드 도달 레벨 2, 3
const UPGRADE_LEVELS = [2, 3];

// 레벨별로 설정 가능한 항목. base가 있으면 건물 기본값이 있을 때만 노출(그 건물의 기능일 때).
const LEVEL_FIELDS: { key: keyof LevelSpecValues; label: string; base?: keyof BuildingTypeInfo }[] = [
  { key: 'upgradeCostGp', label: '업글비용' },
  { key: 'defensePower', label: '방어력', base: 'defensePower' },
  { key: 'foodProductionRate', label: '식량/시간', base: 'foodProductionRate' },
  { key: 'unitCapacityPerLevel', label: '유닛/레벨', base: 'unitCapacityPerLevel' },
  { key: 'gpProductionRate', label: 'GP/시간', base: 'gpProductionRate' },
];

export function AdminBuildingPage() {
  const [items, setItems] = useState<BuildingTypeInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => {
    fetchAdminBuildingTypes()
      .then(r => { setItems(r); setError(null); })
      .catch(e => { setError(e instanceof ApiError ? e.message : '건물을 불러올 수 없습니다.'); console.warn('[AdminBuilding] fetch', e); });
  };
  useEffect(load, []);

  const onDone = (msg: string) => { setMessage(msg); load(); };

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="font-bold text-base mb-1">건물 관리</h2>
      <p className="text-muted text-[11px] mb-4">
        <span className="text-primary font-semibold">기능</span> 건물은 스탯·표시명만 수정 ·
        <span className="text-gp font-semibold"> 장식</span> 건물은 자유 생성(HP·방어력만 유효) · 상세 설정은 <b>상세</b> 토글로 펼칩니다.
      </p>

      {error && <p className="text-danger text-xs mb-3">⚠ {error}</p>}
      {message && <p className="text-gp text-xs mb-3">✓ {message}</p>}

      <table className="w-full text-xs mb-6">
        <thead className="text-dim text-[11px] border-b border-outline">
          <tr>
            <th className="text-left font-medium py-2 px-2">코드 / 분류</th>
            <th className="text-left font-medium py-2 px-1 w-[110px]">표시명</th>
            {MAIN_FIELDS.map(f => <th key={f.key} className="text-left font-medium py-2 px-1 w-[80px]">{f.label}</th>)}
            <th className="text-right font-medium py-2 px-2 w-40"></th>
          </tr>
        </thead>
        <tbody>
          {(['FUNCTIONAL', 'DECORATIVE'] as const).map(cat => {
            const group = items.filter(b => (cat === 'DECORATIVE' ? b.category === 'DECORATIVE' : b.category !== 'DECORATIVE'));
            if (group.length === 0) return null;
            return (
              <Fragment key={cat}>
                <tr className="bg-panel-deep">
                  <td colSpan={5} className={`py-1.5 px-2 text-[11px] font-bold ${cat === 'DECORATIVE' ? 'text-gp' : 'text-primary'}`}>
                    {cat === 'DECORATIVE' ? '🎨 장식 건물' : '⚙ 기능 건물'} <span className="text-dim font-normal">({group.length})</span>
                  </td>
                </tr>
                {group.map(b => <Row key={b.buildingTypeId} item={b} onDone={onDone} onError={setError} />)}
              </Fragment>
            );
          })}
          {items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted">건물이 없습니다.</td></tr>}
        </tbody>
      </table>

      <section className="bg-panel border border-outline rounded-xl p-4 max-w-3xl">
        <h3 className="font-bold text-sm mb-3">새 건물 추가</h3>
        <CreateForm onDone={onDone} onError={setError} />
      </section>
    </div>
  );
}

function Row({ item, onDone, onError }: { item: BuildingTypeInfo; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [form, setForm] = useState<BuildingTypeForm>(toForm(item));
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(item));
  const isDecorative = item.category === 'DECORATIVE';

  // 레벨별 스펙 (상세 토글 시 로드). levelSpecs[level][fieldKey] = 문자열 입력값
  const [levelSpecs, setLevelSpecs] = useState<Record<number, Partial<Record<keyof LevelSpecValues, string>>>>({});
  const [levelLoaded, setLevelLoaded] = useState(false);
  const [levelBusy, setLevelBusy] = useState(false);
  // 이 건물에서 레벨별로 조절 가능한 항목(업글비용 + 기본값 있는 기능 스탯)
  const levelFields = LEVEL_FIELDS.filter(f => !f.base || item[f.base] != null);

  useEffect(() => {
    if (!open || levelLoaded) return;
    fetchLevelSpecs(item.buildingTypeId)
      .then(r => {
        const next: Record<number, Partial<Record<keyof LevelSpecValues, string>>> = {};
        UPGRADE_LEVELS.forEach(lv => {
          const v = r[String(lv)];
          const row: Partial<Record<keyof LevelSpecValues, string>> = {};
          levelFields.forEach(f => { row[f.key] = v && v[f.key] != null ? String(v[f.key]) : ''; });
          next[lv] = row;
        });
        setLevelSpecs(next); setLevelLoaded(true);
      })
      .catch(e => { onError(e instanceof ApiError ? e.message : '레벨 설정을 불러올 수 없습니다.'); console.warn('[AdminBuilding] levelSpecs', e); });
  }, [open, levelLoaded, item.buildingTypeId, onError, levelFields]);

  const setLevelField = (lv: number, key: keyof LevelSpecValues, val: string) =>
    setLevelSpecs(s => ({ ...s, [lv]: { ...s[lv], [key]: val } }));

  const saveLevelSpecs = async () => {
    if (levelBusy) return;
    setLevelBusy(true);
    try {
      const payload: Record<number, LevelSpecValues> = {};
      UPGRADE_LEVELS.forEach(lv => {
        const row = levelSpecs[lv] ?? {};
        payload[lv] = {
          upgradeCostGp: row.upgradeCostGp?.trim() ? Number(row.upgradeCostGp) : null,
          defensePower: row.defensePower?.trim() ? Number(row.defensePower) : null,
          foodProductionRate: row.foodProductionRate?.trim() ? Number(row.foodProductionRate) : null,
          unitCapacityPerLevel: row.unitCapacityPerLevel?.trim() ? Number(row.unitCapacityPerLevel) : null,
          gpProductionRate: row.gpProductionRate?.trim() ? Number(row.gpProductionRate) : null,
        };
      });
      await updateLevelSpecs(item.buildingTypeId, payload);
      onDone(`${item.name} 레벨 설정 저장됨`);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : '레벨 설정 저장 실패');
    } finally { setLevelBusy(false); }
  };

  const setNum = (k: keyof BuildingTypeForm, v: string, nullable?: boolean) =>
    setForm(f => ({ ...f, [k]: v.trim() === '' ? (nullable ? null : 0) : Number(v) }));

  const save = async () => {
    if (busy || !dirty) return;
    setBusy(true);
    try { await updateBuildingType(item.buildingTypeId, form); onDone(`${item.name} 저장됨`); }
    catch (e) { onError(e instanceof ApiError ? e.message : '저장 실패'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy) return;
    if (!window.confirm(`${item.name} 건물을 삭제할까요?`)) return;
    setBusy(true);
    try { await deleteBuildingType(item.buildingTypeId); onDone(`${item.name} 삭제됨`); }
    catch (e) { onError(e instanceof ApiError ? e.message : '삭제 실패'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <tr className="border-b border-outline-soft">
        <td className="py-1.5 px-2 font-semibold whitespace-nowrap">
          <span className="mr-1">{form.icon || item.icon || '🏗'}</span>{item.name}
          <span className={`ml-1.5 text-[9px] font-bold ${isDecorative ? 'text-gp' : 'text-primary'}`}>{isDecorative ? '장식' : '기능'}</span>
        </td>
        <td className="py-1.5 px-1">
          <input value={form.displayName ?? ''} placeholder="한글명" onChange={e => setForm(f => ({ ...f, displayName: e.target.value || null }))} className={input} />
        </td>
        {MAIN_FIELDS.map(f => (
          <td key={f.key} className="py-1.5 px-1">
            <input type="number" value={form[f.key] ?? ''} placeholder="0" onChange={e => setNum(f.key, e.target.value, f.nullable)} className={input} />
          </td>
        ))}
        <td className="py-1.5 px-2 text-right whitespace-nowrap">
          <button onClick={() => setOpen(o => !o)} className="text-dim hover:text-foreground-soft mr-2">{open ? '상세 ▾' : '상세 ▸'}</button>
          <button onClick={() => void save()} disabled={busy || !dirty} className="text-primary font-bold hover:brightness-125 disabled:opacity-30 mr-2">저장</button>
          {isDecorative
            ? <button onClick={() => void remove()} disabled={busy} className="text-danger font-bold hover:brightness-125 disabled:opacity-40">삭제</button>
            : <span className="text-dim text-[10px]">기능</span>}
        </td>
      </tr>
      {open && (
        <tr className="bg-surface border-b border-outline-soft">
          <td colSpan={5} className="py-2 px-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[11px] text-dim">아이콘
                <input value={form.icon ?? ''} placeholder="🏗" onChange={e => setForm(f => ({ ...f, icon: e.target.value || null }))} className={`${input} w-12 mt-0.5`} />
              </label>
              <label className="text-[11px] text-dim">색
                <input value={form.colorHex ?? ''} placeholder="#rrggbb" onChange={e => setForm(f => ({ ...f, colorHex: e.target.value || null }))} className={`${input} w-20 mt-0.5`} />
              </label>
              {DETAIL_FIELDS.map(f => (
                <label key={f.key} className="text-[11px] text-dim">{f.label}
                  {isDecorative && f.production
                    ? <div className="h-7 flex items-center pl-1 text-dim text-[11px]">—</div>
                    : <input type="number" value={form[f.key] ?? ''} placeholder={f.nullable ? '-' : '0'}
                        onChange={e => setNum(f.key, e.target.value, f.nullable)} className={`${input} w-[70px] mt-0.5`} />}
                </label>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-outline-soft">
              <p className="text-[11px] text-dim mb-1.5">레벨별 세부 설정 <span className="text-muted">(비우면 공식 자동)</span></p>
              <div className="space-y-1.5">
                {UPGRADE_LEVELS.map(lv => (
                  <div key={lv} className="flex flex-wrap items-end gap-2">
                    <span className="text-[11px] text-foreground-soft font-bold w-10">→Lv{lv}</span>
                    {levelFields.map(f => (
                      <label key={f.key} className="text-[11px] text-dim">{f.label}
                        <input type="number" value={levelSpecs[lv]?.[f.key] ?? ''} placeholder="자동"
                          onChange={e => setLevelField(lv, f.key, e.target.value)}
                          className={`${input} w-[74px] mt-0.5`} />
                      </label>
                    ))}
                  </div>
                ))}
                <button onClick={() => void saveLevelSpecs()} disabled={levelBusy || !levelLoaded}
                  className="h-7 px-3 rounded-md bg-primary text-surface text-[11px] font-bold hover:brightness-110 disabled:opacity-40">레벨 설정 저장</button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function CreateForm({ onDone, onError }: { onDone: (m: string) => void; onError: (m: string) => void }) {
  const empty: BuildingTypeForm = { name: '', displayName: null, width: 1, height: 1, maxHp: 100, baseCostGp: 1000, upgradeCostGp: null, zoneRestriction: null, defensePower: null, foodProductionRate: null, unitCapacityPerLevel: null, gpProductionRate: null, icon: null, colorHex: null };
  const [form, setForm] = useState<BuildingTypeForm>(empty);
  const [busy, setBusy] = useState(false);
  const setNum = (k: keyof BuildingTypeForm, v: string, nullable?: boolean) =>
    setForm(f => ({ ...f, [k]: v.trim() === '' ? (nullable ? null : 0) : Number(v) }));

  // 생성은 장식 전용 — 생산 필드는 제외
  const CREATE_FIELDS = [...MAIN_FIELDS, ...DETAIL_FIELDS.filter(f => !f.production)];

  const create = async () => {
    if (busy) return;
    if (!form.name?.trim()) { onError('건물 코드를 입력하세요.'); return; }
    setBusy(true);
    try { await createBuildingType(form); onDone(`${form.name.toUpperCase()} 생성됨`); setForm(empty); }
    catch (e) { onError(e instanceof ApiError ? e.message : '생성 실패'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <p className="text-muted text-[11px] mb-2">장식 건물만 추가 가능(기능은 코드 매칭이라 신규 생성 불가) · HP·방어력만 유효</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[11px] text-dim">코드(영문)
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: STATUE" className={`${input} w-28 mt-0.5`} />
        </label>
        <label className="text-[11px] text-dim">표시명(한글)
          <input value={form.displayName ?? ''} onChange={e => setForm(f => ({ ...f, displayName: e.target.value || null }))} placeholder="예: 동상" className={`${input} w-24 mt-0.5`} />
        </label>
        <label className="text-[11px] text-dim">아이콘
          <input value={form.icon ?? ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value || null }))} placeholder="🗽" className={`${input} w-12 mt-0.5`} />
        </label>
        <label className="text-[11px] text-dim">색
          <input value={form.colorHex ?? ''} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value || null }))} placeholder="#rrggbb" className={`${input} w-20 mt-0.5`} />
        </label>
        {CREATE_FIELDS.map(f => (
          <label key={f.key} className="text-[11px] text-dim">{f.label}
            <input type="number" value={form[f.key] ?? ''} placeholder={f.nullable ? '-' : '0'}
              onChange={e => setNum(f.key, e.target.value, f.nullable)} className={`${input} w-[70px] mt-0.5`} />
          </label>
        ))}
        <button onClick={() => void create()} disabled={busy} className="h-8 px-4 rounded-md bg-primary text-surface text-xs font-bold hover:brightness-110 disabled:opacity-40">추가</button>
      </div>
    </div>
  );
}
