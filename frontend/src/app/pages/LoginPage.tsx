import { useState } from 'react';
import { useNavigate } from 'react-router';

import { loginApi } from '../api/auth';
import { fetchMyProfile, fetchMyWallet } from '../api/user';
import { GridBackground } from '../components/GridBackground';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !pw) { setError('이메일과 비밀번호를 입력해주세요.'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const { accessToken } = await loginApi(email, pw);
      localStorage.setItem('accessToken', accessToken);
      const [profile, wallet] = await Promise.all([fetchMyProfile(), fetchMyWallet()]);
      login(profile.nickname, {
        token: accessToken,
        userId: profile.userId,
        ap: wallet.availableAP,
        gp: wallet.availableGP,
      });
      navigate('/app/map');
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = () => {
    login('게스트');
    navigate('/app/map');
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative flex items-center justify-center overflow-hidden">
      <GridBackground />

      <div className="absolute w-[500px] h-[600px] bg-[#00f5ff] opacity-[0.04] rounded-full blur-3xl" />

      <div className="relative bg-[#1a1f35] border-[1.5px] border-[#00f5ff] rounded-2xl w-[380px] overflow-hidden shadow-2xl" style={{ boxShadow: '0 0 40px #00f5ff15' }}>
        <div className="pt-8 pb-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-[#00f5ff15] border-2 border-[#00f5ff] rounded-2xl flex items-center justify-center mb-3">
            <span className="text-[32px]">⬡</span>
          </div>
          <h1 className="text-[#00f5ff] font-bold text-[22px]">픽셀 경매</h1>
          <p className="text-[#7788a5] text-xs">PIXEL AUCTION · 사이버 영토 전쟁</p>
        </div>

        <div className="px-8 pb-8">
          <div className="bg-[#2a1500] border border-[#ffd70060] rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2">
            <span className="text-base">🎁</span>
            <span className="text-[#ffd700] text-xs">신규 가입 시 1,000 AP 즉시 지급!</span>
          </div>

          {error && (
            <div className="bg-[#ff333320] border border-[#ff3333] rounded-lg px-3 py-2 mb-3">
              <span className="text-[#ff3333] text-xs">{error}</span>
            </div>
          )}

          <label className="form-label">이메일</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="이메일을 입력하세요"
            className="w-full bg-[#2a3050] border border-[#354064] rounded-lg px-4 h-11 text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors mb-4 text-sm"
          />

          <label className="form-label">비밀번호</label>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="비밀번호를 입력하세요"
            className="w-full bg-[#2a3050] border border-[#354064] rounded-lg px-4 h-11 text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors mb-5 text-sm"
          />

          <button
            onClick={handleLogin}
            disabled={isSubmitting}
            className="w-full h-12 bg-[#00f5ff] rounded-xl text-[#0a0e1a] font-bold hover:brightness-110 transition-all active:scale-[0.98] mb-3 disabled:opacity-60 text-base"
          >
            {isSubmitting ? '로그인 중...' : '로그인'}
          </button>

          <button
            onClick={() => navigate('/register')}
            className="w-full h-11 bg-[#2a3050] border border-[#354064] rounded-xl text-[#e0e8ff] hover:bg-[#354064] transition-colors mb-3 text-sm"
          >
            회원가입
          </button>

          <button
            onClick={handleGuest}
            className="w-full text-center text-[#7788a5] hover:text-[#e0e8ff] transition-colors text-xs"
          >
            게스트로 둘러보기 →
          </button>
        </div>
      </div>
    </div>
  );
}
