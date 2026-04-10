import { useState } from 'react';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';

const benefits = [
  { icon: '💎', title: '섬 GP +50%', desc: '영토 내 모든 GP 생산량 50% 증가' },
  { icon: '👷', title: '일꾼 +1', desc: '동시 건설 가능한 일꾼 수 1 증가' },
  { icon: '🏛', title: '토지세 면제 +2개', desc: '2개 영토 토지세 자동 면제' },
  { icon: '⭐', title: '시즌 보너스 XP', desc: '모든 활동에서 XP 30% 추가 획득' },
  { icon: '🔔', title: '우선 알림', desc: '입찰 경쟁 실시간 알림 우선 처리' },
];

export function SeasonPassPage() {
  const { ap, hasPass, passEndDate, activatePass } = useApp();
  const [showConfirm, setShowConfirm] = useState(false);
  const [activated, setActivated] = useState(false);

  const passDays = passEndDate
    ? Math.max(0, Math.ceil((passEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleActivate = () => {
    if (ap >= 1000) {
      activatePass();
      setActivated(true);
      setShowConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div style={{ fontSize: 48 }} className="mb-3">⭐</div>
            <h1 className="text-[#ffd700] font-bold mb-2" style={{ fontSize: 32 }}>시즌 패스</h1>
            <p className="text-[#7788a5]" style={{ fontSize: 14 }}>픽셀 경매의 프리미엄 혜택을 누려보세요</p>
          </div>

          {hasPass ? (
            <div className="bg-[#1a1f35] border-2 border-[#ffd700] rounded-2xl p-6 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-[#ffd70010] to-transparent" />
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="h-7 px-3 bg-[#ffd700] rounded-lg flex items-center">
                      <span className="text-[#0a0e1a] font-bold" style={{ fontSize: 12 }}>활성화됨</span>
                    </div>
                    <span className="text-[#ffd700] font-bold" style={{ fontSize: 18 }}>시즌 패스 활성 중</span>
                  </div>
                  <p className="text-[#7788a5]" style={{ fontSize: 13 }}>만료까지 D-{passDays}일 남았습니다</p>
                </div>
                <div className="text-right">
                  <p className="text-[#ffd700] font-bold" style={{ fontSize: 32 }}>D-{passDays}</p>
                  <p className="text-[#7788a5]" style={{ fontSize: 12 }}>
                    만료: {passEndDate?.toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
              <div className="h-2 bg-[#2a3050] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ffd700] rounded-full transition-all"
                  style={{ width: `${Math.max(5, (passDays / 30) * 100)}%` }}
                />
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="mt-4 px-5 py-2 bg-[#ffd700] rounded-xl text-[#0a0e1a] font-bold hover:brightness-110 transition-all"
                style={{ fontSize: 13 }}
              >
                + 30일 연장하기 (1,000 AP)
              </button>
            </div>
          ) : (
            <div className="bg-[#1a1f35] border border-[#354064] rounded-2xl p-6 mb-6">
              <p className="text-[#7788a5] text-center mb-4" style={{ fontSize: 14 }}>
                현재 시즌 패스가 없습니다. 구매하여 프리미엄 혜택을 누려보세요!
              </p>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={ap < 1000}
                className="w-full h-14 bg-[#ffd700] rounded-2xl text-[#0a0e1a] font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                style={{ fontSize: 18 }}
              >
                시즌 패스 구매 (1,000 AP)
              </button>
              {ap < 1000 && (
                <p className="text-center text-[#ff3333] mt-2" style={{ fontSize: 12 }}>
                  AP 부족 — 현재 {ap.toLocaleString()} AP (필요: 1,000 AP)
                </p>
              )}
            </div>
          )}

          <div className="bg-[#1a1f35] border border-[#354064] rounded-2xl overflow-hidden mb-6">
            <div className="bg-[#2a3050] px-5 py-3 border-b-2 border-[#ffd700]">
              <span className="text-[#e0e8ff] font-bold" style={{ fontSize: 15 }}>시즌 패스 혜택</span>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              {benefits.map(b => (
                <div key={b.title} className="flex items-center gap-4 p-4 bg-[#2a3050] rounded-xl">
                  <div className="w-12 h-12 bg-[#ffd70020] border border-[#ffd700] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span style={{ fontSize: 24 }}>{b.icon}</span>
                  </div>
                  <div>
                    <p className="text-[#ffd700] font-bold" style={{ fontSize: 15 }}>{b.title}</p>
                    <p className="text-[#7788a5]" style={{ fontSize: 12 }}>{b.desc}</p>
                  </div>
                  {hasPass && (
                    <div className="ml-auto bg-[#00ff8820] border border-[#00ff88] rounded px-2 py-1">
                      <span className="text-[#00ff88]" style={{ fontSize: 11 }}>✓ 활성</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#2a3050] border border-[#354064] rounded-xl p-4">
            <p className="text-[#7788a5]" style={{ fontSize: 12 }}>
              💡 중복 구매 시 남은 기간에 30일이 누적됩니다. 시즌 패스는 구매 즉시 활성화됩니다.
            </p>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
          <div className="bg-[#1a1f35] border-2 border-[#ffd700] rounded-2xl p-8 max-w-sm mx-4 text-center">
            <span style={{ fontSize: 48 }}>⭐</span>
            <h3 className="text-[#ffd700] font-bold text-xl mt-3 mb-2">
              {hasPass ? '시즌 패스 연장' : '시즌 패스 구매'}
            </h3>
            <div className="bg-[#2a3050] rounded-xl py-4 mb-3">
              <p className="text-[#7788a5]" style={{ fontSize: 12 }}>차감 AP</p>
              <p className="text-[#ffd700] font-bold" style={{ fontSize: 28 }}>1,000 AP</p>
              <p className="text-[#7788a5]" style={{ fontSize: 11 }}>
                잔여: {ap.toLocaleString()} → {(ap - 1000).toLocaleString()} AP
              </p>
            </div>
            {hasPass && (
              <div className="bg-[#2a3050] rounded-xl py-2 mb-5">
                <p className="text-[#e0e8ff]" style={{ fontSize: 13 }}>
                  현재 D-{passDays} + 30일 = <span className="text-[#ffd700] font-bold">D-{passDays + 30}</span>
                </p>
              </div>
            )}
            {!hasPass && <div className="mb-5" />}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 h-11 bg-[#2a3050] border border-[#354064] rounded-xl text-[#7788a5]"
                style={{ fontSize: 14 }}>취소</button>
              <button
                onClick={handleActivate}
                disabled={ap < 1000}
                className="flex-1 h-11 bg-[#ffd700] rounded-xl text-[#0a0e1a] font-bold disabled:opacity-50"
                style={{ fontSize: 14 }}
              >
                {hasPass ? '연장하기' : '구매하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activated && (
        <div className="fixed bottom-6 right-6 bg-[#1a1f35] border-2 border-[#ffd700] rounded-xl px-5 py-3 z-50 animate-bounce">
          <span className="text-[#ffd700] font-bold" style={{ fontSize: 14 }}>
            ⭐ 시즌 패스가 활성화되었습니다!
          </span>
        </div>
      )}
    </div>
  );
}
