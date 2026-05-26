import { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';

import { CONTINENTS } from '../data/continents';
import { type Particle, createParticles, updateParticles, drawFrame } from './mapDraw';

const SVG_W = 800;
const SVG_H = 700;
const BTN = 'w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white hover:border-[#00f5ff] transition-colors flex items-center justify-center text-sm';

interface MapState {
  zoom: number;
  pan: { x: number; y: number };
  isDragging: boolean;
  dragStart: { mx: number; my: number; px: number; py: number };
  clickStart: { x: number; y: number };
  hoveredId: string | null;
  mousePos: { x: number; y: number };
  t: number;
  lastTime: number;
  particles: Map<string, Particle[]>;
  paths: Map<string, Path2D>;
}

export function MapCanvas() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MapState>({
    zoom: 1, pan: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { mx: 0, my: 0, px: 0, py: 0 },
    clickStart: { x: 0, y: 0 },
    hoveredId: null,
    mousePos: { x: 0, y: 0 },
    t: 0, lastTime: 0,
    particles: new Map(),
    paths: new Map(),
  });
  const rafRef = useRef(0);

  const getFitView = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return { z: 1, x: 0, y: 0 };
    const z = Math.min(c.width / SVG_W, c.height / SVG_H) * 0.95;
    return { z, x: (c.width - SVG_W * z) / 2, y: (c.height - SVG_H * z) / 2 };
  }, []);

  // Init particles + paths once
  useEffect(() => {
    const s = stateRef.current;
    CONTINENTS.forEach(c => {
      s.particles.set(c.id, createParticles(c));
      s.paths.set(c.id, new Path2D(c.pathData));
    });
  }, []);

  // Resize observer — keep canvas pixel dimensions in sync with container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      const { z, x, y } = getFitView();
      stateRef.current.zoom = z;
      stateRef.current.pan = { x, y };
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [getFitView]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (time: number) => {
      const s = stateRef.current;
      const dt = Math.min(time - (s.lastTime || time), 50);
      s.lastTime = time;
      s.t += dt;

      CONTINENTS.forEach(c => {
        const ps = s.particles.get(c.id);
        if (ps) updateParticles(ps, c, dt);
      });

      // Hit test using identity transform + virtual coords
      ctx.resetTransform();
      const vx = (s.mousePos.x - s.pan.x) / s.zoom;
      const vy = (s.mousePos.y - s.pan.y) / s.zoom;
      s.hoveredId = null;
      for (const c of CONTINENTS) {
        if (ctx.isPointInPath(s.paths.get(c.id)!, vx, vy)) {
          s.hoveredId = c.id;
          break;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawFrame(ctx, s.zoom, s.pan, s.t, s.hoveredId, s.particles, s.paths, CONTINENTS, canvas.width, canvas.height);

      canvas.style.cursor = s.isDragging ? 'grabbing' : s.hoveredId ? 'pointer' : 'grab';

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const s = stateRef.current;
      const next = Math.max(0.4, Math.min(4, s.zoom * factor));
      const scale = next / s.zoom;
      s.pan = { x: mx - (mx - s.pan.x) * scale, y: my - (my - s.pan.y) * scale };
      s.zoom = next;
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    s.isDragging = true;
    s.dragStart = { mx: e.clientX, my: e.clientY, px: s.pan.x, py: s.pan.y };
    s.clickStart = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const s = stateRef.current;
    s.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (s.isDragging) {
      s.pan = {
        x: s.dragStart.px + (e.clientX - s.dragStart.mx),
        y: s.dragStart.py + (e.clientY - s.dragStart.my),
      };
    }
  };

  const handleMouseUp = () => { stateRef.current.isDragging = false; };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    const moved = Math.hypot(e.clientX - s.clickStart.x, e.clientY - s.clickStart.y);
    if (moved > 5) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const vx = (e.clientX - rect.left - s.pan.x) / s.zoom;
    const vy = (e.clientY - rect.top - s.pan.y) / s.zoom;
    ctx.resetTransform();
    for (const c of CONTINENTS) {
      if (ctx.isPointInPath(s.paths.get(c.id)!, vx, vy)) {
        navigate(`/app/continent/${c.id}`);
        return;
      }
    }
  };

  const zoomIn = () => { stateRef.current.zoom = Math.min(4, stateRef.current.zoom * 1.2); };
  const zoomOut = () => { stateRef.current.zoom = Math.max(0.4, stateRef.current.zoom / 1.2); };
  const resetView = () => {
    const { z, x, y } = getFitView();
    stateRef.current.zoom = z;
    stateRef.current.pan = { x, y };
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
        <button onClick={zoomIn} className={BTN}>+</button>
        <button onClick={zoomOut} className={BTN}>−</button>
        <button onClick={resetView} className={BTN}>⊡</button>
      </div>
      <div className="absolute bottom-3 left-3 z-10 text-[#2a3a5a] text-[10px] pointer-events-none select-none">
        스크롤로 줌 · 드래그로 이동 · 대륙 클릭으로 진입
      </div>
    </div>
  );
}
