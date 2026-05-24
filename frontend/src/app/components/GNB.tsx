import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { useStompSubscribe } from '../hooks/useStompClient';

const navItems = [
  { icon: '🔔', label: '알림', path: '/app/notifications' },
  { icon: '⚔️', label: '길드', path: '/app/guild' },
  { icon: '🛍', label: '아이템샵', path: '/app/item-shop' },
  { icon: '⭐', label: '시즌패스', path: '/app/season-pass' },
  { icon: '🏆', label: '랭킹', path: '/app/ranking' },
  { icon: '🏝', label: '나의섬', path: '/app/my-island' },
  { icon: '👤', label: '마이페이지', path: '/app/mypage' },
];

export function GNB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ap, gp, hasPass, passEndDate, notifications, isLoggedIn, userId, incrementNotification } = useApp();

  const handleWsNotification = useCallback(() => {
    incrementNotification();
  }, [incrementNotification]);
  useStompSubscribe(userId ? `/sub/user/${userId}/notification` : null, handleWsNotification);

  const passDays = passEndDate
    ? Math.max(0, Math.ceil((passEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <header className="flex items-center px-4 gap-3 flex-shrink-0 z-40 h-[76px] bg-[#0a0e1a] border-b border-[#354064]">
      {/* Logo */}
      <button
        onClick={() => navigate('/app/map')}
        className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <span className="text-[#00f5ff] font-bold text-xl">⬡</span>
        <div>
          <p className="text-[#00f5ff] font-bold leading-none text-sm">픽셀경매</p>
          <p className="text-[#7788a5] leading-none text-[9px]">PIXEL AUCTION</p>
        </div>
      </button>

      {/* Search bar */}
      <div className="flex-1 max-w-xs mx-2">
        <input
          placeholder="영토 검색..."
          className="w-full h-8 bg-[#1a1f35] border border-[#354064] rounded-lg px-3 text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors text-xs"
        />
      </div>

      <div className="flex-1" />

      {isLoggedIn ? (
        <>
          {/* AP Chip */}
          <button
            onClick={() => navigate('/app/charge')}
            className="flex items-center gap-1.5 px-3 h-8 bg-[#2a1520] border border-[#ff006650] rounded-lg hover:border-[#ff0066] transition-colors"
          >
            <span className="text-[#ff0066] font-bold text-xs">⚡</span>
            <span className="text-[#ff0066] font-semibold text-xs">{ap.toLocaleString()} AP</span>
          </button>

          {/* GP Chip */}
          <div className="flex items-center gap-1.5 px-3 h-8 bg-[#0a2010] border border-[#00ff8850] rounded-lg">
            <span className="text-[#00ff88] font-bold text-xs">💎</span>
            <span className="text-[#00ff88] font-semibold text-xs">{gp.toLocaleString()} GP</span>
          </div>

          {/* Pass chip */}
          {hasPass && (
            <button
              onClick={() => navigate('/app/season-pass')}
              className="flex items-center gap-1 px-2.5 h-8 bg-[#1a1500] border border-[#ffd70050] rounded-lg hover:border-[#ffd700] transition-colors"
            >
              <span className="text-[11px]">⭐</span>
              <span className="text-[#ffd700] font-semibold text-[11px]">D-{passDays}</span>
            </button>
          )}

          {/* Nav icons */}
          <div className="flex items-center gap-0.5">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg hover:bg-[#2a3050] transition-colors min-w-[52px] h-14"
                  title={item.label}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className={`text-[10px] leading-none ${isActive ? 'font-semibold text-[#00f5ff]' : 'font-normal text-[#7788a5]'}`}>
                    {item.label}
                  </span>
                  {item.label === '알림' && notifications > 0 && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-[#ff0066] rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-[9px]">{notifications}</span>
                    </div>
                  )}
                  {isActive && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00f5ff] rounded-full" />}
                </button>
              );
            })}
          </div>

          {/* Settings */}
          <button
            onClick={() => navigate('/app/settings')}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#2a3050] transition-colors"
            style={{ color: location.pathname === '/app/settings' ? '#00f5ff' : '#7788a5' }}
            title="설정"
          >
            ⚙
          </button>
        </>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="px-5 h-8 rounded-lg font-semibold transition-opacity hover:opacity-80 bg-[#00f5ff] text-[#0a0e1a] text-[13px]"
        >
          로그인
        </button>
      )}
    </header>
  );
}
