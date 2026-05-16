import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { fetchMyProfile, fetchMyWallet } from '../api/user';
import { fetchMySeasonPass } from '../api/season';

export interface Territory {
  id: string;
  x: number;
  y: number;
  name: string;
  status: 'mine' | 'occupied' | 'auction' | 'idle';
  owner: string | null;
  color: string;
  grade: 'S' | 'A' | 'B' | 'C';
  currentBid: number;
  myBid?: number;
  gpPerMin: number;
  defense: number;
  isWishlisted: boolean;
  bidHistory: { user: string; amount: number; time: string }[];
  protection?: boolean;
}

export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  time: string;
}

interface LoginOptions {
  token?: string;
  userId?: number;
  ap?: number;
  gp?: number;
}

interface AppState {
  ap: number;
  gp: number;
  hasPass: boolean;
  passEndDate: Date | null;
  notifications: number;
  territories: Territory[];
  messages: ChatMessage[];
  isLoggedIn: boolean;
  username: string;
  userId: number | null;
}

interface AppContextType extends AppState {
  login: (name: string, opts?: LoginOptions) => void;
  logout: () => void;
  addAP: (amount: number) => void;
  syncAP: (amount: number) => void;
  syncGP: (amount: number) => void;
  syncPass: (hasPass: boolean, expiresAt: string | null) => void;
  useAP: (amount: number) => boolean;
  useGP: (amount: number) => boolean;
  toggleWishlist: (id: string) => void;
  placeBid: (id: string, amount: number) => void;
  sendMessage: (text: string) => void;
  activatePass: () => void;
}

const defaultMessages: ChatMessage[] = [
  { id: '1', user: '강남부자', message: '네온 하이웨이 경매 시작했어요!', time: '14:30' },
  { id: '2', user: '픽셀왕', message: '사이버 협곡 방어 완료 👍', time: '14:28' },
  { id: '3', user: '영토수집가', message: '글리치 구역 입찰 누가 함?', time: '14:25' },
  { id: '4', user: '시스템', message: '새 경매가 시작되었습니다: 데이터 봉우리', time: '14:20' },
  { id: '5', user: '사이버해커', message: '이번 시즌 GP 생산 최고 달성!', time: '14:15' },
];

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    ap: 3500,
    gp: 12800,
    hasPass: false,
    passEndDate: null,
    notifications: 3,
    territories: [],
    messages: defaultMessages,
    isLoggedIn: false,
    username: '',
    userId: null,
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    Promise.all([fetchMyProfile(), fetchMyWallet(), fetchMySeasonPass()])
      .then(([profile, wallet, pass]) => {
        setState(prev => ({
          ...prev,
          isLoggedIn: true,
          username: profile.nickname,
          userId: profile.userId,
          ap: wallet.availableAP,
          gp: wallet.availableGP,
          hasPass: pass.hasSeasonPass,
          passEndDate: pass.seasonPass?.expiresAt ? new Date(pass.seasonPass.expiresAt) : null,
        }));
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
      });
  }, []);

  const login = (name: string, opts?: LoginOptions) => {
    if (opts?.token) localStorage.setItem('accessToken', opts.token);
    setState(prev => ({
      ...prev,
      isLoggedIn: true,
      username: name,
      userId: opts?.userId ?? null,
      ap: opts?.ap ?? (prev.ap + 1000),
      gp: opts?.gp ?? prev.gp,
    }));
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setState(prev => ({ ...prev, isLoggedIn: false, username: '', userId: null }));
  };

  const addAP = (amount: number) => {
    setState(prev => ({ ...prev, ap: prev.ap + amount }));
  };

  const syncAP = (amount: number) => {
    setState(prev => ({ ...prev, ap: amount }));
  };

  const syncGP = (amount: number) => {
    setState(prev => ({ ...prev, gp: amount }));
  };

  const syncPass = (hasPass: boolean, expiresAt: string | null) => {
    setState(prev => ({
      ...prev,
      hasPass,
      passEndDate: expiresAt ? new Date(expiresAt) : null,
    }));
  };

  const useAP = (amount: number): boolean => {
    if (state.ap < amount) return false;
    setState(prev => ({ ...prev, ap: prev.ap - amount }));
    return true;
  };

  const useGP = (amount: number): boolean => {
    if (state.gp < amount) return false;
    setState(prev => ({ ...prev, gp: prev.gp - amount }));
    return true;
  };

  const toggleWishlist = (id: string) => {
    setState(prev => ({
      ...prev,
      territories: prev.territories.map(t =>
        t.id === id ? { ...t, isWishlisted: !t.isWishlisted } : t
      ),
    }));
  };

  const placeBid = (id: string, amount: number) => {
    setState(prev => ({
      ...prev,
      territories: prev.territories.map(t =>
        t.id === id
          ? {
              ...t,
              currentBid: amount,
              myBid: amount,
              bidHistory: [
                { user: prev.username || '나', amount, time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) },
                ...t.bidHistory,
              ],
            }
          : t
      ),
    }));
  };

  const sendMessage = (text: string) => {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      user: state.username || '나',
      message: text,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
  };

  const activatePass = () => {
    setState(prev => {
      const newEnd = prev.passEndDate
        ? new Date(prev.passEndDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return { ...prev, ap: prev.ap - 1000, hasPass: true, passEndDate: newEnd };
    });
  };

  return (
    <AppContext.Provider value={{ ...state, login, logout, addAP, syncAP, syncGP, syncPass, useAP, useGP, toggleWishlist, placeBid, sendMessage, activatePass }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
