import { useNavigate, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';

const navItems = [
  { icon: '🔔', label: '알림', path: '/app/mypage' },
  { icon: '🛒', label: '장바구니', path: '/app/territory/15-22' },
  { icon: '🛍', label: '아이템샵', path: '/app/item-shop' },
  { icon: '⭐', label: '시즌패스', path: '/app/season-pass' },
  { icon: '🏆', label: '랭킹', path: '/app/ranking' },
  { icon: '🏝', label: '나의섬', path: '/app/my-island' },
  { icon: '👤', label: '마이페이지', path: '/app/mypage' },
];

export function GNB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ap, gp, hasPass, passEndDate, notifications } = useApp();

  const passDays = passEndDate
    ? Math.max(0, Math.ceil((passEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <header
      className="flex items-center px-4 gap-3 flex-shrink-0 z-40"
      style={{
        height: 76,
        background: '#0d1220',
        borderBottom: '1px solid #1e2a3d',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => navigate('/app/map')}
        className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <span className="text-[#00f5ff] font-bold" style={{ fontSize: 20 }}>⬡</span>
        <div>
          <p className="text-[#00f5ff] font-bold leading-none" style={{ fontSize: 14 }}>픽셀경매</p>
          <p className="text-[#7788a5] leading-none" style={{ fontSize: 9 }}>PIXEL AUCTION</p>
        </div>
      </button>

      {/* Search bar */}
      <div className="flex-1 max-w-xs mx-2">
        <input
          placeholder="영토 검색..."
          className="w-full h-8 bg-[#1a1f35] border border-[#354064] rounded-lg px-3 text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors"
          style={{ fontSize: 12 }}
        />
      </div>

      <div className="flex-1" />

      {/* AP Chip */}
      <button
        onClick={() => navigate('/app/charge')}
        className="flex items-center gap-1.5 px-3 h-8 bg-[#2a1520] border border-[#ff006650] rounded-lg hover:border-[#ff0066] transition-colors"
      >
        <span className="text-[#ff0066] font-bold" style={{ fontSize: 12 }}>⚡</span>
        <span className="text-[#ff0066] font-semibold" style={{ fontSize: 12 }}>{ap.toLocaleString()} AP</span>
      </button>

      {/* GP Chip */}
      <div className="flex items-center gap-1.5 px-3 h-8 bg-[#0a2010] border border-[#00ff8850] rounded-lg">
        <span className="text-[#00ff88] font-bold" style={{ fontSize: 12 }}>💎</span>
        <span className="text-[#00ff88] font-semibold" style={{ fontSize: 12 }}>{gp.toLocaleString()} GP</span>
      </div>

      {/* Pass chip */}
      {hasPass && (
        <button
          onClick={() => navigate('/app/season-pass')}
          className="flex items-center gap-1 px-2.5 h-8 bg-[#1a1500] border border-[#ffd70050] rounded-lg hover:border-[#ffd700] transition-colors"
        >
          <span style={{ fontSize: 11 }}>⭐</span>
          <span className="text-[#ffd700] font-semibold" style={{ fontSize: 11 }}>D-{passDays}</span>
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
              className="relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg hover:bg-[#2a3050] transition-colors"
              style={{ minWidth: 52, height: 56 }}
              title={item.label}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  color: isActive ? '#00f5ff' : '#7788a5',
                  fontWeight: isActive ? 600 : 400,
                  lineHeight: 1,
                }}
              >
                {item.label}
              </span>
              {item.label === '알림' && notifications > 0 && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-[#ff0066] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold" style={{ fontSize: 9 }}>{notifications}</span>
                </div>
              )}
              {isActive && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00f5ff] rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* Settings */}
      <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#2a3050] transition-colors text-[#7788a5]">
        ⚙
      </button>
    </header>
  );
}
