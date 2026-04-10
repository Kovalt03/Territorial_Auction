import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { GNB } from '../components/GNB';
import { useApp } from '../context/AppContext';

export interface ContinentDef {
  id: string;
  name: string;
  desc: string;
  color: string;
  grade: string;
  topOwner: string;
  trophyReq: number | null;
  cx: number;
  cy: number;
  halfHeight: number;
  pathData: string;
}

export const CONTINENTS: ContinentDef[] = [
  {
    id: 'north', name: '북부 대륙', desc: '얼음과 강철의 땅',
    color: '#00f5ff', grade: 'S', topOwner: '강남부자', trophyReq: 5000,
    cx: 395, cy: 122, halfHeight: 80,
    // Russia / Eurasia — very wide east-west, irregular south with bay, Kamchatka-like eastern finger
    pathData: `
      M 272,82 C 280,62 306,54 335,60
      L 350,53 C 370,46 392,48 408,53
      L 424,47 C 450,51 474,62 492,72
      L 506,62 C 522,64 532,78 528,96
      C 534,112 528,132 514,143
      L 521,156 C 517,170 501,174 490,162
      L 496,178 C 491,188 474,190 464,178
      C 455,187 436,192 416,186
      L 401,193 C 384,199 362,191 346,181
      C 328,190 306,181 294,164
      L 288,178 C 276,184 260,172 256,155
      C 248,136 256,115 268,104
      C 262,90 265,80 272,82 Z
    `,
  },
  {
    id: 'northwest', name: '북서부', desc: '글리치 구역',
    color: '#44aaff', grade: 'B', topOwner: '레이더', trophyReq: 1000,
    cx: 141, cy: 218, halfHeight: 75,
    // North America — wider at top, Florida-like SE peninsula, Great Lakes indent on E coast
    pathData: `
      M 70,165 C 80,148 104,143 124,150
      L 138,144 C 158,140 178,149 193,165
      C 208,180 210,202 200,218
      L 206,232 C 210,250 198,266 184,270
      L 188,282 C 184,296 170,302 156,298
      C 144,303 130,293 128,280
      L 123,288 C 115,296 100,294 91,282
      C 80,271 80,254 90,242
      L 78,248 C 64,254 51,241 50,225
      C 46,208 58,190 70,178 Z
    `,
  },
  {
    id: 'northeast', name: '북동부', desc: '바이트 필드',
    color: '#ff8c00', grade: 'B', topOwner: '글리치마스터', trophyReq: 1000,
    cx: 610, cy: 218, halfHeight: 75,
    // East Asia — two peninsulas going south (Korea-like and Indochina-like)
    pathData: `
      M 535,162 C 548,147 573,142 599,150
      C 618,144 643,150 660,165
      C 678,178 683,200 674,218
      L 682,232 C 682,252 667,267 652,264
      L 658,277 C 654,292 638,298 623,292
      C 612,297 598,290 594,277
      L 591,290 C 587,304 570,310 556,303
      C 542,296 538,280 546,266
      C 535,254 529,235 535,218
      C 531,200 530,175 535,165 Z
    `,
  },
  {
    id: 'west', name: '서부 대륙', desc: '크롬의 황야',
    color: '#00ff88', grade: 'B', topOwner: '사이버해커', trophyReq: 800,
    cx: 104, cy: 385, halfHeight: 105,
    // South America — wide north with east bulge (Brazil), sharply tapers to pointed south
    pathData: `
      M 56,295 C 66,280 88,274 112,280
      C 134,274 158,284 170,302
      C 183,318 181,342 167,358
      L 175,370 C 182,388 176,412 160,425
      L 164,440 C 162,460 148,472 130,472
      C 112,478 94,468 86,452
      L 88,462 C 82,474 66,474 58,460
      C 46,444 50,420 64,408
      C 50,392 46,366 58,348
      C 44,332 44,310 56,295 Z
    `,
  },
  {
    id: 'central', name: '중앙 자유 구역', desc: '개인 영토 자유 구역',
    color: '#8b50ff', grade: 'S', topOwner: '강남부자', trophyReq: null,
    cx: 400, cy: 378, halfHeight: 108,
    // Archipelago — 3 distinct island clusters
    pathData: `
      M 345,322 C 362,310 384,306 405,310 C 425,306 446,314 458,328 C 470,341 470,360 462,374
      C 470,388 466,408 454,420 C 440,433 420,438 400,436 C 378,440 358,434 346,420
      C 332,408 330,388 338,374 C 326,360 328,340 345,322 Z
      M 466,350 C 477,341 491,340 503,346 C 514,352 520,366 515,378
      C 520,390 513,404 500,408 C 487,414 472,408 466,397
      C 455,403 444,394 444,381 C 442,368 452,354 466,350 Z
      M 368,438 C 381,428 397,426 410,431 C 424,427 437,437 440,450
      C 444,463 435,475 422,478 C 409,482 394,478 382,471
      C 367,476 354,465 350,452 C 345,439 355,432 368,438 Z
    `,
  },
  {
    id: 'east', name: '동부 대륙', desc: '네온의 도시',
    color: '#ff1493', grade: 'A', topOwner: '영토수집가', trophyReq: 3000,
    cx: 685, cy: 375, halfHeight: 90,
    // Europe — Scandinavian NW arm, Iberian SW stub, Italian-like S peninsula, Greek/Balkan SE
    pathData: `
      M 618,318 C 633,302 658,296 680,304
      L 692,296 C 706,292 720,302 724,318
      C 730,332 724,350 710,358
      C 722,372 722,396 706,410
      L 714,420 C 710,434 695,440 682,428
      L 688,442 C 682,456 665,460 651,448
      C 643,458 626,462 614,448
      C 601,436 600,416 612,402
      C 598,388 596,364 608,350
      C 598,335 600,320 618,318 Z
    `,
  },
  {
    id: 'south', name: '남부 대륙', desc: '사막의 전장',
    color: '#ffd700', grade: 'A', topOwner: '픽셀왕', trophyReq: 2000,
    cx: 393, cy: 580, halfHeight: 95,
    // Africa — smooth wide west, Horn of Africa on NE, Cape at south
    pathData: `
      M 290,510 C 305,494 332,488 362,495
      C 384,489 410,493 430,507
      L 452,498 C 472,496 490,510 494,528
      C 500,542 496,562 482,574
      L 494,586 C 500,604 490,626 472,633
      C 482,648 475,666 458,672
      C 441,678 422,671 410,656
      C 396,664 378,668 360,662
      C 340,655 325,638 326,618
      C 312,602 306,578 316,558
      C 302,540 295,518 290,510 Z
    `,
  },
  {
    id: 'southeast', name: '남동부', desc: '디지털 포트',
    color: '#ff6644', grade: 'C', topOwner: '뉴비123', trophyReq: 300,
    cx: 632, cy: 573, halfHeight: 82,
    // Australia — Gulf/bay indent on north, compact body, irregular east coast
    pathData: `
      M 530,513 C 545,498 568,494 593,502
      L 610,496 C 628,493 650,503 660,519
      L 669,511 C 682,504 700,510 708,526
      C 717,540 713,562 699,574
      C 710,590 707,615 690,629
      C 674,644 650,648 628,644
      C 606,649 582,638 568,621
      C 552,630 532,618 526,600
      C 517,582 520,556 534,541
      C 524,529 524,516 530,513 Z
    `,
  },
];

export function WorldMapPage() {
  const navigate = useNavigate();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const [hoveredContinent, setHoveredContinent] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const { messages, sendMessage } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);

  const SVG_W = 800, SVG_H = 700;

  const getFitView = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { z: 1, x: 0, y: 0 };
    const { width, height } = el.getBoundingClientRect();
    const z = Math.min(width / SVG_W, height / SVG_H) * 0.95;
    return { z, x: (width - SVG_W * z) / 2, y: (height - SVG_H * z) / 2 };
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const { z, x, y } = getFitView();
      setZoom(z);
      setPan({ x, y });
    });
    return () => cancelAnimationFrame(raf);
  }, [getFitView]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setZoom(z => {
      const next = Math.max(0.4, Math.min(4, z * factor));
      const scale = next / z;
      setPan(p => ({ x: mx - (mx - p.x) * scale, y: my - (my - p.y) * scale }));
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-continent]')) return;
    setIsDragging(true);
    setDragStart({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: dragStart.px + (e.clientX - dragStart.mx), y: dragStart.py + (e.clientY - dragStart.my) });
  };
  const handleMouseUp = () => setIsDragging(false);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    sendMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-[#060a14] overflow-hidden">
      <GNB />

      <div className="flex flex-1 overflow-hidden">
        {/* Main map area */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, #0c1428 0%, #040810 100%)',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Zoom controls */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <button onClick={() => setZoom(z => Math.min(4, z * 1.2))}
              className="w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white hover:border-[#00f5ff] transition-colors flex items-center justify-center"
              style={{ fontSize: 14 }}>+</button>
            <button onClick={() => setZoom(z => Math.max(0.4, z / 1.2))}
              className="w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white hover:border-[#00f5ff] transition-colors flex items-center justify-center"
              style={{ fontSize: 14 }}>−</button>
            <button onClick={() => { const { z, x, y } = getFitView(); setZoom(z); setPan({ x, y }); }}
              className="w-7 h-7 bg-[#10192e] border border-[#2a3a5a] rounded text-[#7788a5] hover:text-white hover:border-[#00f5ff] transition-colors flex items-center justify-center"
              style={{ fontSize: 12 }}>⊡</button>
            <div className="bg-[#10192e] border border-[#2a3a5a] rounded px-2 h-7 flex items-center">
              <span className="text-[#4a5a7a]" style={{ fontSize: 10 }}>{Math.round(zoom * 100)}%</span>
            </div>
          </div>

          {/* Hint */}
          <div className="absolute bottom-3 left-3 z-10 text-[#2a3a5a]" style={{ fontSize: 10 }}>
            스크롤로 줌 · 드래그로 이동 · 대륙 클릭으로 진입
          </div>

          {/* Chat FAB */}
          <button
            onClick={() => setShowChat(v => !v)}
            className="absolute bottom-4 right-4 z-20 w-12 h-12 bg-[#00f5ff] rounded-full flex items-center justify-center shadow-lg hover:brightness-110 transition-all"
            style={{ boxShadow: '0 0 20px #00f5ff40' }}
          >
            <span style={{ fontSize: 20 }}>💬</span>
          </button>

          {/* Map SVG */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              willChange: 'transform',
            }}
          >
            <svg width={800} height={700} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="1" fill="#1a2438" opacity="0.5" />
                </pattern>
                {CONTINENTS.map(c => (
                  <clipPath key={c.id} id={`clip-${c.id}`}>
                    <path d={c.pathData} />
                  </clipPath>
                ))}
                {/* Glow filter for hovered continent */}
                <filter id="continent-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width="800" height="700" fill="url(#dots)" />

              {/* Ocean grid lines — subtle latitude/longitude feel */}
              {[140, 280, 420, 560].map(y => (
                <line key={`h${y}`} x1="0" y1={y} x2="800" y2={y} stroke="#1a2438" strokeWidth="0.5" opacity="0.4" />
              ))}
              {[160, 320, 480, 640].map(x => (
                <line key={`v${x}`} x1={x} y1="0" x2={x} y2="700" stroke="#1a2438" strokeWidth="0.5" opacity="0.4" />
              ))}

              {/* Continent blobs */}
              {CONTINENTS.map(c => {
                const isHovered = hoveredContinent === c.id;
                return (
                  <g
                    key={c.id}
                    data-continent={c.id}
                    style={{
                      transformOrigin: `${c.cx}px ${c.cy}px`,
                      transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                      transition: 'transform 0.22s ease-out',
                    }}
                  >
                    {/* Glow halo under continent */}
                    {isHovered && (
                      <path
                        d={c.pathData}
                        fill="none"
                        stroke={c.color}
                        strokeWidth={16}
                        strokeOpacity={0.12}
                        style={{ filter: 'blur(8px)', pointerEvents: 'none' }}
                      />
                    )}

                    {/* Pixel grid clipped to continent outline */}
                    <g clipPath={`url(#clip-${c.id})`} style={{ pointerEvents: 'none' }}>
                      {Array.from({ length: 16 }, (_, row) =>
                        Array.from({ length: 20 }, (_, col) => (
                          <rect
                            key={`${row}-${col}`}
                            x={c.cx - 155 + col * 16}
                            y={c.cy - 118 + row * 16}
                            width={8}
                            height={8}
                            fill={c.color}
                            opacity={0.08 + ((row * 11 + col * 7 + row * col) % 12) * 0.018}
                            rx={1}
                          />
                        ))
                      )}
                    </g>

                    {/* Continent fill + outline */}
                    <path
                      d={c.pathData}
                      fill={c.color + (isHovered ? '38' : '22')}
                      stroke={c.color}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      strokeOpacity={isHovered ? 1 : 0.6}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredContinent(c.id)}
                      onMouseLeave={() => setHoveredContinent(null)}
                      onClick={() => navigate(`/app/continent/${c.id}`)}
                    />

                    {/* Continent name */}
                    <text
                      x={c.cx}
                      y={c.cy - 8}
                      textAnchor="middle"
                      fill={c.color}
                      fontSize={isHovered ? 14 : 12}
                      fontWeight="700"
                      style={{ pointerEvents: 'none', transition: 'font-size 0.2s' }}
                    >
                      {c.name}
                    </text>

                    {/* Trophy / free label */}
                    <text
                      x={c.cx}
                      y={c.cy + 10}
                      textAnchor="middle"
                      fill={c.color}
                      fontSize={10}
                      opacity={0.75}
                      style={{ pointerEvents: 'none' }}
                    >
                      {c.trophyReq != null ? `🏆 ${c.trophyReq.toLocaleString()}+ 참여 가능` : '✦ 자유 참여 가능'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Chat slide-in panel */}
        {showChat && (
          <div className="flex-shrink-0 w-[280px] bg-[#080d1a] border-l border-[#1a2438] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2438]">
              <span className="text-[#c0ccdd] font-semibold" style={{ fontSize: 14 }}>💬 채팅</span>
              <button onClick={() => setShowChat(false)} className="text-[#4a5a7a] hover:text-[#c0ccdd]">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className="text-xs">
                  <span style={{ color: msg.user === '시스템' ? '#ffd700' : '#00f5ff', fontWeight: 600 }}>{msg.user}</span>
                  <span className="text-[#4a5a7a]"> {msg.time}</span>
                  <p className="text-[#c0ccdd] mt-0.5">{msg.message}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-[#1a2438] flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="메시지 입력..."
                className="flex-1 h-8 bg-[#12192c] border border-[#1e2a3d] rounded-lg px-3 text-[#c0ccdd] outline-none focus:border-[#00f5ff] transition-colors"
                style={{ fontSize: 12 }}
              />
              <button
                onClick={sendChat}
                className="w-8 h-8 bg-[#00f5ff] rounded-lg text-[#060a14] font-bold flex items-center justify-center"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
