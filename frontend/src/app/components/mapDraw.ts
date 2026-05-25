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

  // Subtle grid lines in virtual space
  ctx.strokeStyle = 'rgba(26, 36, 56, 0.35)';
  ctx.lineWidth = 0.5 / zoom;
  for (const y of [140, 280, 420, 560]) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke();
  }
  for (const x of [160, 320, 480, 640]) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 700); ctx.stroke();
  }

  for (const c of continents) {
    drawContinent(ctx, c, hoveredId === c.id, t, particleMap.get(c.id) ?? [], pathMap.get(c.id)!);
  }

  ctx.restore();
}

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

  // 1. Outer glow halo
  ctx.shadowBlur = isHovered ? 32 : 16;
  ctx.shadowColor = c.color;
  ctx.fillStyle = hexToRgba(c.color, isHovered ? 0.11 : 0.05);
  ctx.fill(path);
  ctx.shadowBlur = 0;

  // 2. Radial gradient fill (gently pulses)
  const pulse = Math.sin(t * 0.0008 + c.cx * 0.01) * 0.04;
  const grad = ctx.createRadialGradient(c.cx, c.cy, 0, c.cx, c.cy, c.halfHeight * 1.1);
  grad.addColorStop(0, hexToRgba(c.color, (isHovered ? 0.3 : 0.18) + pulse));
  grad.addColorStop(0.55, hexToRgba(c.color, (isHovered ? 0.1 : 0.06) + pulse * 0.5));
  grad.addColorStop(1, hexToRgba(c.color, 0.01));
  ctx.fillStyle = grad;
  ctx.fill(path);

  // 3. Scan-line sweep clipped to continent shape
  ctx.save();
  ctx.clip(path);
  const sweepRange = c.halfHeight * 2.8;
  const sweepY = c.cy - c.halfHeight * 1.3 + (t * 0.018 % sweepRange);
  const sg = ctx.createLinearGradient(0, sweepY - 14, 0, sweepY + 14);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.5, hexToRgba(c.color, isHovered ? 0.22 : 0.1));
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(c.cx - 220, sweepY - 14, 440, 28);
  ctx.restore();

  // 4. Animated flowing dashed border
  ctx.setLineDash([10, 5]);
  ctx.lineDashOffset = -(t * (isHovered ? 0.08 : 0.04));
  ctx.strokeStyle = hexToRgba(c.color, isHovered ? 0.95 : 0.6);
  ctx.lineWidth = isHovered ? 2.2 : 1.5;
  ctx.shadowBlur = isHovered ? 14 : 7;
  ctx.shadowColor = c.color;
  ctx.stroke(path);

  // 5. Solid structural border underneath
  ctx.setLineDash([]);
  ctx.strokeStyle = hexToRgba(c.color, 0.25);
  ctx.lineWidth = 0.5;
  ctx.shadowBlur = 0;
  ctx.stroke(path);

  // 6. Floating particles
  for (const p of particles) {
    const alpha = 0.25 + Math.sin(p.phase) * 0.28;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(c.color, Math.max(0, alpha));
    ctx.shadowBlur = 6;
    ctx.shadowColor = c.color;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // 7. Labels
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
  const reqLabel = c.trophyReq != null ? `🏆 ${c.trophyReq.toLocaleString()}+` : '✦ 자유';
  ctx.fillText(reqLabel, c.cx, c.cy + 7);

  if (isHovered) {
    ctx.fillStyle = hexToRgba(c.color, 0.9);
    ctx.font = `10px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillText(c.desc, c.cx, c.cy + 21);
    ctx.fillStyle = '#ffd700';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffd700';
    ctx.font = `bold 10px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillText(`[${c.grade}] ${c.topOwner}`, c.cx, c.cy + 35);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}
