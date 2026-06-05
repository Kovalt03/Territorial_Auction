import { useNavigate } from 'react-router';

import type { Grade } from '../types/grade';
import type { BidEntry } from '../types/auction';
import { GRADE_COLOR } from '../types/grade';

const GRADE_EMOJI: Record<Grade, string> = { S: '👑', A: '💎', B: '🔷', C: '🔹' };

const QUICK_ADD = [500, 1000, 5000];

interface DisplayTerritory {
  coordX: number; coordY: number;
  status: 'mine' | 'occupied' | 'auction' | 'idle';
  owner: string | null; color: string;
  grade: Grade; id: number;
}

interface Props {
  selected: DisplayTerritory;
  continentName: string;
  continentColor: string;
  username: string;
  ap: number;

  auctionCurrentPrice: number;
  selectedAuctionId: number | null;
  timeLeft: string;
  bidHistory: BidEntry[];

  bidInput: string;
  bidSuccess: boolean;
  isBidding: boolean;
  isHighestBidder: boolean;
  onChangeBidInput: (v: string) => void;
  onSubmitBid: () => void;

  wishlistIds: Set<number>;
  onToggleWishlist: (id: number) => void;
  onDeselect: () => void;

  fmtBidTime: (iso: string) => string;
}

export function ContinentSelectedPanel({
  selected, continentName, continentColor, username, ap,
  auctionCurrentPrice, selectedAuctionId, timeLeft, bidHistory,
  bidInput, bidSuccess, isBidding, isHighestBidder,
  onChangeBidInput, onSubmitBid,
  wishlistIds, onToggleWishlist, onDeselect,
  fmtBidTime,
}: Props) {
  const navigate = useNavigate();
  const minBid = Math.max(Math.ceil(auctionCurrentPrice * 1.05), auctionCurrentPrice + 10);
  const bidValue = parseInt(bidInput);
  const canBid = !!selectedAuctionId && !isBidding && !!bidInput && bidValue >= minBid && bidValue <= ap;
  const isInWishlist = wishlistIds.has(selected.id);

  return (
    <>
      <div className="px-4 py-3 border-b border-outline-soft flex-shrink-0">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-foreground-soft font-bold text-sm">영토 ({selected.coordX}, {selected.coordY})</p>
            <p className="text-muted text-[10px]">{continentName}</p>
          </div>
          <div className="px-2 py-0.5 rounded font-bold flex items-center gap-1 text-[10px]" style={{ color: GRADE_COLOR[selected.grade], background: GRADE_COLOR[selected.grade] + '20' }}>
            <span>{GRADE_EMOJI[selected.grade]}</span><span>{selected.grade}급</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: selected.color + '18', border: `1px solid ${selected.color}50` }}>
          <span className="text-xl">{GRADE_EMOJI[selected.grade]}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs" style={{ color: selected.color }}>
              {selected.status === 'mine' ? '내 영토'
                : selected.status === 'occupied' ? `${selected.owner} 점령`
                : selected.status === 'auction' ? '경매 진행 중'
                : '미점령'}
            </p>
            <p className="text-muted text-[9px] truncate">{selected.owner || '점유자 없음'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {selected.status === 'idle' && (
          <div className="bg-panel-deep border border-outline rounded-xl p-3 text-center">
            <p className="text-muted text-[11px]">현재 경매 없음</p>
            <p className="text-muted text-[9px] mt-1">토지세 미납 또는 공성전 후 자동 경매 예정</p>
          </div>
        )}

        {selected.status === 'auction' && (
          <>
            <div className="bg-panel-deep border border-gold/20 rounded-xl p-3">
              <p className="text-muted text-[9px] mb-1">경매 종료까지</p>
              <p className="text-gold font-bold text-xl text-center tracking-wider tabular-nums">
                {timeLeft || '--:--:--'}
              </p>
            </div>

            <div
              className="bg-panel-deep border rounded-xl p-3"
              style={{ borderColor: isHighestBidder ? '#00ff8860' : '#354064' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-muted text-[9px]">현재 최고 입찰가</p>
                {isHighestBidder && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-gp/20 text-gp border border-gp/40">
                    👑 최고 입찰자
                  </span>
                )}
              </div>
              <p className="text-gold font-bold text-lg leading-none">
                {auctionCurrentPrice.toLocaleString()}
                <span className="text-[11px] text-muted font-normal ml-1">AP</span>
              </p>
              <div className="mt-2 pt-2 border-t border-outline-soft flex justify-between">
                <span className="text-muted text-[9px]">최소 입찰가</span>
                <span className="text-foreground-soft text-[9px] font-semibold">{minBid.toLocaleString()} AP</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted text-[9px]">보유 AP</span>
                <span className="text-gp text-[9px] font-semibold">{ap.toLocaleString()} AP</span>
              </div>
            </div>

            <div className="bg-panel-deep border border-gold/25 rounded-xl p-3">
              <p className="text-gold font-bold mb-2 text-[11px]">⚡ 입찰하기</p>
              {bidSuccess ? (
                <div className="text-center py-2">
                  <p className="text-gp font-bold text-xs">✓ 입찰 완료!</p>
                  <p className="text-muted text-[10px] mt-0.5">잔여 AP: {ap.toLocaleString()}</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 mb-2">
                    {QUICK_ADD.map(inc => (
                      <button
                        key={inc}
                        onClick={() => onChangeBidInput(String((parseInt(bidInput) || minBid) + inc))}
                        className="flex-1 h-6 rounded transition-colors hover:brightness-125 text-[9px] bg-outline-soft border border-outline text-foreground-soft"
                      >
                        +{inc >= 1000 ? `${inc / 1000}K` : inc}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mb-1.5">
                    <input
                      type="number"
                      value={bidInput}
                      onChange={e => onChangeBidInput(e.target.value)}
                      placeholder={`${minBid.toLocaleString()}`}
                      className="flex-1 h-8 bg-surface border border-outline rounded-lg px-2 text-foreground outline-none focus:border-gold text-[11px]"
                    />
                    <button
                      onClick={onSubmitBid}
                      disabled={!canBid}
                      className="h-8 px-3 rounded-lg font-bold transition-all hover:brightness-110 disabled:opacity-40 text-[11px] bg-gold text-surface"
                    >
                      {isBidding ? '...' : '입찰'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div>
              <p className="text-muted text-[10px] mb-1.5">입찰 현황 ({bidHistory.length}건)</p>
              {bidHistory.length === 0 ? (
                <p className="text-muted text-[9px] text-center py-2">입찰 내역이 없습니다</p>
              ) : (
                <div className="space-y-1">
                  {bidHistory.slice(0, 10).map((bid, i) => {
                    const isMe = bid.bidderNickname === username;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 border ${isMe ? 'bg-gp/10 border-gp/40' : 'bg-[#0a1020] border-outline-soft'}`}
                      >
                        <div>
                          <p className={`text-[10px] font-semibold ${isMe ? 'text-gp' : 'text-foreground-soft'}`}>
                            {bid.bidderNickname ?? '익명'}{isMe && ' (나)'}
                          </p>
                          <p className="text-muted text-[8px]">{fmtBidTime(bid.bidAt)}</p>
                        </div>
                        <p className="text-gold font-bold text-[10px]">{bid.price.toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {(selected.status === 'mine' || selected.status === 'occupied') && (
          <div className="bg-panel-deep border border-outline rounded-xl p-3 text-center">
            <p className="text-muted text-[11px]">
              {selected.status === 'mine' ? '내 영토입니다' : `${selected.owner}의 영토입니다`}
            </p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-3 space-y-2 border-t border-outline-soft">
        <button
          onClick={() => navigate(`/app/territory/${selected.id}`)}
          className="w-full h-8 rounded-xl font-bold transition-all hover:brightness-110 text-[11px] text-surface"
          style={{ background: continentColor }}
        >
          영토 상세 보기
        </button>
        {selected.status === 'occupied' && (
          <button
            onClick={() => navigate('/app/siege')}
            className="w-full h-8 bg-danger/15 border border-danger rounded-xl text-danger font-bold text-[11px]"
          >
            ⚔ 공성전 선언
          </button>
        )}
        {selected.status === 'mine' && (
          <button
            onClick={() => navigate(`/app/territory-grid/${selected.id}`)}
            className="w-full h-8 bg-gp/15 border border-gp/60 rounded-xl text-gp font-bold text-[11px]"
          >
            🏗 영토 내부 보기
          </button>
        )}
        {selected.id !== 0 && (
          <button
            onClick={() => onToggleWishlist(selected.id)}
            className={`w-full h-8 rounded-xl font-bold text-[11px] transition-all hover:brightness-110 border ${isInWishlist ? 'bg-flare/15 border-flare/60 text-flare' : 'bg-outline-soft border-outline text-dim'}`}
          >
            {isInWishlist ? '♥ 관심 해제' : '♡ 관심 등록'}
          </button>
        )}
        <button onClick={onDeselect} className="w-full h-7 bg-panel-deep border border-outline-soft rounded-xl text-muted text-[10px]">선택 해제</button>
      </div>
    </>
  );
}
