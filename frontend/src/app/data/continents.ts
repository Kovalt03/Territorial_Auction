export interface ContinentDef {
  id: string;
  dbId: number;
  name: string;
  desc: string;
  color: string;
  grade: string;
  trophyReq: number | null;
  cx: number;
  cy: number;
  halfHeight: number;
}

export const CONTINENTS: ContinentDef[] = [
  {
    id: 'north', dbId: 1, name: '크리오 행성', desc: '얼음과 강철의 땅',
    color: '#00f5ff', grade: 'S', trophyReq: 5000,
    cx: 394, cy: 113, halfHeight: 70,
  },
  {
    id: 'northwest', dbId: 2, name: '글리치 행성', desc: '글리치 구역',
    color: '#44aaff', grade: 'B', trophyReq: 1000,
    cx: 124, cy: 211, halfHeight: 65,
  },
  {
    id: 'northeast', dbId: 3, name: '바이트 행성', desc: '바이트 필드',
    color: '#ff8c00', grade: 'B', trophyReq: 1000,
    cx: 610, cy: 215, halfHeight: 65,
  },
  {
    id: 'west', dbId: 4, name: '크롬 행성', desc: '크롬의 황야',
    color: '#00ff88', grade: 'B', trophyReq: 800,
    cx: 102, cy: 365, halfHeight: 75,
  },
  {
    id: 'central', dbId: 5, name: '자유 행성', desc: '개인 영토 자유 구역',
    color: '#8b50ff', grade: 'S', trophyReq: null,
    cx: 396, cy: 374, halfHeight: 72,
  },
  {
    id: 'east', dbId: 6, name: '네온 행성', desc: '네온의 도시',
    color: '#ff1493', grade: 'A', trophyReq: 3000,
    cx: 667, cy: 378, halfHeight: 75,
  },
  {
    id: 'south', dbId: 7, name: '아리드 행성', desc: '사막의 전장',
    color: '#ffd700', grade: 'A', trophyReq: 2000,
    cx: 392, cy: 571, halfHeight: 82,
  },
  {
    id: 'southeast', dbId: 8, name: '포트 행성', desc: '디지털 포트',
    color: '#ff6644', grade: 'C', trophyReq: 300,
    cx: 618, cy: 572, halfHeight: 68,
  },
];
