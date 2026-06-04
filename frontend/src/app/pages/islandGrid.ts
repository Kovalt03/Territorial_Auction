import type { IslandData } from '../types/island';

export type BuildingType = 'castle' | 'workshop' | 'barracks' | 'storage' | 'wall' | 'tower' | 'garden' | 'bank' | 'lab' | 'port' | 'mine' | 'empty';

export interface Cell {
  type: BuildingType;
  level?: number;
  hp?: number;
  maxHp?: number;
  zone?: 1 | 2 | 3;
  buildingId?: number;
  isBody?: boolean;
  width?: number;
  height?: number;
}

export const buildingColors: Record<BuildingType, string> = {
  castle: '#ffd700', workshop: '#00ff88', barracks: '#8b50ff', storage: '#00f5ff',
  wall: '#e0e8ff', tower: '#ff8c00', garden: '#00ffaa', bank: '#ffaa00',
  lab: '#ff44cc', port: '#44aaff', mine: '#cc8844', empty: '#1a1f35',
};

export const buildingLabels: Record<BuildingType, string> = {
  castle: '🏰', workshop: '⚙', barracks: '⚔', storage: '📦',
  wall: '🧱', tower: '🗼', garden: '🌿', bank: '🏦',
  lab: '🔬', port: '⛵', mine: '⛏', empty: '',
};

export const buildingNames: Record<BuildingType, string> = {
  castle: '성', workshop: '생산소', barracks: '병영', storage: '저장소',
  wall: '방벽', tower: '방어탑', garden: '정원', bank: '금고',
  lab: '연구소', port: '항구', mine: '광산', empty: '빈 공간',
};

export const UNIT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  INFANTRY: { label: '보병', icon: '🗡', color: '#e0e8ff' },
  ARCHER: { label: '궁수', icon: '🏹', color: '#00ff88' },
  KNIGHT: { label: '기사', icon: '⚔', color: '#ffd700' },
};

// 백엔드 building_types 시드 순서 기준 ID 매핑 (building-types.yml)
export const BUILDING_TYPE_ID: Partial<Record<string, number>> = {
  castle: 1, storage: 2, workshop: 3, barracks: 4, wall: 5, tower: 6,
};

export function assignZone(x: number, y: number, size: number, zone1Radius: number, zone2Radius: number): 1 | 2 | 3 {
  const center = Math.floor(size / 2);
  const dist = Math.max(Math.abs(x - center), Math.abs(y - center));
  if (dist <= zone1Radius) return 1;
  if (dist <= zone2Radius) return 2;
  return 3;
}

export function emptyGrid(size: number, zone1Radius: number, zone2Radius: number): Cell[][] {
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => ({ type: 'empty' as BuildingType, zone: assignZone(x, y, size, zone1Radius, zone2Radius) }))
  );
}

export function buildGridFromIsland(island: IslandData): Cell[][] {
  const size = island.gridSize;
  const z1 = island.zone1Radius;
  const z2 = island.zone2Radius;
  const grid = emptyGrid(size, z1, z2);
  for (const b of island.buildings) {
    if (b.isDestroyed || b.posY >= size || b.posX >= size) continue;
    const w = b.width ?? 1;
    const h = b.height ?? 1;
    const type = b.type.toLowerCase() as BuildingType;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const gx = b.posX + dx;
        const gy = b.posY + dy;
        if (gx >= size || gy >= size) continue;
        grid[gy][gx] = {
          type,
          level: b.level,
          hp: b.hp,
          maxHp: b.maxHp,
          buildingId: b.buildingId,
          zone: assignZone(gx, gy, size, z1, z2),
          isBody: dx > 0 || dy > 0,
          width: w,
          height: h,
        };
      }
    }
  }
  return grid;
}

export function findOriginCell(grid: Cell[][], buildingId: number): { x: number; y: number } | null {
  for (let gy = 0; gy < grid.length; gy++) {
    for (let gx = 0; gx < grid[gy].length; gx++) {
      const c = grid[gy][gx];
      if (c.buildingId === buildingId && !c.isBody) return { x: gx, y: gy };
    }
  }
  return null;
}

export function clearBuildingCells(grid: Cell[][], buildingId: number): Cell[][] {
  return grid.map(row =>
    row.map(c => c.buildingId === buildingId ? { type: 'empty' as BuildingType, zone: c.zone } : { ...c })
  );
}
