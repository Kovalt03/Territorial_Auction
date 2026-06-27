import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { useStompSubscribe } from '../hooks/useStompClient';
import { NotificationBell } from './NotificationBell';

const navItems = [
  { icon: '🏝', label: '나의섬', path: '/app/my-island' },
  { icon: '⚔️', label: '길드', path: '/app/guild' },
  { icon: '🛍', label: '아이템샵', path: '/app/item-shop' },
  { icon: '⭐', label: '시즌패스', path: '/app/season-pass' },
  { icon: '🏆', label: '랭킹', path: '/app/ranking' },
];

export function GNB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ap, gp, hasPass, passEndDate, isLoggedIn, userId, incrementNotification } = useApp();

  const handleWsNotification = useCallback(() => {
    incrementNotification();
  }, [incrementNotification]);
  useStompSubscribe(userId ? `/sub/user/${userId}/notification` : null, handleWsNotification);

  const passDays = passEndDate
    ? Math.max(0, Math.ceil((passEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <header className="flex items-center px-4 gap-3 flex-shrink-0 z-40 h-[76px] bg-surface border-b border-outline">
      {/* Logo */}
      <button
        onClick={() => navigate('/app/map')}
        className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <span className="text-primary font-bold text-xl">⬡</span>
        <div>
          <p className="text-primary font-bold leading-none text-sm">픽셀경매</p>
          <p className="text-muted leading-none text-[9px]">PIXEL AUCTION</p>
        </div>
      </button>

      {/* Search bar */}
      <div className="flex-1 max-w-xs mx-2">
        <input
          placeholder="영토 검색..."
          className="w-full h-8 bg-panel border border-outline rounded-lg px-3 text-foreground outline-none focus:border-primary transition-colors text-xs"
        />
      </div>

      <div className="flex-1" />

      {isLoggedIn ? (
        <>
          {/* AP Chip */}
          <button
            onClick={() => navigate('/app/charge')}
            className="flex items-center gap-1.5 px-3 h-8 bg-ap/10 border border-ap/30 rounded-lg hover:border-ap transition-colors"
          >
            <span className="text-ap font-bold text-xs">⚡</span>
            <span className="text-ap font-semibold text-xs">{ap.toLocaleString()} AP</span>
          </button>

          {/* GP Chip */}
          <div className="flex items-center gap-1.5 px-3 h-8 bg-gp/10 border border-gp/30 rounded-lg">
            <span className="text-gp font-bold text-xs">💎</span>
            <span className="text-gp font-semibold text-xs">{gp.toLocaleString()} GP</span>
          </div>

          {/* Pass chip */}
          {hasPass && (
            <button
              onClick={() => navigate('/app/season-pass')}
              className="flex items-center gap-1 px-2.5 h-8 bg-gold/10 border border-gold/30 rounded-lg hover:border-gold transition-colors"
            >
              <span className="text-[11px]">⭐</span>
              <span className="text-gold font-semibold text-[11px]">D-{passDays}</span>
            </button>
          )}

          {/* Nav icons */}
          <div className="flex items-center gap-0.5">
            {/* 영토 관리 드롭다운 */}
            <div className="relative group h-14 flex items-center">
              <button
                onClick={() => navigate('/app/territory-management')}
                className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg hover:bg-elevated transition-colors min-w-[52px] h-14"
                title="영토 관리"
              >
                <span className="text-lg">🗺</span>
                <span className={`text-[10px] leading-none ${location.pathname === '/app/territory-management' ? 'font-semibold text-primary' : 'font-normal text-muted'}`}>
                  영토 관리
                </span>
              </button>
              <div className="absolute right-0 top-full hidden group-hover:block bg-panel border border-outline rounded-lg shadow-lg overflow-hidden z-50 min-w-[150px]">
                {[
                  { label: '경매 진행', tab: 'active' },
                  { label: '내 영토', tab: 'mine' },
                  { label: '거래 내역', tab: 'history' },
                  { label: '입찰 현황', tab: 'bids' },
                  { label: '토지세', tab: 'tax' },
                ].map(item => (
                  <button
                    key={item.tab}
                    onClick={() => navigate(`/app/territory-management?tab=${item.tab}`)}
                    className="w-full text-left px-3 py-2.5 text-xs text-foreground hover:bg-elevated transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg hover:bg-elevated transition-colors min-w-[52px] h-14"
                  title={item.label}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className={`text-[10px] leading-none ${isActive ? 'font-semibold text-primary' : 'font-normal text-muted'}`}>
                    {item.label}
                  </span>
                  {isActive && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
                </button>
              );
            })}
            <NotificationBell />
          </div>

          {/* Settings */}
          <button
            onClick={() => navigate('/app/settings')}
            className={`w-9 h-9 flex items-center justify-center rounded-lg hover:bg-elevated transition-colors ${location.pathname === '/app/settings' ? 'text-primary' : 'text-muted'}`}
            title="설정"
          >
            ⚙
          </button>
        </>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="px-5 h-8 rounded-lg font-semibold transition-opacity hover:opacity-80 bg-primary text-surface text-[13px]"
        >
          로그인
        </button>
      )}
    </header>
  );
}
