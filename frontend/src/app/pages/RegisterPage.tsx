import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useApp } from '../context/AppContext';
import { signupApi, loginApi, checkUsernameApi } from '../api/auth';
import { fetchMyProfile, fetchMyWallet } from '../api/user';
import { GridBackground } from '../components/GridBackground';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useApp();

  const [form, setForm] = useState({ username: '', email: '', password: '', pwConfirm: '', nickname: '' });
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'username') { setUsernameChecked(false); setUsernameAvailable(null); }
    setError('');
  };

  const handleCheckUsername = async () => {
    if (!form.username) return;
    try {
      await checkUsernameApi(form.username);
      setUsernameAvailable(true);
    } catch {
      setUsernameAvailable(false);
    }
    setUsernameChecked(true);
  };

  const handleSubmit = async () => {
    setError('');
    if (!usernameChecked || !usernameAvailable) { setError('아이디 중복확인을 해주세요.'); return; }
    if (!form.email) { setError('이메일을 입력해주세요.'); return; }
    if (form.password.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return; }
    if (form.password !== form.pwConfirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (!form.nickname) { setError('닉네임을 입력해주세요.'); return; }

    setIsLoading(true);
    try {
      await signupApi(form.username, form.email, form.password, form.nickname);
      const tokenData = await loginApi(form.email, form.password);
      localStorage.setItem('accessToken', tokenData.accessToken);
      const [profile, wallet] = await Promise.all([fetchMyProfile(), fetchMyWallet()]);
      login(profile.nickname, { token: tokenData.accessToken, userId: profile.userId, ap: wallet.availableAP, gp: wallet.availableGP });
      setShowWelcome(true);
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 409) setError('이미 사용 중인 아이디 또는 이메일입니다.');
      else setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const pwMatch = form.password && form.pwConfirm ? form.password === form.pwConfirm : null;

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative flex items-center justify-center overflow-hidden">
      <GridBackground />

      <div className="absolute w-[428px] h-[720px] bg-[#00f5ff] opacity-[0.06] rounded-3xl" />

      <div className="relative bg-[#1a1f35] border-[1.5px] border-[#00f5ff] rounded-2xl w-[400px] overflow-hidden shadow-2xl shadow-[#00f5ff]/10">
        <div className="pt-5 pb-3 flex flex-col items-center">
          <span className="text-[#00f5ff] font-bold text-sm">⬡ PIXEL WAR</span>
        </div>

        <div className="px-7 pb-7">
          <h2 className="text-[#e0e8ff] font-bold mb-3 text-[22px]">회원가입</h2>

          <div className="bg-[#2a3050] border border-[#ffd700] rounded-lg px-4 py-2.5 mb-4">
            <span className="text-[#ffd700] text-xs font-medium">
              🎁  가입 완료 시 1,000 AP 즉시 지급
            </span>
          </div>

          {/* 아이디 */}
          <label className="form-label">아이디</label>
          <div className="flex gap-2 mb-1">
            <input
              value={form.username}
              onChange={e => handleChange('username', e.target.value)}
              placeholder="영문, 숫자 4~20자"
              className="flex-1 bg-[#2a3050] border border-[#354064] rounded-md px-3 h-[38px] text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors text-xs"
            />
            <button
              onClick={handleCheckUsername}
              className="bg-[#2a3050] border border-[#00f5ff] rounded-md px-3 h-[38px] text-[#00f5ff] hover:bg-[#354064] transition-colors flex-shrink-0 text-xs"
            >
              중복확인
            </button>
          </div>
          {usernameChecked && (
            <p className={`mb-3 text-[11px] ${usernameAvailable ? 'text-[#00ff88]' : 'text-[#ff3333]'}`}>
              {usernameAvailable ? '✓ 사용 가능한 아이디입니다' : '✗ 이미 사용 중인 아이디입니다'}
            </p>
          )}
          {!usernameChecked && <div className="mb-3" />}

          {/* 이메일 */}
          <label className="form-label">이메일</label>
          <input
            type="email"
            value={form.email}
            onChange={e => handleChange('email', e.target.value)}
            placeholder="example@email.com"
            className="form-input mb-4"
          />

          {/* 비밀번호 */}
          <label className="form-label">비밀번호</label>
          <input
            type="password"
            value={form.password}
            onChange={e => handleChange('password', e.target.value)}
            placeholder="8자 이상, 영문+숫자 조합"
            className="form-input mb-4"
          />

          {/* 비밀번호 확인 */}
          <label className="form-label">비밀번호 확인</label>
          <input
            type="password"
            value={form.pwConfirm}
            onChange={e => handleChange('pwConfirm', e.target.value)}
            placeholder="비밀번호를 다시 입력"
            className={`w-full bg-[#2a3050] border rounded-md px-3 h-[38px] text-[#e0e8ff] outline-none transition-colors mb-4 text-xs ${
              pwMatch === null ? 'border-[#354064]' : pwMatch ? 'border-[#00ff88]' : 'border-[#ff3333]'
            }`}
          />

          {/* 닉네임 */}
          <label className="form-label">닉네임</label>
          <input
            value={form.nickname}
            onChange={e => handleChange('nickname', e.target.value)}
            placeholder="다른 유저에게 보이는 이름"
            className="form-input mb-4"
          />

          {error && (
            <p className="text-[#ff3333] mb-3 text-xs">⚠ {error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full h-12 bg-[#00f5ff] rounded-lg text-[#0a0e1a] font-bold hover:brightness-110 transition-all active:scale-[0.98] mb-3 disabled:opacity-50 disabled:cursor-not-allowed text-[15px]"
          >
            {isLoading ? '가입 중...' : '가입하기'}
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full h-[46px] bg-[#2a3050] border border-[#354064] rounded-lg text-[#8892b0] hover:bg-[#354064] transition-colors text-sm"
          >
            ← 로그인으로 돌아가기
          </button>
        </div>
      </div>

      {showWelcome && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
          <div className="bg-[#1a1f35] border-2 border-[#ffd700] rounded-2xl p-8 text-center max-w-sm mx-4 shadow-2xl shadow-[#ffd700]/20">
            <div className="text-5xl mb-4">🎁</div>
            <h3 className="text-[#ffd700] font-bold text-xl mb-2">가입을 축하합니다!</h3>
            <p className="text-[#8892b0] mb-3 text-sm">웰컴 보너스가 지급되었습니다</p>
            <div className="bg-[#2a3050] rounded-xl py-4 px-6 mb-5">
              <p className="text-[#00f5ff] font-bold text-[28px]">+1,000 AP</p>
              <p className="text-[#8892b0] text-sm mt-1">즉시 사용 가능</p>
            </div>
            <button
              onClick={() => { setShowWelcome(false); navigate('/app/map'); }}
              className="w-full h-12 bg-[#00f5ff] rounded-lg text-[#0a0e1a] font-bold hover:brightness-110 transition-all text-[15px]"
            >
              게임 시작! 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
