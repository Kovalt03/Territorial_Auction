import { useState } from 'react';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router';

const packages = [
  { id: 0, ap: 5000, price: 5000, discount: 0, color: '#e0e8ff', borderColor: '#e0e8ff' },
  { id: 1, ap: 10000, price: 9000, originalPrice: 10000, discount: 10, color: '#00f5ff', borderColor: '#00f5ff', label: '10% 할인' },
  { id: 2, ap: 30000, price: 24000, originalPrice: 30000, discount: 20, color: '#ffd700', borderColor: '#ffd700', label: 'BEST 20% 할인', best: true },
  { id: 3, ap: 50000, price: 35000, originalPrice: 50000, discount: 30, color: '#8b50ff', borderColor: '#8b50ff', label: 'VIP 30% 할인' },
];

const payMethods = [
  { id: 'card', icon: '💳', label: '신용카드 / 체크카드' },
  { id: 'kakao', icon: '💛', label: '카카오페이' },
  { id: 'naver', icon: '💚', label: '네이버페이' },
  { id: 'toss', icon: '💙', label: '토스페이' },
];

export function ChargePage() {
  const navigate = useNavigate();
  const { addAP, ap } = useApp();
  const [selectedPkg, setSelectedPkg] = useState(2);
  const [selectedPay, setSelectedPay] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newAP, setNewAP] = useState(0);

  const pkg = packages[selectedPkg];

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      addAP(pkg.ap);
      setNewAP(ap + pkg.ap);
      setIsProcessing(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0e1a] overflow-hidden">
      <GNB />

      <div className="flex-1 overflow-y-auto p-5">
        <h1 className="text-[#e0e8ff] font-bold mb-1" style={{ fontSize: 24 }}>💎  AP (Auction Point) 충전</h1>
        <p className="text-[#7788a5] mb-6" style={{ fontSize: 14 }}>경매 입찰, 아이템 구매에 사용하는 프리미엄 포인트</p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {packages.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPkg(p.id)}
              className="relative bg-[#1a1f35] rounded-2xl p-4 text-left transition-all hover:scale-105"
              style={{
                border: `${p.best ? 2 : 1}px solid ${selectedPkg === p.id ? p.borderColor : '#354064'}`,
                boxShadow: selectedPkg === p.id ? `0 0 20px ${p.color}30` : undefined,
              }}
            >
              {p.label && (
                <div className="mb-3 h-6 rounded-xl px-3 flex items-center w-fit" style={{ background: p.color }}>
                  <span className="text-[#0a0e1a] font-bold" style={{ fontSize: 12 }}>{p.label}</span>
                </div>
              )}
              {!p.label && <div className="h-6 mb-3" />}
              <p className="font-bold" style={{ fontSize: 26, color: p.color }}>{p.ap.toLocaleString()} AP</p>
              {p.originalPrice && (
                <p className="text-[#7788a5] line-through" style={{ fontSize: 13 }}>₩{p.originalPrice.toLocaleString()}</p>
              )}
              <p className="text-[#e0e8ff] font-semibold" style={{ fontSize: 20 }}>₩{p.price.toLocaleString()}</p>
              <div
                className="mt-4 h-11 rounded-xl flex items-center justify-center font-semibold"
                style={{
                  background: selectedPkg === p.id ? p.color : '#2a3050',
                  border: `1px solid ${selectedPkg === p.id ? p.color : '#354064'}`,
                  color: selectedPkg === p.id ? '#0a0e1a' : p.color,
                  fontSize: 14,
                }}
              >
                {selectedPkg === p.id ? '✓ 선택됨' : '선택하기'}
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1a1f35] border border-[#354064] rounded-xl overflow-hidden">
            <div className="bg-[#2a3050] px-4 py-2.5 border-b-2 border-[#00f5ff]">
              <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>결제 수단 선택</span>
            </div>
            <div className="p-4 space-y-3">
              {payMethods.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPay(pm.id)}
                  className="w-full h-12 rounded-xl flex items-center px-4 gap-3 transition-all"
                  style={{
                    background: '#2a3050',
                    border: `1px solid ${selectedPay === pm.id ? '#00f5ff' : '#354064'}`,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{pm.icon}</span>
                  <span className="text-[#e0e8ff]" style={{ fontSize: 14 }}>{pm.label}</span>
                  {selectedPay === pm.id && (
                    <div className="ml-auto w-6 h-6 bg-[#00f5ff] rounded-xl flex items-center justify-center">
                      <span className="text-[#0a0e1a] font-bold" style={{ fontSize: 12 }}>✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#1a1f35] border border-[#354064] rounded-xl overflow-hidden">
            <div className="bg-[#2a3050] px-4 py-2.5 border-b-2 border-[#00f5ff]">
              <span className="text-[#e0e8ff] font-semibold" style={{ fontSize: 13 }}>결제 요약</span>
            </div>
            <div className="p-5">
              <p className="text-[#7788a5] mb-1" style={{ fontSize: 12 }}>선택한 상품</p>
              <p className="text-[#e0e8ff] font-bold mb-4" style={{ fontSize: 18 }}>{pkg.ap.toLocaleString()} AP 패키지</p>
              <div className="h-px bg-[#354064] mb-4" />
              <div className="space-y-3 mb-4">
                {pkg.originalPrice && (
                  <div className="flex justify-between">
                    <span className="text-[#7788a5]" style={{ fontSize: 13 }}>정가</span>
                    <span className="text-[#e0e8ff]" style={{ fontSize: 13 }}>₩{pkg.originalPrice.toLocaleString()}</span>
                  </div>
                )}
                {pkg.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#7788a5]" style={{ fontSize: 13 }}>할인</span>
                    <span className="text-[#e0e8ff]" style={{ fontSize: 13 }}>−₩{(pkg.originalPrice! - pkg.price).toLocaleString()} ({pkg.discount}%)</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#7788a5]" style={{ fontSize: 13 }}>최종 결제액</span>
                  <span className="text-[#ffd700] font-bold" style={{ fontSize: 13 }}>₩{pkg.price.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-px bg-[#354064] mb-4" />
              <div className="flex justify-between items-center mb-5">
                <span className="text-[#7788a5]" style={{ fontSize: 11 }}>받게 될 AP</span>
                <span className="text-[#00f5ff] font-bold" style={{ fontSize: 22 }}>{pkg.ap.toLocaleString()} AP</span>
              </div>
              <button
                onClick={handlePay}
                disabled={isProcessing}
                className="w-full h-14 bg-[#00f5ff] rounded-xl text-[#0a0e1a] font-bold hover:brightness-110 transition-all disabled:opacity-70"
                style={{ fontSize: 17 }}
              >
                {isProcessing ? '처리 중...' : `₩${pkg.price.toLocaleString()} 결제하기`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
          <div className="bg-[#1a1f35] border-2 border-[#00f5ff] rounded-2xl p-8 text-center max-w-sm mx-4">
            <div className="text-5xl mb-4">💎</div>
            <h3 className="text-[#00f5ff] font-bold text-xl mb-2">충전 완료!</h3>
            <div className="bg-[#2a3050] rounded-xl py-4 px-6 mb-3">
              <p className="text-[#7788a5]" style={{ fontSize: 12 }}>충전 완료</p>
              <p className="text-[#00f5ff] font-bold" style={{ fontSize: 28 }}>+{pkg.ap.toLocaleString()} AP</p>
            </div>
            <div className="bg-[#2a3050] rounded-xl py-3 px-6 mb-6">
              <p className="text-[#7788a5]" style={{ fontSize: 12 }}>현재 보유 AP</p>
              <p className="text-[#ffd700] font-bold" style={{ fontSize: 22 }}>{newAP.toLocaleString()} AP</p>
            </div>
            <button
              onClick={() => { setSuccess(false); navigate('/app/map'); }}
              className="w-full h-12 bg-[#00f5ff] rounded-xl text-[#0a0e1a] font-bold"
              style={{ fontSize: 15 }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
