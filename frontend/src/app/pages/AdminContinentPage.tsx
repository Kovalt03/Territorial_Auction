import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { fetchAdminContinents, fetchAdminTerritories, changeTerritoryGrade } from '../api/admin';
import { ApiError } from '../api/client';

import { GradeDistributionEditor } from './GradeDistributionEditor';

import type { AdminContinentComposition, AdminTerritory } from '../types/admin';

const GRADES = ['S', 'A', 'B', 'C', 'D'];
const GRADE_COLOR: Record<string, string> = {
  S: '#ffd700', A: '#00f5ff', B: '#8b50ff', C: '#00ff88', D: '#7788a5',
};

export function AdminContinentPage() {
  const navigate = useNavigate();
  const [continents, setContinents] = useState<AdminContinentComposition[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [territories, setTerritories] = useState<AdminTerritory[]>([]);
  const [selected, setSelected] = useState<AdminTerritory | null>(null);
  const [grade, setGrade] = useState('S');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadContinents = () => {
    fetchAdminContinents()
      .then(r => setContinents(r.continents))
      .catch(e => setError(e instanceof ApiError ? e.message : '대륙을 불러올 수 없습니다.'));
  };
  const loadTerritories = (id: number) => {
    fetchAdminTerritories(id)
      .then(r => setTerritories(r.territories))
      .catch(e => setError(e instanceof ApiError ? e.message : '영토를 불러올 수 없습니다.'));
  };

  useEffect(() => { loadContinents(); }, []);
  useEffect(() => { if (selectedId != null) loadTerritories(selectedId); }, [selectedId]);

  const handleSelectTerritory = (t: AdminTerritory) => {
    setSelected(t); setGrade(t.grade); setReason(''); setError(null);
  };

  const handleApply = async () => {
    if (!selected || selectedId == null || isSaving) return;
    setIsSaving(true); setError(null);
    try {
      await changeTerritoryGrade(selected.territoryId, grade, reason);
      loadTerritories(selectedId); loadContinents();
      setSelected(prev => (prev ? { ...prev, grade } : null));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '변경에 실패했습니다.');
    } finally { setIsSaving(false); }
  };

  const selectedContinent = continents.find(c => c.continentId === selectedId);
  const xs = territories.map(t => t.coordX);
  const ys = territories.map(t => t.coordY);
  const minX = territories.length ? Math.min(...xs) : 0;
  const minY = territories.length ? Math.min(...ys) : 0;
  const cols = territories.length ? Math.max(...xs) - minX + 1 : 0;
  const rows = territories.length ? Math.max(...ys) - minY + 1 : 0;

  return (
    <div className="h-screen flex flex-col bg-surface text-foreground">
      <header className="flex items-center justify-between px-5 py-3 border-b border-outline">
        <h1 className="font-bold text-sm">🛡️ 관리자 · 대륙 영토 구성 관리</h1>
        <button onClick={() => { localStorage.removeItem('accessToken'); navigate('/admin/login'); }}
          className="text-muted text-xs hover:text-foreground-soft">로그아웃</button>
      </header>

      {error && <p className="text-danger text-xs px-5 py-2">⚠ {error}</p>}

      <div className="flex flex-1 overflow-hidden">
        {/* 대륙 목록 */}
        <div className="w-56 border-r border-outline overflow-y-auto p-2 flex-shrink-0">
          {continents.map(c => (
            <button key={c.continentId} onClick={() => { setSelectedId(c.continentId); setSelected(null); }}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${selectedId === c.continentId ? 'bg-elevated' : 'hover:bg-panel'}`}>
              <p className="text-[13px] font-semibold">{c.name} <span className="text-muted font-normal">{c.totalTerritories}</span></p>
              <p className="text-[10px] text-muted">
                {GRADES.filter(g => c.gradeBreakdown[g]).map(g => `${g}:${c.gradeBreakdown[g]}`).join(' ') || '영토 없음'}
              </p>
            </button>
          ))}
        </div>

        {/* 영토 그리드 */}
        <div className="flex-1 overflow-auto p-5">
          {selectedId == null ? (
            <p className="text-muted text-sm">대륙을 선택하세요.</p>
          ) : (
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${cols}, 16px)`, gridTemplateRows: `repeat(${rows}, 16px)` }}>
              {territories.map(t => (
                <button key={t.territoryId} onClick={() => handleSelectTerritory(t)}
                  title={`(${t.coordX}, ${t.coordY}) · ${t.grade}급 · ${t.status}`}
                  style={{
                    gridColumnStart: t.coordX - minX + 1,
                    gridRowStart: t.coordY - minY + 1,
                    background: (GRADE_COLOR[t.grade] ?? '#4a5568') + 'aa',
                    outline: selected?.territoryId === t.territoryId ? '2px solid #fff' : 'none',
                  }}
                  className="w-4 h-4 rounded-sm hover:brightness-125" />
              ))}
            </div>
          )}
        </div>

        {/* 편집 패널 */}
        <div className="w-64 border-l border-outline p-4 flex-shrink-0 overflow-y-auto">
          {selectedContinent && (
            <GradeDistributionEditor
              continentId={selectedContinent.continentId}
              total={selectedContinent.totalTerritories}
              initial={selectedContinent.gradeBreakdown}
              onApplied={() => { loadContinents(); loadTerritories(selectedContinent.continentId); }}
            />
          )}
          {!selected ? (
            <p className="text-muted text-xs">영토를 클릭해 값을 조정하세요.</p>
          ) : (
            <>
              <p className="font-bold text-sm mb-1">영토 ({selected.coordX}, {selected.coordY})</p>
              <p className="text-muted text-[11px] mb-4">
                현재 {selected.grade}급 · {selected.status}
                {selected.ownerNickname ? ` · ${selected.ownerNickname}` : ''}
              </p>

              <label className="block text-dim mb-1.5 text-[11px] font-medium">등급 변경</label>
              <div className="flex gap-1 mb-3">
                {GRADES.map(g => (
                  <button key={g} onClick={() => setGrade(g)}
                    style={{ borderColor: grade === g ? GRADE_COLOR[g] : undefined, color: grade === g ? GRADE_COLOR[g] : undefined }}
                    className={`flex-1 h-8 rounded-lg border text-xs font-bold ${grade === g ? '' : 'border-outline text-muted'}`}>
                    {g}
                  </button>
                ))}
              </div>

              <label className="block text-dim mb-1.5 text-[11px] font-medium">사유</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="변경 사유"
                className="w-full bg-elevated border border-outline rounded-md px-2 h-9 text-foreground outline-none focus:border-primary text-xs mb-4" />

              <button onClick={() => void handleApply()} disabled={isSaving || grade === selected.grade}
                className="w-full h-10 rounded-lg bg-primary text-surface font-bold text-sm hover:brightness-110 disabled:opacity-40">
                {isSaving ? '적용 중...' : '등급 변경 적용'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
