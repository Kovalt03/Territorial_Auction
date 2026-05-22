import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';

import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import {
  fetchGuildDetail, fetchMyGuild, fetchGuildApplications,
  joinGuild, cancelJoinGuild, leaveGuild,
  approveApplication, rejectApplication, kickMember, transferMaster, updateGuild,
  type GuildDetail, type MyGuild, type GuildApplication,
} from '../api/guild';

type Tab = 'members' | 'applications' | 'settings';

export function GuildDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, userId } = useApp();
  const guildId = Number(id);

  const [guild, setGuild] = useState<GuildDetail | null>(null);
  const [myGuild, setMyGuild] = useState<MyGuild | null>(null);
  const [applications, setApplications] = useState<GuildApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('members');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);

  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [isSaving, setIsSaving] = useState(false);

  const isMaster = myGuild?.guildId === guildId && myGuild.myRole === 'MASTER';
  const isMember = myGuild?.guildId === guildId;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [detail] = await Promise.all([fetchGuildDetail(guildId)]);
      setGuild(detail);
      setEditDesc(detail.description ?? '');
    } catch {
      navigate('/app/guild');
    } finally {
      setIsLoading(false);
    }
  }, [guildId, navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchMyGuild().then(setMyGuild).catch(() => setMyGuild(null));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isMaster) return;
    fetchGuildApplications(guildId).then(setApplications).catch(() => {});
  }, [isMaster, guildId]);

  useEffect(() => {
    if (guild) setEditStatus((guild as GuildDetail & { recruitingStatus?: 'OPEN' | 'CLOSED' }).recruitingStatus ?? 'OPEN');
  }, [guild]);

  const act = async (fn: () => Promise<unknown>, successMsg?: string) => {
    setIsActing(true);
    setActionError(null);
    try {
      await fn();
      if (successMsg) alert(successMsg);
      load();
      fetchMyGuild().then(setMyGuild).catch(() => {});
    } catch {
      setActionError('작업에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsActing(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateGuild(guildId, { description: editDesc || undefined, recruitingStatus: editStatus });
      load();
    } catch {
      setActionError('설정 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-[#0a0e1a]">
        <GNB />
        <div className="flex-1 flex items-center justify-center text-[#4a5a7a]" style={{ fontSize: 14 }}>불러오는 중...</div>
      </div>
    );
  }

  if (!guild) return null;

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a]">
      <GNB />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">

          {/* Back */}
          <button onClick={() => navigate('/app/guild')} className="text-[#7788a5] hover:text-[#e0e8ff] mb-4 flex items-center gap-1" style={{ fontSize: 13 }}>
            ← 길드 목록
          </button>

          {/* Guild header */}
          <div className="bg-[#1a1f35] border border-[#354064] rounded-2xl p-6 mb-4">
            <div className="flex items-start gap-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-3xl flex-shrink-0"
                style={{ background: '#00f5ff20', border: '2px solid #00f5ff', color: '#00f5ff' }}
              >
                {guild.name.charAt(0)}
              </div>
              <div className="flex-1">
                <h1 className="text-[#e0e8ff] font-bold mb-1" style={{ fontSize: 22 }}>{guild.name}</h1>
                {guild.description && (
                  <p className="text-[#8892b0] mb-3" style={{ fontSize: 13 }}>{guild.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-[#7788a5]" style={{ fontSize: 13 }}>
                  <span>길드장: <span className="text-[#00f5ff]">{guild.master.nickname}</span></span>
                  <span>멤버 {guild.memberCount}명</span>
                  <span>영토 {guild.totalTerritoryCount}개</span>
                  <span>생성일: {new Date(guild.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {isLoggedIn && !myGuild && (
                  <button
                    onClick={() => act(() => joinGuild(guildId))}
                    disabled={isActing}
                    className="px-4 py-2 rounded-lg bg-[#00f5ff20] border border-[#00f5ff] text-[#00f5ff] hover:bg-[#00f5ff30] transition-colors"
                    style={{ fontSize: 13 }}
                  >
                    가입 신청
                  </button>
                )}
                {isMember && !isMaster && (
                  <button
                    onClick={() => { if (confirm('길드에서 탈퇴하시겠습니까?')) act(() => leaveGuild(guildId), '탈퇴했습니다.'); }}
                    disabled={isActing}
                    className="px-4 py-2 rounded-lg border border-[#354064] text-[#8892b0] hover:border-[#ff3333] hover:text-[#ff3333] transition-colors"
                    style={{ fontSize: 13 }}
                  >
                    탈퇴
                  </button>
                )}
              </div>
            </div>
            {actionError && <p className="text-[#ff3333] mt-3" style={{ fontSize: 12 }}>{actionError}</p>}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            {([['members', '멤버'], ...(isMaster ? [['applications', `신청 (${applications.length})`], ['settings', '설정']] as const : [])] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={tab === t
                  ? { background: '#00f5ff20', border: '1px solid #00f5ff', color: '#00f5ff', fontSize: 13 }
                  : { background: '#1a1f35', border: '1px solid #354064', color: '#7788a5', fontSize: 13 }
                }
              >
                {label}
              </button>
            ))}
          </div>

          {/* Members tab */}
          {tab === 'members' && (
            <div className="flex flex-col gap-2">
              {guild.members.map(m => (
                <div key={m.userId} className="bg-[#1a1f35] border border-[#354064] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
                    style={{ background: m.role === 'MASTER' ? '#ffd70020' : '#2a3050', color: m.role === 'MASTER' ? '#ffd700' : '#8892b0', fontSize: 14 }}
                  >
                    {m.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[#e0e8ff]" style={{ fontSize: 14 }}>{m.nickname}</span>
                      {m.role === 'MASTER' && <span className="text-[#ffd700] text-xs">👑 길드장</span>}
                    </div>
                    <span className="text-[#7788a5]" style={{ fontSize: 12 }}>영토 {m.territoryCount}개 · 가입일 {new Date(m.joinedAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {isMaster && m.userId !== userId && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { if (confirm(`${m.nickname}에게 길드장을 이전하시겠습니까?`)) act(() => transferMaster(guildId, m.userId)); }}
                        className="px-2 py-1 rounded text-xs border border-[#354064] text-[#8892b0] hover:border-[#ffd700] hover:text-[#ffd700] transition-colors"
                      >
                        이전
                      </button>
                      <button
                        onClick={() => { if (confirm(`${m.nickname}을 추방하시겠습니까?`)) act(() => kickMember(guildId, m.userId)); }}
                        className="px-2 py-1 rounded text-xs border border-[#354064] text-[#8892b0] hover:border-[#ff3333] hover:text-[#ff3333] transition-colors"
                      >
                        추방
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Applications tab */}
          {tab === 'applications' && isMaster && (
            <div className="flex flex-col gap-2">
              {applications.length === 0 && (
                <div className="text-center text-[#4a5a7a] py-12" style={{ fontSize: 14 }}>신청 내역이 없습니다.</div>
              )}
              {applications.map(a => (
                <div key={a.userId} className="bg-[#1a1f35] border border-[#354064] rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2a3050] flex items-center justify-center font-bold text-[#8892b0] flex-shrink-0" style={{ fontSize: 14 }}>
                    {a.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-[#e0e8ff]" style={{ fontSize: 14 }}>{a.nickname}</p>
                    {a.message && <p className="text-[#7788a5]" style={{ fontSize: 12 }}>"{a.message}"</p>}
                    <p className="text-[#4a5a7a]" style={{ fontSize: 11 }}>{new Date(a.appliedAt).toLocaleString('ko-KR')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(() => approveApplication(guildId, a.userId).then(() => fetchGuildApplications(guildId).then(setApplications)))}
                      disabled={isActing}
                      className="px-3 py-1.5 rounded-lg bg-[#00f5ff20] border border-[#00f5ff] text-[#00f5ff] text-xs hover:bg-[#00f5ff30] transition-colors"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => act(() => rejectApplication(guildId, a.userId).then(() => fetchGuildApplications(guildId).then(setApplications)))}
                      disabled={isActing}
                      className="px-3 py-1.5 rounded-lg border border-[#354064] text-[#8892b0] text-xs hover:border-[#ff3333] hover:text-[#ff3333] transition-colors"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Settings tab */}
          {tab === 'settings' && isMaster && (
            <div className="bg-[#1a1f35] border border-[#354064] rounded-2xl p-5 flex flex-col gap-4">
              <div>
                <label className="text-[#7788a5] block mb-1" style={{ fontSize: 12 }}>소개글</label>
                <textarea
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  maxLength={200}
                  rows={4}
                  className="w-full bg-[#2a3050] border border-[#354064] rounded-lg px-3 py-2 text-[#e0e8ff] outline-none focus:border-[#00f5ff] resize-none"
                  style={{ fontSize: 14 }}
                />
              </div>
              <div>
                <label className="text-[#7788a5] block mb-2" style={{ fontSize: 12 }}>모집 상태</label>
                <div className="flex gap-2">
                  {(['OPEN', 'CLOSED'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className="px-4 py-2 rounded-lg text-sm transition-colors"
                      style={editStatus === s
                        ? { background: '#00f5ff20', border: '1px solid #00f5ff', color: '#00f5ff' }
                        : { background: '#2a3050', border: '1px solid #354064', color: '#7788a5' }
                      }
                    >
                      {s === 'OPEN' ? '모집 중' : '모집 마감'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="py-2 rounded-lg bg-[#00f5ff] text-[#0a0e1a] font-semibold hover:bg-[#00d4e0] disabled:opacity-50 transition-colors"
                style={{ fontSize: 14 }}
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
