import { useEffect, useState } from 'react';

import {
  fetchAdminBuildingTypes, createBuildingType, updateBuildingType, deleteBuildingType,
  type BuildingTypeForm,
} from '../api/admin';
import { ApiError } from '../api/client';

import type { BuildingTypeInfo } from '../types/island';

const STAT_FIELDS: { key: keyof BuildingTypeForm; label: string; nullable?: boolean }[] = [
  { key: 'width', label: '너비' },
  { key: 'height', label: '높이' },
  { key: 'maxHp', label: 'HP' },
  { key: 'baseCostGp', label: '비용(GP)' },
  { key: 'zoneRestriction', label: 'Zone제한', nullable: true },
  { key: 'defensePower', label: '방어력', nullable: true },
  { key: 'foodProductionRate', label: '식량/시간', nullable: true },
  { key: 'unitCapacityPerLevel', label: '유닛/레벨', nullable: true },
  { key: 'gpProductionRate', label: 'GP/시간', nullable: true },
];

function toForm(b: BuildingTypeInfo): BuildingTypeForm {
  return {
    width: b.width, height: b.height, maxHp: b.maxHp, baseCostGp: b.baseCostGp,
    zoneRestriction: b.zoneRestriction, defensePower: b.defensePower,
    foodProductionRate: b.foodProductionRate, unitCapacityPerLevel: b.unitCapacityPerLevel,
    gpProductionRate: b.gpProductionRate, icon: b.icon, colorHex: b.colorHex,
  };
}

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
      <p className="text-muted text-xs mb-4">건물 종류를 추가·수정·삭제합니다. 이름은 게임 로직 식별자라 생성 후 변경할 수 없습니다.</p>

      {error && <p className="text-danger text-xs mb-3">⚠ {error}</p>}
      {message && <p className="text-gp text-xs mb-3">✓ {message}</p>}

      <table className="w-full text-xs mb-6">
        <thead className="text-dim text-[11px] border-b border-outline">
          <tr>
            <th className="text-left font-medium py-2 px-2">이름</th>
            <th className="text-left font-medium py-2 px-1 w-[48px]">아이콘</th>
            <th className="text-left font-medium py-2 px-1 w-[70px]">색</th>
            {STAT_FIELDS.map(f => <th key={f.key} className="text-left font-medium py-2 px-1 w-[68px]">{f.label}</th>)}
            <th className="text-right font-medium py-2 px-2 w-24"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(b => <Row key={b.buildingTypeId} item={b} onDone={onDone} onError={setError} />)}
          {items.length === 0 && <tr><td colSpan={13} className="py-8 text-center text-muted">건물이 없습니다.</td></tr>}
        </tbody>
      </table>

      <section className="bg-panel border border-outline rounded-xl p-4 max-w-3xl">
        <h3 className="font-bold text-sm mb-3">새 건물 추가</h3>
        <CreateForm onDone={onDone} onError={setError} />
      </section>
    </div>
  );
}

const input = 'w-full bg-elevated border border-outline rounded px-1.5 h-7 text-foreground text-[11px] outline-none focus:border-primary';

function Row({ item, onDone, onError }: { item: BuildingTypeInfo; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [form, setForm] = useState<BuildingTypeForm>(toForm(item));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(item));

  const set = (k: keyof BuildingTypeForm, v: string, nullable?: boolean) =>
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
    <tr className="border-b border-outline-soft">
      <td className="py-1.5 px-2 font-semibold">
        <span className="mr-1">{form.icon || item.icon || '🏗'}</span>{item.name}
      </td>
      <td className="py-1.5 px-1">
        <input value={form.icon ?? ''} placeholder="🏗" onChange={e => setForm(f => ({ ...f, icon: e.target.value || null }))} className={input} />
      </td>
      <td className="py-1.5 px-1">
        <input value={form.colorHex ?? ''} placeholder="#rrggbb" onChange={e => setForm(f => ({ ...f, colorHex: e.target.value || null }))} className={input} />
      </td>
      {STAT_FIELDS.map(f => (
        <td key={f.key} className="py-1.5 px-1">
          <input type="number" value={form[f.key] ?? ''} placeholder={f.nullable ? '-' : '0'}
            onChange={e => set(f.key, e.target.value, f.nullable)} className={input} />
        </td>
      ))}
      <td className="py-1.5 px-2 text-right whitespace-nowrap">
        <button onClick={() => void save()} disabled={busy || !dirty} className="text-primary font-bold hover:brightness-125 disabled:opacity-30 mr-2">저장</button>
        <button onClick={() => void remove()} disabled={busy} className="text-danger font-bold hover:brightness-125 disabled:opacity-40">삭제</button>
      </td>
    </tr>
  );
}

function CreateForm({ onDone, onError }: { onDone: (m: string) => void; onError: (m: string) => void }) {
  const empty: BuildingTypeForm = { name: '', width: 1, height: 1, maxHp: 100, baseCostGp: 1000, zoneRestriction: null, defensePower: null, foodProductionRate: null, unitCapacityPerLevel: null, gpProductionRate: null, icon: null, colorHex: null };
  const [form, setForm] = useState<BuildingTypeForm>(empty);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof BuildingTypeForm, v: string, nullable?: boolean) =>
    setForm(f => ({ ...f, [k]: v.trim() === '' ? (nullable ? null : 0) : Number(v) }));

  const create = async () => {
    if (busy) return;
    if (!form.name?.trim()) { onError('건물 이름을 입력하세요.'); return; }
    setBusy(true);
    try { await createBuildingType(form); onDone(`${form.name.toUpperCase()} 생성됨`); setForm(empty); }
    catch (e) { onError(e instanceof ApiError ? e.message : '생성 실패'); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-[11px] text-dim">이름
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="예: LIGHTHOUSE" className={`${input} w-32 mt-0.5`} />
      </label>
      <label className="text-[11px] text-dim">아이콘
        <input value={form.icon ?? ''} onChange={e => setForm(f => ({ ...f, icon: e.target.value || null }))} placeholder="🏗" className={`${input} w-12 mt-0.5`} />
      </label>
      <label className="text-[11px] text-dim">색
        <input value={form.colorHex ?? ''} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value || null }))} placeholder="#rrggbb" className={`${input} w-20 mt-0.5`} />
      </label>
      {STAT_FIELDS.map(f => (
        <label key={f.key} className="text-[11px] text-dim">{f.label}
          <input type="number" value={form[f.key] ?? ''} placeholder={f.nullable ? '-' : '0'}
            onChange={e => set(f.key, e.target.value, f.nullable)} className={`${input} w-[68px] mt-0.5`} />
        </label>
      ))}
      <button onClick={() => void create()} disabled={busy} className="h-8 px-4 rounded-md bg-primary text-surface text-xs font-bold hover:brightness-110 disabled:opacity-40">추가</button>
    </div>
  );
}
