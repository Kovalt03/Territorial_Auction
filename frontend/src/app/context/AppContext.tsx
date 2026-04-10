import { createContext, useContext, useState, ReactNode } from 'react';

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
}

interface AppContextType extends AppState {
  login: (name: string) => void;
  logout: () => void;
  addAP: (amount: number) => void;
  useAP: (amount: number) => boolean;
  toggleWishlist: (id: string) => void;
  placeBid: (id: string, amount: number) => void;
  sendMessage: (text: string) => void;
  activatePass: () => void;
}

const names = [
  '네온 하이웨이', '사이버 협곡', '크롬 평야', '데이터 봉우리',
  '바이트 필드', '픽셀 정원', '글리치 구역', '디지털 포트',
  '나노 기지', '퀀텀 빌딩', '마트릭스 요새', '바이너리 파크',
];

function generateTerritories(): Territory[] {
  const statuses: Array<Territory['status']> = ['mine', 'mine', 'auction', 'auction', 'occupied', 'idle'];
  const grades: Array<Territory['grade']> = ['S', 'A', 'A', 'B', 'B', 'B', 'C', 'C'];
  const colors = ['#f06070', '#00f5ff', '#8b50ff', '#ffd700', '#ff8c00'];
  const owners = ['강남부자', '픽셀왕', '영토수집가', '사이버해커', '글리치마스터'];

  return Array.from({ length: 20 }, (_, i) => {
    const status = statuses[i % statuses.length];
    const grade = grades[i % grades.length];
    const isOwned = status === 'mine' || status === 'occupied';
    const owner = status === 'mine' ? '나' : status === 'occupied' ? owners[i % owners.length] : null;

    return {
      id: `${(i % 10) + 1}-${(i % 8) + 1}`,
      x: (i % 10) + 1,
      y: (i % 8) + 1,
      name: names[i % names.length],
      status,
      owner,
      color: isOwned ? colors[i % colors.length] : '#1a2a3a',
      grade,
      currentBid: 1000 + i * 500,
      myBid: status === 'auction' ? 1200 + i * 300 : undefined,
      gpPerMin: 10 + i * 3,
      defense: 100 + i * 50,
      isWishlisted: i % 4 === 0,
      protection: status === 'mine',
      bidHistory: [
        { user: '강남부자', amount: 1000 + i * 500, time: '14:32' },
        { user: '픽셀왕', amount: 800 + i * 400, time: '14:20' },
        { user: '영토수집가', amount: 600 + i * 300, time: '13:55' },
      ],
    };
  });
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
    territories: generateTerritories(),
    messages: defaultMessages,
    isLoggedIn: false,
    username: '',
  });

  const login = (name: string) => {
    setState(prev => ({ ...prev, isLoggedIn: true, username: name, ap: prev.ap + 1000 }));
  };

  const logout = () => {
    setState(prev => ({ ...prev, isLoggedIn: false, username: '' }));
  };

  const addAP = (amount: number) => {
    setState(prev => ({ ...prev, ap: prev.ap + amount }));
  };

  const useAP = (amount: number): boolean => {
    if (state.ap < amount) return false;
    setState(prev => ({ ...prev, ap: prev.ap - amount }));
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
      return {
        ...prev,
        ap: prev.ap - 1000,
        hasPass: true,
        passEndDate: newEnd,
      };
    });
  };

  return (
    <AppContext.Provider value={{ ...state, login, logout, addAP, useAP, toggleWishlist, placeBid, sendMessage, activatePass }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
