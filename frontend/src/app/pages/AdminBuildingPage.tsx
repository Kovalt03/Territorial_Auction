import { useEffect, useState } from 'react';

import {
  fetchAdminBuildingTypes, createBuildingType, updateBuildingType, deleteBuildingType,
  type BuildingTypeForm,
} from '../api/admin';
import { ApiError } from '../api/client';

import type { BuildingTypeInfo } from '../types/island';

const STAT_FIELDS: { key: keyof BuildingTypeForm; label: string; nullable?: boolean; production?: boolean }[] = [
  { key: 'width', label: '너비' },
  { key: 'height', label: '높이' },
  { key: 'maxHp', label: 'HP' },
  { key: 'baseCostGp', label: '비용(GP)' },
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
      <p className="text-muted text-xs mb-1">이름(영문 코드)은 서버 식별자라 변경 불가. 표시명(한글)이 사용자에게 노출됩니다.</p>
      <p className="text-muted text-[11px] mb-4">
        <span className="text-primary font-semibold">기능</span> 건물(성·생산소·병영·저장소·농지·주거지)은 코드로 기능이 연결돼 스탯·표시명만 수정 가능 ·
        <span className="text-gp font-semibold"> 장식</span> 건물은 자유 생성(HP·방어력만 유효, 생산은 없음)
      </p>

      {error && <p className="text-danger text-xs mb-3">⚠ {error}</p>}
      {message && <p className="text-gp text-xs mb-3">✓ {message}</p>}

      <table className="w-full text-xs mb-6">
        <thead className="text-dim text-[11px] border-b border-outline">
          <tr>
            <th className="text-left font-medium py-2 px-2">코드 / 분류</th>
            <th className="text-left font-medium py-2 px-1 w-[90px]">표시명</th>
            <th className="text-left font-medium py-2 px-1 w-[48px]">아이콘</th>
            <th className="text-left font-medium py-2 px-1 w-[70px]">색</th>
            {STAT_FIELDS.map(f => <th key={f.key} className="text-left font-medium py-2 px-1 w-[68px]">{f.label}</th>)}
            <th className="text-right font-medium py-2 px-2 w-24"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(b => <Row key={b.buildingTypeId} item={b} onDone={onDone} onError={setError} />)}
          {items.length === 0 && <tr><td colSpan={15} className="py-8 text-center text-muted">건물이 없습니다.</td></tr>}
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

  const isDecorative = item.category === 'DECORATIVE';
  return (
    <tr className="border-b border-outline-soft">
      <td className="py-1.5 px-2 font-semibold whitespace-nowrap">
        <span className="mr-1">{form.icon || item.icon || '🏗'}</span>{item.name}
        <span className={`ml-1.5 text-[9px] font-bold ${isDecorative ? 'text-gp' : 'text-primary'}`}>{isDecorative ? '장식' : '기능'}</span>
      </td>
      <td className="py-1.5 px-1">
        <input value={form.displayName ?? ''} placeholder="한글명" onChange={e => setForm(f => ({ ...f, displayName: e.target.value || null }))} className={input} />
      </td>
      <td className="py-1.5 px-1">
        <input value={form.icon ?? ''} placeholder="🏗" onChange={e => setForm(f => ({ ...f, icon: e.target.value || null }))} className={input} />
      </td>
      <td className="py-1.5 px-1">
        <input value={form.colorHex ?? ''} placeholder="#rrggbb" onChange={e => setForm(f => ({ ...f, colorHex: e.target.value || null }))} className={input} />
      </td>
      {STAT_FIELDS.map(f => (
        <td key={f.key} className="py-1.5 px-1">
          {isDecorative && f.production
            ? <span className="text-dim text-[11px] pl-1">—</span>
            : <input type="number" value={form[f.key] ?? ''} placeholder={f.nullable ? '-' : '0'}
                onChange={e => set(f.key, e.target.value, f.nullable)} className={input} />}
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
  const empty: BuildingTypeForm = { name: '', displayName: null, width: 1, height: 1, maxHp: 100, baseCostGp: 1000, zoneRestriction: null, defensePower: null, foodProductionRate: null, unitCapacityPerLevel: null, gpProductionRate: null, icon: null, colorHex: null };
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
    <div>
      <p className="text-muted text-[11px] mb-2">장식 건물만 추가할 수 있습니다. (기능은 코드 매칭이라 신규 생성 불가) · HP·방어력만 유효</p>
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
        {STAT_FIELDS.filter(f => !f.production).map(f => (
          <label key={f.key} className="text-[11px] text-dim">{f.label}
            <input type="number" value={form[f.key] ?? ''} placeholder={f.nullable ? '-' : '0'}
              onChange={e => set(f.key, e.target.value, f.nullable)} className={`${input} w-[68px] mt-0.5`} />
          </label>
        ))}
        <button onClick={() => void create()} disabled={busy} className="h-8 px-4 rounded-md bg-primary text-surface text-xs font-bold hover:brightness-110 disabled:opacity-40">추가</button>
      </div>
    </div>
  );
}
