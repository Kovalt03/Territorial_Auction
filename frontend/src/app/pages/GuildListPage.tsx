import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';

import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import {
  fetchGuildList, fetchMyGuild, createGuild,
  joinGuild, cancelJoinGuild,
  type GuildSummary, type MyGuild,
} from '../api/guild';

export function GuildListPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useApp();

  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [myGuild, setMyGuild] = useState<MyGuild | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const SIZE = 20;

  const loadList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchGuildList({ page, size: SIZE, search: search || undefined });
      setGuilds(res.guilds);
      setTotalCount(res.totalCount);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchMyGuild().then(setMyGuild).catch(() => setMyGuild(null));
  }, [isLoggedIn]);

  const handleSearch = () => { setSearch(searchInput); setPage(0); };

  const handleCreate = async () => {
    if (!createName.trim()) { setCreateError('길드명을 입력해주세요.'); return; }
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await createGuild({ name: createName.trim(), description: createDesc.trim() || undefined });
      setShowCreate(false);
      navigate(`/app/guild/${res.guildId}`);
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      setCreateError(err.status === 409 ? '이미 존재하는 길드명이거나 이미 길드에 소속되어 있습니다.' : '길드 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (guildId: number) => {
    setJoiningId(guildId);
    setActionError(null);
    try {
      await joinGuild(guildId);
      setPendingId(guildId);
    } catch {
      setActionError('가입 신청에 실패했습니다.');
    } finally {
      setJoiningId(null);
    }
  };

  const handleCancelJoin = async (guildId: number) => {
    setJoiningId(guildId);
    try {
      await cancelJoinGuild(guildId);
      setPendingId(null);
    } catch {
      setActionError('취소에 실패했습니다.');
    } finally {
      setJoiningId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / SIZE);

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a]">
      <GNB />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-[#e0e8ff] font-bold" style={{ fontSize: 24 }}>길드</h1>
              <p className="text-[#7788a5]" style={{ fontSize: 13 }}>총 {totalCount}개 길드</p>
            </div>
            {isLoggedIn && !myGuild && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-lg font-semibold text-[#0a0e1a] bg-[#00f5ff] hover:bg-[#00d4e0] transition-colors"
                style={{ fontSize: 14 }}
              >
                + 길드 생성
              </button>
            )}
            {isLoggedIn && myGuild && (
              <button
                onClick={() => navigate(`/app/guild/${myGuild.guildId}`)}
                className="px-4 py-2 rounded-lg border border-[#00f5ff] text-[#00f5ff] hover:bg-[#00f5ff15] transition-colors"
                style={{ fontSize: 14 }}
              >
                내 길드 보기
              </button>
            )}
          </div>

          {/* Search */}
          <div className="flex gap-2 mb-5">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="길드명 검색..."
              className="flex-1 bg-[#1a1f35] border border-[#354064] rounded-lg px-4 text-[#e0e8ff] outline-none focus:border-[#00f5ff] placeholder-[#4a5a7a]"
              style={{ fontSize: 14, height: 40 }}
            />
            <button
              onClick={handleSearch}
              className="px-5 bg-[#2a3050] border border-[#354064] text-[#8892b0] hover:text-[#e0e8ff] rounded-lg transition-colors"
              style={{ fontSize: 14, height: 40 }}
            >
              검색
            </button>
          </div>

          {actionError && (
            <p className="text-[#ff3333] mb-3" style={{ fontSize: 13 }}>{actionError}</p>
          )}

          {/* List */}
          {isLoading ? (
            <div className="text-center text-[#4a5a7a] py-20" style={{ fontSize: 14 }}>불러오는 중...</div>
          ) : guilds.length === 0 ? (
            <div className="text-center text-[#4a5a7a] py-20" style={{ fontSize: 14 }}>검색 결과가 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {guilds.map(g => {
                const isMine = myGuild?.guildId === g.guildId;
                const isPending = pendingId === g.guildId;
                return (
                  <div
                    key={g.guildId}
                    className="bg-[#1a1f35] border border-[#354064] rounded-xl p-4 flex items-center gap-4 hover:border-[#4a5a7a] transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/guild/${g.guildId}`)}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                      style={{ background: '#00f5ff20', border: '2px solid #00f5ff', color: '#00f5ff', fontSize: 20 }}
                    >
                      {g.guildName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#e0e8ff] font-semibold truncate" style={{ fontSize: 15 }}>{g.guildName}</span>
                        <span
                          className="px-2 py-0.5 rounded text-xs flex-shrink-0"
                          style={{ background: g.recruitingStatus === 'OPEN' ? '#00ff8820' : '#ff333320', color: g.recruitingStatus === 'OPEN' ? '#00ff88' : '#ff3333', fontSize: 11 }}
                        >
                          {g.recruitingStatus === 'OPEN' ? '모집 중' : '모집 마감'}
                        </span>
                      </div>
                      <div className="flex gap-4 text-[#7788a5]" style={{ fontSize: 12 }}>
                        <span>길드장: {g.masterNickname}</span>
                        <span>멤버 {g.memberCount}/{g.maxMembers}</span>
                        <span>영토 {g.totalTerritories}개</span>
                        <span>🏆 {g.totalTrophyPoints.toLocaleString()}</span>
                      </div>
                    </div>
                    {isLoggedIn && !myGuild && g.recruitingStatus === 'OPEN' && (
                      <button
                        onClick={e => { e.stopPropagation(); isPending ? handleCancelJoin(g.guildId) : handleJoin(g.guildId); }}
                        disabled={joiningId === g.guildId}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors"
                        style={isPending
                          ? { background: '#2a3050', color: '#8892b0', border: '1px solid #354064' }
                          : { background: '#00f5ff20', color: '#00f5ff', border: '1px solid #00f5ff' }
                        }
                      >
                        {joiningId === g.guildId ? '처리 중...' : isPending ? '신청 취소' : '가입 신청'}
                      </button>
                    )}
                    {isMine && (
                      <span className="text-xs text-[#00f5ff] flex-shrink-0">내 길드</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + Math.max(0, page - 2)).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-8 h-8 rounded text-xs transition-colors"
                  style={p === page
                    ? { background: '#00f5ff', color: '#0a0e1a', fontWeight: 700 }
                    : { background: '#1a1f35', border: '1px solid #354064', color: '#8892b0' }
                  }
                >
                  {p + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
          <div className="bg-[#1a1f35] border border-[#354064] rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-[#e0e8ff] font-bold mb-4" style={{ fontSize: 18 }}>길드 생성</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[#7788a5] mb-1 block" style={{ fontSize: 12 }}>길드명 *</label>
                <input
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  maxLength={20}
                  placeholder="2~20자"
                  className="w-full bg-[#2a3050] border border-[#354064] rounded-lg px-3 py-2 text-[#e0e8ff] outline-none focus:border-[#00f5ff]"
                  style={{ fontSize: 14 }}
                />
              </div>
              <div>
                <label className="text-[#7788a5] mb-1 block" style={{ fontSize: 12 }}>소개글</label>
                <textarea
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="길드를 소개해주세요 (선택)"
                  className="w-full bg-[#2a3050] border border-[#354064] rounded-lg px-3 py-2 text-[#e0e8ff] outline-none focus:border-[#00f5ff] resize-none"
                  style={{ fontSize: 14 }}
                />
              </div>
              {createError && <p className="text-[#ff3333]" style={{ fontSize: 12 }}>{createError}</p>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-[#354064] text-[#8892b0] hover:border-[#4a5a7a]" style={{ fontSize: 14 }}>취소</button>
                <button onClick={handleCreate} disabled={isCreating} className="flex-1 py-2 rounded-lg bg-[#00f5ff] text-[#0a0e1a] font-semibold hover:bg-[#00d4e0] disabled:opacity-50 transition-colors" style={{ fontSize: 14 }}>
                  {isCreating ? '생성 중...' : '생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
