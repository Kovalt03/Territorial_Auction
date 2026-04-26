import { useState } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';

type Section = 'notifications' | 'security' | 'account';

interface NotificationSettings {
  isOutbidEnabled: boolean;
  isAuctionStartEnabled: boolean;
  isMarketingEnabled: boolean;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('notifications');

  // 알림 설정
  const [notifications, setNotifications] = useState<NotificationSettings>({
    isOutbidEnabled: true,
    isAuctionStartEnabled: true,
    isMarketingEnabled: false,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // 계정 삭제
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleToggle = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    setNotifSaved(false);
  };

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    // TODO: PATCH /api/v1/users/me/settings
    await new Promise(r => setTimeout(r, 600));
    setNotifSaving(false);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess(false);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('모든 항목을 입력해주세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    setPwLoading(true);
    // TODO: PATCH /api/v1/users/me/password
    await new Promise(r => setTimeout(r, 600));
    setPwLoading(false);
    setPwSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPwSuccess(false), 3000);
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('비밀번호를 입력해주세요.');
      return;
    }
    if (deleteConfirmText !== '탈퇴합니다') {
      setDeleteError('"탈퇴합니다"를 정확히 입력해주세요.');
      return;
    }
    setDeleteLoading(true);
    // TODO: DELETE /api/v1/users/me
    await new Promise(r => setTimeout(r, 600));
    setDeleteLoading(false);
    navigate('/login');
  };

  const sidebarItems: { id: Section; icon: string; label: string }[] = [
    { id: 'notifications', icon: '🔔', label: '알림 설정' },
    { id: 'security', icon: '🔒', label: '보안' },
    { id: 'account', icon: '👤', label: '계정 관리' },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="flex-shrink-0 flex flex-col py-6 px-3 gap-1"
          style={{ width: 220, background: '#0d1220', borderRight: '1px solid #1e2a3d' }}
        >
          <p className="text-[#7788a5] font-semibold px-3 mb-3" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
            설정
          </p>
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left w-full"
              style={{
                background: activeSection === item.id ? '#00f5ff15' : 'transparent',
                color: activeSection === item.id ? '#00f5ff' : '#7788a5',
                border: activeSection === item.id ? '1px solid #00f5ff30' : '1px solid transparent',
                fontSize: 13,
                fontWeight: activeSection === item.id ? 600 : 400,
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div style={{ maxWidth: 560 }}>

            {/* 알림 설정 */}
            {activeSection === 'notifications' && (
              <div>
                <h2 className="text-[#e0e8ff] font-bold mb-1" style={{ fontSize: 20 }}>알림 설정</h2>
                <p className="text-[#7788a5] mb-6" style={{ fontSize: 13 }}>
                  수신할 알림 항목을 개별로 ON/OFF 할 수 있습니다.
                </p>

                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #354064' }}>
                  {[
                    {
                      key: 'isOutbidEnabled' as keyof NotificationSettings,
                      icon: '🔺',
                      label: '상회 입찰 알림',
                      desc: '내 입찰이 다른 유저에게 넘겨졌을 때 알림을 받습니다.',
                    },
                    {
                      key: 'isAuctionStartEnabled' as keyof NotificationSettings,
                      icon: '🏁',
                      label: '경매 시작 알림',
                      desc: '관심 대륙에서 새 경매가 시작될 때 알림을 받습니다.',
                    },
                    {
                      key: 'isMarketingEnabled' as keyof NotificationSettings,
                      icon: '📢',
                      label: '마케팅·이벤트 알림',
                      desc: '이벤트, 업데이트 등 마케팅 소식을 받습니다.',
                    },
                  ].map((item, idx, arr) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between px-5 py-4"
                      style={{
                        background: '#1a1f35',
                        borderBottom: idx < arr.length - 1 ? '1px solid #354064' : 'none',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span style={{ fontSize: 20, marginTop: 1 }}>{item.icon}</span>
                        <div>
                          <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 14 }}>{item.label}</p>
                          <p className="text-[#7788a5]" style={{ fontSize: 12 }}>{item.desc}</p>
                        </div>
                      </div>
                      {/* Toggle */}
                      <button
                        onClick={() => handleToggle(item.key)}
                        className="relative flex-shrink-0 rounded-full transition-colors duration-200"
                        style={{
                          width: 44,
                          height: 24,
                          background: notifications[item.key] ? '#00f5ff' : '#354064',
                        }}
                      >
                        <span
                          className="absolute top-1 rounded-full bg-white transition-all duration-200"
                          style={{
                            width: 16,
                            height: 16,
                            left: notifications[item.key] ? 24 : 4,
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveNotifications}
                  disabled={notifSaving}
                  className="mt-5 px-6 py-2.5 rounded-lg font-semibold transition-all"
                  style={{
                    fontSize: 14,
                    background: notifSaved ? '#00ff8820' : '#00f5ff20',
                    color: notifSaved ? '#00ff88' : '#00f5ff',
                    border: `1px solid ${notifSaved ? '#00ff88' : '#00f5ff'}`,
                    opacity: notifSaving ? 0.6 : 1,
                  }}
                >
                  {notifSaving ? '저장 중...' : notifSaved ? '✓ 저장됨' : '변경사항 저장'}
                </button>
              </div>
            )}

            {/* 보안 */}
            {activeSection === 'security' && (
              <div>
                <h2 className="text-[#e0e8ff] font-bold mb-1" style={{ fontSize: 20 }}>보안</h2>
                <p className="text-[#7788a5] mb-6" style={{ fontSize: 13 }}>
                  계정 비밀번호를 변경합니다.
                </p>

                <div className="rounded-xl p-6" style={{ background: '#1a1f35', border: '1px solid #354064' }}>
                  <p className="text-[#e0e8ff] font-semibold mb-4" style={{ fontSize: 15 }}>비밀번호 변경</p>

                  <div className="space-y-3">
                    {[
                      { label: '현재 비밀번호', value: currentPassword, setter: setCurrentPassword, placeholder: '현재 비밀번호 입력' },
                      { label: '새 비밀번호', value: newPassword, setter: setNewPassword, placeholder: '8자 이상, 영문+숫자+특수문자' },
                      { label: '새 비밀번호 확인', value: confirmPassword, setter: setConfirmPassword, placeholder: '새 비밀번호를 다시 입력' },
                    ].map(field => (
                      <div key={field.label}>
                        <label className="block text-[#7788a5] mb-1.5" style={{ fontSize: 12 }}>{field.label}</label>
                        <input
                          type="password"
                          value={field.value}
                          onChange={e => field.setter(e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full h-10 bg-[#0d1220] border rounded-lg px-3 text-[#e0e8ff] outline-none transition-colors"
                          style={{
                            fontSize: 13,
                            borderColor: '#354064',
                          }}
                          onFocus={e => (e.target.style.borderColor = '#00f5ff')}
                          onBlur={e => (e.target.style.borderColor = '#354064')}
                        />
                      </div>
                    ))}
                  </div>

                  {pwError && (
                    <p className="mt-3 text-[#ff4466]" style={{ fontSize: 12 }}>⚠ {pwError}</p>
                  )}
                  {pwSuccess && (
                    <p className="mt-3 text-[#00ff88]" style={{ fontSize: 12 }}>✓ 비밀번호가 성공적으로 변경되었습니다.</p>
                  )}

                  <button
                    onClick={handleChangePassword}
                    disabled={pwLoading}
                    className="mt-5 px-6 py-2.5 rounded-lg font-semibold transition-all"
                    style={{
                      fontSize: 14,
                      background: '#00f5ff20',
                      color: '#00f5ff',
                      border: '1px solid #00f5ff',
                      opacity: pwLoading ? 0.6 : 1,
                    }}
                  >
                    {pwLoading ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>
              </div>
            )}

            {/* 계정 관리 */}
            {activeSection === 'account' && (
              <div>
                <h2 className="text-[#e0e8ff] font-bold mb-1" style={{ fontSize: 20 }}>계정 관리</h2>
                <p className="text-[#7788a5] mb-6" style={{ fontSize: 13 }}>
                  계정을 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                </p>

                <div className="rounded-xl p-6" style={{ background: '#1a0a10', border: '1px solid #ff006640' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span style={{ fontSize: 18 }}>⚠</span>
                    <p className="text-[#ff4466] font-bold" style={{ fontSize: 15 }}>회원 탈퇴 (위험 영역)</p>
                  </div>

                  <div
                    className="rounded-lg p-4 mb-5"
                    style={{ background: '#ff006615', border: '1px solid #ff006630' }}
                  >
                    <p className="text-[#ff8899]" style={{ fontSize: 12, lineHeight: 1.7 }}>
                      탈퇴 시 다음 항목이 <strong>즉시 삭제·소멸</strong>됩니다.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {[
                        '보유 중인 모든 영토 자동 반납',
                        '보유 AP·GP 전액 소멸',
                        '길드 자동 탈퇴 처리',
                        '모든 입찰 취소',
                      ].map(item => (
                        <li key={item} className="text-[#ff8899] flex items-start gap-2" style={{ fontSize: 12 }}>
                          <span className="flex-shrink-0 mt-0.5">·</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[#ff8899] mb-1.5" style={{ fontSize: 12 }}>
                        현재 비밀번호
                      </label>
                      <input
                        type="password"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        placeholder="본인 확인을 위해 비밀번호를 입력하세요"
                        className="w-full h-10 bg-[#0d1220] border rounded-lg px-3 text-[#e0e8ff] outline-none"
                        style={{ fontSize: 13, borderColor: '#ff006640' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[#ff8899] mb-1.5" style={{ fontSize: 12 }}>
                        확인 문구 입력 — <span className="text-[#ff4466] font-bold">탈퇴합니다</span> 를 그대로 입력하세요
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        placeholder="탈퇴합니다"
                        className="w-full h-10 bg-[#0d1220] border rounded-lg px-3 text-[#e0e8ff] outline-none"
                        style={{ fontSize: 13, borderColor: '#ff006440' }}
                      />
                    </div>
                  </div>

                  {deleteError && (
                    <p className="mt-3 text-[#ff4466]" style={{ fontSize: 12 }}>⚠ {deleteError}</p>
                  )}

                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading || deleteConfirmText !== '탈퇴합니다' || !deletePassword}
                    className="mt-5 px-6 py-2.5 rounded-lg font-semibold transition-all"
                    style={{
                      fontSize: 14,
                      background: '#ff006620',
                      color: '#ff4466',
                      border: '1px solid #ff0066',
                      opacity: (deleteLoading || deleteConfirmText !== '탈퇴합니다' || !deletePassword) ? 0.4 : 1,
                      cursor: (deleteLoading || deleteConfirmText !== '탈퇴합니다' || !deletePassword) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {deleteLoading ? '처리 중...' : '계정 영구 삭제'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
