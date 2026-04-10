import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GridBackground } from '../components/GridBackground';
import { useApp } from '../context/AppContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [form, setForm] = useState({ id: '', pw: '', pwConfirm: '', nickname: '' });
  const [idChecked, setIdChecked] = useState(false);
  const [idAvailable, setIdAvailable] = useState<boolean | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'id') { setIdChecked(false); setIdAvailable(null); }
  };

  const checkId = () => {
    if (!form.id) return;
    const taken = ['admin', 'test', 'pixel'].includes(form.id.toLowerCase());
    setIdAvailable(!taken);
    setIdChecked(true);
  };

  const handleSubmit = () => {
    if (!idChecked || !idAvailable) return;
    if (!form.pw || form.pw.length < 8) return;
    if (form.pw !== form.pwConfirm) return;
    if (!form.nickname) return;
    setShowWelcome(true);
  };

  const pwMatch = form.pw && form.pwConfirm ? form.pw === form.pwConfirm : null;

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative flex items-center justify-center overflow-hidden">
      <GridBackground />

      <div className="absolute w-[428px] h-[720px] bg-[#00f5ff] opacity-[0.06] rounded-3xl" />

      <div className="relative bg-[#1a1f35] border-[1.5px] border-[#00f5ff] rounded-2xl w-[400px] overflow-hidden shadow-2xl shadow-[#00f5ff]/10">
        <div className="pt-5 pb-3 flex flex-col items-center">
          <span className="text-[#00f5ff] font-bold" style={{ fontSize: 14 }}>⬡ PIXEL WAR</span>
        </div>

        <div className="px-7 pb-7">
          <h2 className="text-[#e0e8ff] font-bold mb-3" style={{ fontSize: 22 }}>회원가입</h2>

          <div className="bg-[#2a3050] border border-[#ffd700] rounded-lg px-4 py-2.5 mb-4">
            <span className="text-[#ffd700]" style={{ fontSize: 12, fontWeight: 500 }}>
              🎁  가입 완료 시 1,000 AP 즉시 지급
            </span>
          </div>

          <label className="block text-[#8892b0] mb-1.5" style={{ fontSize: 11, fontWeight: 500 }}>아이디</label>
          <div className="flex gap-2 mb-1">
            <input
              value={form.id}
              onChange={e => handleChange('id', e.target.value)}
              placeholder="아이디를 입력하세요"
              className="flex-1 bg-[#2a3050] border border-[#354064] rounded-md px-3 h-[38px] text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors"
              style={{ fontSize: 12 }}
            />
            <button
              onClick={checkId}
              className="bg-[#2a3050] border border-[#00f5ff] rounded-md px-3 h-[38px] text-[#00f5ff] hover:bg-[#354064] transition-colors flex-shrink-0"
              style={{ fontSize: 12 }}
            >
              중복확인
            </button>
          </div>
          {idChecked && (
            <p className={`text-xs mb-3 ${idAvailable ? 'text-[#00ff88]' : 'text-[#ff3333]'}`}>
              {idAvailable ? '✓ 사용 가능한 아이디입니다' : '✗ 이미 사용 중인 아이디입니다'}
            </p>
          )}
          {!idChecked && <div className="mb-3" />}

          <label className="block text-[#8892b0] mb-1.5" style={{ fontSize: 11, fontWeight: 500 }}>비밀번호</label>
          <input
            type="password"
            value={form.pw}
            onChange={e => handleChange('pw', e.target.value)}
            placeholder="8자 이상, 영문+숫자 조합"
            className="w-full bg-[#2a3050] border border-[#354064] rounded-md px-3 h-[38px] text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors mb-4"
            style={{ fontSize: 12 }}
          />

          <label className="block text-[#8892b0] mb-1.5" style={{ fontSize: 11, fontWeight: 500 }}>비밀번호 확인</label>
          <input
            type="password"
            value={form.pwConfirm}
            onChange={e => handleChange('pwConfirm', e.target.value)}
            placeholder="비밀번호를 다시 입력"
            className={`w-full bg-[#2a3050] border rounded-md px-3 h-[38px] text-[#e0e8ff] outline-none transition-colors mb-1 ${
              pwMatch === null ? 'border-[#354064]' : pwMatch ? 'border-[#00ff88]' : 'border-[#ff3333]'
            }`}
            style={{ fontSize: 12 }}
          />
          {pwMatch === false && <p className="text-[#ff3333] text-xs mb-3">비밀번호가 일치하지 않습니다</p>}
          {pwMatch !== false && <div className="mb-3" />}

          <label className="block text-[#8892b0] mb-1.5" style={{ fontSize: 11, fontWeight: 500 }}>닉네임</label>
          <input
            value={form.nickname}
            onChange={e => handleChange('nickname', e.target.value)}
            placeholder="다른 유저에게 보이는 이름"
            className="w-full bg-[#2a3050] border border-[#354064] rounded-md px-3 h-[38px] text-[#e0e8ff] outline-none focus:border-[#00f5ff] transition-colors mb-5"
            style={{ fontSize: 12 }}
          />

          <button
            onClick={handleSubmit}
            className="w-full h-12 bg-[#00f5ff] rounded-lg text-[#0a0e1a] font-bold hover:brightness-110 transition-all active:scale-[0.98] mb-3"
            style={{ fontSize: 15 }}
          >
            가입하기
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full h-[46px] bg-[#2a3050] border border-[#354064] rounded-lg text-[#8892b0] hover:bg-[#354064] transition-colors"
            style={{ fontSize: 14 }}
          >
            ← 로그인으로 돌아가기
          </button>

          <p className="text-center text-[#8892b0] mt-4" style={{ fontSize: 10 }}>
            가입 시 이용약관 및 개인정보처리방침에 동의합니다
          </p>
        </div>
      </div>

      {showWelcome && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
          <div className="bg-[#1a1f35] border-2 border-[#ffd700] rounded-2xl p-8 text-center max-w-sm mx-4 shadow-2xl shadow-[#ffd700]/20">
            <div className="text-5xl mb-4">🎁</div>
            <h3 className="text-[#ffd700] font-bold text-xl mb-2">가입을 축하합니다!</h3>
            <p className="text-[#8892b0] mb-3" style={{ fontSize: 14 }}>웰컴 보너스가 지급되었습니다</p>
            <div className="bg-[#2a3050] rounded-xl py-4 px-6 mb-5">
              <p className="text-[#00f5ff] font-bold" style={{ fontSize: 28 }}>+1,000 AP</p>
              <p className="text-[#8892b0] text-sm mt-1">즉시 사용 가능</p>
            </div>
            <button
              onClick={() => { login(form.nickname || form.id); setShowWelcome(false); navigate('/app/map'); }}
              className="w-full h-12 bg-[#00f5ff] rounded-lg text-[#0a0e1a] font-bold hover:brightness-110 transition-all"
              style={{ fontSize: 15 }}
            >
              게임 시작! 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
