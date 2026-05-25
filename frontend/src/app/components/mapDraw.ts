import type { ContinentDef } from '../data/continents';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── 배경 ─────────────────────────────────────────────────────────────────

function drawHexGrid(ctx: CanvasRenderingContext2D, size: number): void {
  const hw = size * Math.sqrt(3);   // hex width (flat-top)
  const hh = size * 1.5;            // row height
  ctx.strokeStyle = 'rgba(30, 120, 180, 0.09)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let row = -1; row < 700 / hh + 2; row++) {
    for (let col = -1; col < 800 / hw + 2; col++) {
      const ox = col * hw + (row % 2 === 0 ? 0 : hw / 2);
      const oy = row * hh;
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 6;
        const px = ox + size * Math.cos(a);
        const py = oy + size * Math.sin(a);
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
  }
  ctx.stroke();
}

function drawOceanShimmer(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  for (let i = 0; i < 55; i++) {
    const seed = i * 137.508;
    const x = ((seed * 57.3) % 800 + 800) % 800;
    const y = ((seed * 83.1) % 700 + 700) % 700;
    const alpha = (Math.sin(seed * 0.02 + t * 0.0009) + 1) * 0.025 + 0.008;
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(60, 200, 255, ${alpha})`;
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(60, 200, 255, 0.25)';
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawOceanBackground(ctx: CanvasRenderingContext2D, t: number): void {
  // 심해 방사형 그라디언트
  const g = ctx.createRadialGradient(400, 340, 30, 400, 340, 560);
  g.addColorStop(0,   '#0c1e38');
  g.addColorStop(0.5, '#071228');
  g.addColorStop(1,   '#030b18');
  ctx.fillStyle = g;
  ctx.fillRect(-50, -50, 900, 800);

  // 헥사곤 그리드 (Civ6 느낌)
  drawHexGrid(ctx, 34);

  // 위경도 느낌 격자선
  ctx.strokeStyle = 'rgba(0, 100, 180, 0.07)';
  ctx.lineWidth = 0.4;
  for (let x = 0; x <= 800; x += 114) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 700); ctx.stroke();
  }
  for (let y = 0; y <= 700; y += 100) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke();
  }

  // 심해 빛 반짝임
  drawOceanShimmer(ctx, t);

  // 가장자리 비네팅
  const vg = ctx.createRadialGradient(400, 350, 180, 400, 350, 540);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(-50, -50, 900, 800);
}

// ── 파티클 ────────────────────────────────────────────────────────────────

export function createParticles(c: ContinentDef, count = 10): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * c.halfHeight * 0.5;
    return {
      x: c.cx + Math.cos(angle) * r,
      y: c.cy + Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.5 + 0.5,
      phase: Math.random() * Math.PI * 2,
    };
  });
}

export function updateParticles(particles: Particle[], c: ContinentDef, dt: number): void {
  const maxR = c.halfHeight * 0.55;
  for (const p of particles) {
    p.x += p.vx * dt * 0.05;
    p.y += p.vy * dt * 0.05;
    p.phase += dt * 0.0015;
    const dx = p.x - c.cx;
    const dy = p.y - c.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) {
      const nx = dx / dist;
      const ny = dy / dist;
      const dot = p.vx * nx + p.vy * ny;
      p.vx -= 2 * dot * nx;
      p.vy -= 2 * dot * ny;
      p.x = c.cx + nx * (maxR - 0.5);
      p.y = c.cy + ny * (maxR - 0.5);
    }
  }
}

// ── 대륙 ─────────────────────────────────────────────────────────────────

function drawContinent(
  ctx: CanvasRenderingContext2D,
  c: ContinentDef,
  isHovered: boolean,
  t: number,
  particles: Particle[],
  path: Path2D,
): void {
  ctx.save();

  if (isHovered) {
    ctx.translate(c.cx, c.cy);
    ctx.scale(1.05, 1.05);
    ctx.translate(-c.cx, -c.cy);
  }

  // 1. 외부 글로우 헤일로
  ctx.shadowBlur = isHovered ? 36 : 18;
  ctx.shadowColor = c.color;
  ctx.fillStyle = hexToRgba(c.color, isHovered ? 0.1 : 0.05);
  ctx.fill(path);
  ctx.shadowBlur = 0;

  // 2. 방사형 그라디언트 채우기 (맥박)
  const pulse = Math.sin(t * 0.0008 + c.cx * 0.01) * 0.04;
  const grad = ctx.createRadialGradient(c.cx, c.cy, 0, c.cx, c.cy, c.halfHeight * 1.15);
  grad.addColorStop(0,    hexToRgba(c.color, (isHovered ? 0.32 : 0.19) + pulse));
  grad.addColorStop(0.55, hexToRgba(c.color, (isHovered ? 0.10 : 0.06) + pulse * 0.5));
  grad.addColorStop(1,    hexToRgba(c.color, 0.01));
  ctx.fillStyle = grad;
  ctx.fill(path);

  // 3. 스캔라인 sweep
  ctx.save();
  ctx.clip(path);
  const sweepRange = c.halfHeight * 2.8;
  const sweepY = c.cy - c.halfHeight * 1.3 + (t * 0.018 % sweepRange);
  const sg = ctx.createLinearGradient(0, sweepY - 14, 0, sweepY + 14);
  sg.addColorStop(0,   'rgba(255,255,255,0)');
  sg.addColorStop(0.5, hexToRgba(c.color, isHovered ? 0.22 : 0.1));
  sg.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(c.cx - 240, sweepY - 14, 480, 28);
  ctx.restore();

  // 4. 흐르는 점선 경계
  ctx.setLineDash([10, 5]);
  ctx.lineDashOffset = -(t * (isHovered ? 0.08 : 0.04));
  ctx.strokeStyle = hexToRgba(c.color, isHovered ? 0.95 : 0.6);
  ctx.lineWidth = isHovered ? 2.2 : 1.5;
  ctx.shadowBlur = isHovered ? 14 : 7;
  ctx.shadowColor = c.color;
  ctx.stroke(path);

  // 5. 구조선 (얇은 실선)
  ctx.setLineDash([]);
  ctx.strokeStyle = hexToRgba(c.color, 0.25);
  ctx.lineWidth = 0.5;
  ctx.shadowBlur = 0;
  ctx.stroke(path);

  // 6. 파티클
  for (const p of particles) {
    const alpha = Math.max(0, 0.25 + Math.sin(p.phase) * 0.28);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(c.color, alpha);
    ctx.shadowBlur = 6;
    ctx.shadowColor = c.color;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // 7. 레이블
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = isHovered ? 20 : 10;
  ctx.shadowColor = c.color;
  ctx.fillStyle = isHovered ? '#ffffff' : c.color;
  ctx.font = `bold ${isHovered ? 14 : 12}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText(c.name, c.cx, c.cy - 10);

  ctx.shadowBlur = 0;
  ctx.fillStyle = hexToRgba(c.color, 0.75);
  ctx.font = `9px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText(
    c.trophyReq != null ? `🏆 ${c.trophyReq.toLocaleString()}+` : '✦ 자유',
    c.cx, c.cy + 6,
  );

  if (isHovered) {
    ctx.fillStyle = hexToRgba(c.color, 0.9);
    ctx.font = `10px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillText(c.desc, c.cx, c.cy + 20);
    ctx.fillStyle = '#ffd700';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffd700';
    ctx.font = `bold 10px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillText(`[${c.grade}] ${c.topOwner}`, c.cx, c.cy + 34);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ── 프레임 진입점 ─────────────────────────────────────────────────────────

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  zoom: number,
  pan: { x: number; y: number },
  t: number,
  hoveredId: string | null,
  particleMap: Map<string, Particle[]>,
  pathMap: Map<string, Path2D>,
  continents: ContinentDef[],
): void {
  ctx.save();
  ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);

  drawOceanBackground(ctx, t);

  for (const c of continents) {
    drawContinent(
      ctx, c, hoveredId === c.id, t,
      particleMap.get(c.id) ?? [],
      pathMap.get(c.id)!,
    );
  }

  ctx.restore();
}
