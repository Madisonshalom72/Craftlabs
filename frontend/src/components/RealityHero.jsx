import { useEffect, useRef, useState } from "react";
import { Sparkles, ScanEye, Wand2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

/**
 * Split reality-demonstration hero.
 * Left  : animated AR wireframe scan with detected issues + labels.
 * Right : before/after morph slider showing AI-imagined repair outcome.
 */

// Static seed pair — swap-safe, no network dependency for the anonymous first view.
const SCAN_IMAGE = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80";

const BEFORE_AFTER_PAIRS = [
  {
    label: "Bathroom refresh",
    before: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80",
    after: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80&sat=-40",
    caption: "Marble vanity, matte-black fixtures, backlit mirror",
  },
  {
    label: "Kitchen upgrade",
    before: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
    after: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80&sat=-40",
    caption: "Quartz counters, brushed brass, warm task lighting",
  },
  {
    label: "Living room revive",
    before: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    after: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80&sat=-40",
    caption: "Refinished floors, gallery wall, warm ambient wash",
  },
];

// Detected issues drawn over the scan (normalized 0-100 coords).
const ISSUES = [
  { x: 26, y: 32, w: 20, h: 14, label: "Loose junction box", tag: "Electrical · $120-180", tone: "amber" },
  { x: 60, y: 18, w: 26, h: 20, label: "Water stain", tag: "Plumbing · $80-140", tone: "cyan" },
  { x: 44, y: 62, w: 18, h: 12, label: "Cracked outlet", tag: "Electrical · $60-95", tone: "lime" },
];

const TONE_MAP = {
  amber: { stroke: "#F59E0B", glow: "shadow-[0_0_18px_rgba(245,158,11,0.5)]", chip: "bg-amber-500 text-slate-900" },
  cyan: { stroke: "#22D3EE", glow: "shadow-[0_0_18px_rgba(34,211,238,0.45)]", chip: "bg-cyan-400 text-slate-900" },
  lime: { stroke: "#B7FF3A", glow: "shadow-[0_0_18px_rgba(183,255,58,0.45)]", chip: "bg-craft-lime text-slate-900" },
};

export default function RealityHero() {
  return (
    <div data-testid="reality-hero" className="relative">
      <div className="absolute -inset-4 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" aria-hidden />
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        <WireframeScan />
        <BeforeAfterMorph />
      </div>
    </div>
  );
}

/* ---------- LEFT: Wireframe scan ---------- */
function WireframeScan() {
  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-craft-slate min-h-[360px] group">
      {/* Base image, muted */}
      <img
        src={SCAN_IMAGE}
        alt="AR wireframe scan of a room"
        className="absolute inset-0 w-full h-full object-cover opacity-70 saturate-50"
        loading="lazy"
      />
      {/* Overlay tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/20 to-slate-950/70" />

      {/* Grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 animate-grid-pulse mix-blend-screen bg-[linear-gradient(rgba(183,255,58,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(183,255,58,0.35)_1px,transparent_1px)] bg-[length:28px_28px]"
      />

      {/* Sweep scanline */}
      <div className="absolute inset-x-0 top-0 h-10 pointer-events-none animate-scanline">
        <div className="h-full w-full bg-gradient-to-b from-craft-lime/0 via-craft-lime/50 to-craft-lime/0 mix-blend-screen" />
      </div>

      {/* Detected boxes */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {ISSUES.map((iss, i) => {
          const tone = TONE_MAP[iss.tone];
          return (
            <g key={i}>
              <rect
                x={iss.x}
                y={iss.y}
                width={iss.w}
                height={iss.h}
                fill="none"
                stroke={tone.stroke}
                strokeWidth="0.35"
                strokeDasharray="1 1.5"
                vectorEffect="non-scaling-stroke"
                className="animate-wire-draw"
                style={{ animationDelay: `${i * 250}ms` }}
              />
              {/* Corner ticks */}
              {[
                [iss.x, iss.y],
                [iss.x + iss.w, iss.y],
                [iss.x, iss.y + iss.h],
                [iss.x + iss.w, iss.y + iss.h],
              ].map(([cx, cy], k) => (
                <circle key={k} cx={cx} cy={cy} r="0.7" fill={tone.stroke} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* HTML labels layered above SVG so they respect box coords */}
      {ISSUES.map((iss, i) => {
        const tone = TONE_MAP[iss.tone];
        return (
          <div
            key={`lbl-${i}`}
            data-testid={`scan-label-${i}`}
            className={`absolute animate-label-in ${tone.glow}`}
            style={{
              left: `calc(${iss.x + iss.w}% + 6px)`,
              top: `calc(${iss.y}% - 4px)`,
              animationDelay: `${350 + i * 250}ms`,
            }}
          >
            <div className="px-2 py-1 rounded-md bg-slate-950/90 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full`} style={{ background: tone.stroke }} />
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-200 whitespace-nowrap">
                  {iss.label}
                </span>
              </div>
              <div className="text-[9px] font-mono text-slate-500 pl-3 whitespace-nowrap">{iss.tag}</div>
            </div>
          </div>
        );
      })}

      {/* Top status pill */}
      <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-slate-950/70 border border-craft-lime/30 backdrop-blur-md flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-craft-lime animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-craft-lime">Vision scan · live</span>
      </div>

      {/* Bottom metric strip */}
      <div className="absolute bottom-3 inset-x-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanEye className="w-3.5 h-3.5 text-craft-lime" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300">
            3 issues · $260-415 est
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">conf 94%</span>
      </div>
    </div>
  );
}

/* ---------- RIGHT: Before / After morph slider ---------- */
function BeforeAfterMorph() {
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  const pair = BEFORE_AFTER_PAIRS[idx];

  // Auto-oscillate the slider when idle so it reads as a "morph".
  useEffect(() => {
    if (!autoplay) return;
    let dir = 1;
    let val = 50;
    const tick = () => {
      val += dir * 0.35;
      if (val > 78) dir = -1;
      if (val < 22) dir = 1;
      setPos(val);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [autoplay, idx]);

  const onPointer = (e) => {
    setAutoplay(false);
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    setPos(Math.max(4, Math.min(96, (x / rect.width) * 100)));
  };

  const cycle = (dir) => {
    setIdx((p) => (p + dir + BEFORE_AFTER_PAIRS.length) % BEFORE_AFTER_PAIRS.length);
    setPos(50);
    setAutoplay(true);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-craft-slate min-h-[360px] flex flex-col">
      <div
        ref={containerRef}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onMouseMove={(e) => dragging && onPointer(e)}
        onTouchStart={() => setDragging(true)}
        onTouchEnd={() => setDragging(false)}
        onTouchMove={onPointer}
        onClick={onPointer}
        className="relative flex-1 select-none cursor-ew-resize"
        data-testid="before-after-slider"
      >
        {/* AFTER (below) */}
        <img
          src={pair.after}
          alt={`${pair.label} — after`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        {/* BEFORE (clipped by slider) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img
            src={pair.before}
            alt={`${pair.label} — before`}
            className="w-full h-full object-cover grayscale contrast-125"
            loading="lazy"
          />
        </div>

        {/* Divider */}
        <div
          className="absolute inset-y-0 pointer-events-none"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute inset-y-0 -translate-x-1/2 w-px bg-craft-lime/80 shadow-[0_0_16px_rgba(183,255,58,0.6)]" />
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/90 border border-craft-lime/70 shadow-lg flex items-center justify-center">
            <ChevronLeft className="w-3 h-3 text-craft-lime" />
            <ChevronRight className="w-3 h-3 text-craft-lime -ml-0.5" />
          </div>
        </div>

        {/* Before / After tags */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-slate-950/80 border border-white/10 backdrop-blur-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Before</span>
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-slate-950/80 border border-craft-lime/30 backdrop-blur-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-craft-lime">After · AI</span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 bg-slate-950/60 backdrop-blur-md px-3.5 py-2.5 flex items-center gap-3">
        <button
          data-testid="ba-prev"
          onClick={() => cycle(-1)}
          className="w-7 h-7 rounded-full border border-white/10 hover:border-craft-lime/50 flex items-center justify-center transition"
          aria-label="Previous"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Wand2 className="w-3 h-3 text-craft-lime" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-craft-lime">
              Nano Banana · morph
            </span>
          </div>
          <div className="text-xs text-slate-300 truncate mt-0.5">
            <span className="font-semibold text-white">{pair.label}</span>
            <span className="text-slate-500"> · {pair.caption}</span>
          </div>
        </div>
        <button
          data-testid="ba-refresh"
          onClick={() => { setPos(50); setAutoplay(true); }}
          className="w-7 h-7 rounded-full border border-white/10 hover:border-craft-lime/50 flex items-center justify-center transition"
          aria-label="Reset"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          data-testid="ba-next"
          onClick={() => cycle(1)}
          className="w-7 h-7 rounded-full border border-white/10 hover:border-craft-lime/50 flex items-center justify-center transition"
          aria-label="Next"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
