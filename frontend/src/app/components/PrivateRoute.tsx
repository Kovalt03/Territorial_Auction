import { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { useApp } from '../context/AppContext';

interface Props {
  children: ReactNode;
}

export function PrivateRoute({ children }: Props) {
  const { isLoggedIn } = useApp();
  const navigate = useNavigate();

  if (isLoggedIn) {
    return <>{children}</>;
  }

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0a0e1a' }}
    >
      <div
        className="flex flex-col items-center gap-6 p-10 rounded-2xl border"
        style={{ background: '#1a1f35', borderColor: '#354064' }}
      >
        <span style={{ fontSize: 48 }}>🔒</span>
        <div className="flex flex-col items-center gap-2">
          <p className="font-bold text-lg" style={{ color: '#e0e8ff' }}>
            로그인이 필요한 페이지입니다
          </p>
          <p className="text-sm" style={{ color: '#8892b0' }}>
            이 페이지에 접근하려면 먼저 로그인하세요.
          </p>
        </div>
        <button
          onClick={handleLogin}
          className="px-8 py-2.5 rounded-lg font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#00f5ff', color: '#0a0e1a' }}
        >
          로그인하기
        </button>
      </div>
    </div>
  );
}
