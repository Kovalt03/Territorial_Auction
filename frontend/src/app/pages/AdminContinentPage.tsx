import { useEffect, useState } from 'react';

import { fetchAdminContinents, fetchAdminTerritories } from '../api/admin';
import { ApiError } from '../api/client';

import { GradeDistributionEditor } from './GradeDistributionEditor';
import { TerritoryEditPanel } from './TerritoryEditPanel';
import { TerritoryGrid } from './TerritoryGrid';
import { TerritoryFilters } from './TerritoryFilters';

import type {
  AdminContinentComposition, AdminTerritory, StatusFilter, GradeFilter,
} from '../types/admin';

const GRADES = ['S', 'A', 'B', 'C', 'D'];

export function AdminContinentPage() {
  const [continents, setContinents] = useState<AdminContinentComposition[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [territories, setTerritories] = useState<AdminTerritory[]>([]);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('ALL');
  const [disabledOnly, setDisabledOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const selectedContinent = continents.find(c => c.continentId === selectedId);
  const selected = territories.find(t => t.territoryId === selectedTerritoryId) ?? null;

  const bidding = territories.filter(t => t.status === 'BIDDING').length;
  const occupied = territories.filter(t => t.status === 'OCCUPIED').length;
  const idle = territories.filter(t => t.status === 'IDLE').length;
  const disabled = territories.filter(t => !t.auctionEnabled).length;

  const handleChanged = () => {
    if (selectedId != null) loadTerritories(selectedId);
    loadContinents();
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* 대륙 목록 */}
      <div className="w-56 border-r border-outline overflow-y-auto p-2 flex-shrink-0">
        {error && <p className="text-danger text-[11px] mb-2">⚠ {error}</p>}
        {continents.map(c => (
          <button key={c.continentId} onClick={() => { setSelectedId(c.continentId); setSelectedTerritoryId(null); }}
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
          <>
            <div className="flex items-center gap-3 mb-3 text-[11px]">
              <span className="font-semibold text-sm">{selectedContinent?.name}</span>
              <span className="text-flare">경매중 {bidding}</span>
              <span className="text-muted">점유 {occupied}</span>
              <span className="text-muted">유휴 {idle}</span>
              <span className="text-danger">경매중지 {disabled}</span>
            </div>
            <TerritoryFilters
              status={statusFilter} onStatus={setStatusFilter}
              grade={gradeFilter} onGrade={setGradeFilter}
              disabledOnly={disabledOnly} onDisabledOnly={setDisabledOnly}
            />
            <TerritoryGrid
              territories={territories} selectedTerritoryId={selectedTerritoryId} onSelect={setSelectedTerritoryId}
              statusFilter={statusFilter} gradeFilter={gradeFilter} disabledOnly={disabledOnly}
            />
          </>
        )}
      </div>

      {/* 편집 패널 */}
      <div className="w-64 border-l border-outline p-4 flex-shrink-0 overflow-y-auto">
        {selectedContinent && (
          <GradeDistributionEditor
            continentId={selectedContinent.continentId}
            total={selectedContinent.totalTerritories}
            initial={selectedContinent.gradeBreakdown}
            onApplied={handleChanged}
          />
        )}
        {!selected ? (
          <p className="text-muted text-xs">영토를 클릭해 값을 조정하세요.</p>
        ) : (
          <TerritoryEditPanel territory={selected} onChanged={handleChanged} />
        )}
      </div>
    </div>
  );
}
