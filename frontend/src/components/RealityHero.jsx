import { useEffect, useState } from "react";
import {
  ScanEye, Wand2, ChevronLeft, ChevronRight, Sparkles,
  MapPin, Star, Clock, CheckCircle2,
} from "lucide-react";

/**
 * Craft Master Labs · Reality-demo hero (CSS-driven cinematic).
 * Choreography is 100% CSS keyframes so the demo never freezes on
 * throttled tabs. JS only rotates the underlying scene every ~10.5s.
 */

const SCENE_DUR = 10500;

const SCENES = [
  {
    id: "electrical",
    room: "Prospect Heights · living room",
    scanImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
    issues: [
      { x: 22, y: 30, w: 22, h: 16, label: "Loose junction box", tag: "Electrical · $120-180", tone: "amber", price: 150 },
      { x: 58, y: 20, w: 22, h: 18, label: "Water stain",         tag: "Plumbing · $80-140",     tone: "cyan",  price: 110 },
      { x: 40, y: 60, w: 20, h: 14, label: "Cracked outlet",      tag: "Electrical · $60-95",    tone: "lime",  price: 75  },
    ],
    morphBefore: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
    morphAfter:  "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
    morphCaption: "Panel upgrade, matte switches, fresh casing bead",
    pro: {
      name: "Marcus V.", role: "Master Electrician",
      photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80",
      rating: 4.9, jobs: 312, eta: "12 min", quote: 335,
    },
  },
  {
    id: "kitchen",
    room: "Cobble Hill · kitchen",
    scanImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
    issues: [
      { x: 18, y: 40, w: 22, h: 18, label: "Leaking p-trap",      tag: "Plumbing · $140-220",      tone: "cyan",  price: 180 },
      { x: 58, y: 22, w: 24, h: 20, label: "Chipped grout",       tag: "Tile & Masonry · $90-160", tone: "amber", price: 120 },
      { x: 38, y: 66, w: 22, h: 14, label: "Loose cabinet hinge", tag: "Carpentry · $50-95",       tone: "lime",  price: 70  },
    ],
    morphBefore: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80",
    morphAfter:  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    morphCaption: "Quartz counters, brushed brass pulls, warm task lighting",
    pro: {
      name: "Elena R.", role: "Master Plumber",
      photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
      rating: 5.0, jobs: 189, eta: "18 min", quote: 370,
    },
  },
  {
    id: "bathroom",
    room: "Long Island City · bathroom",
    scanImage: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80",
    issues: [
      { x: 20, y: 24, w: 24, h: 20, label: "Mildewed caulk",     tag: "Tile · $70-130",       tone: "cyan",  price: 95  },
      { x: 60, y: 34, w: 22, h: 18, label: "Corroded shutoff",   tag: "Plumbing · $110-190", tone: "amber", price: 150 },
      { x: 38, y: 66, w: 22, h: 14, label: "Warped floor plank", tag: "Carpentry · $80-160", tone: "lime",  price: 115 },
    ],
    morphBefore: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=80",
    morphAfter:  "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=80",
    morphCaption: "Marble vanity, matte-black fixtures, backlit LED mirror",
    pro: {
      name: "David C.", role: "Renovation Carpenter",
      photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
      rating: 4.8, jobs: 421, eta: "24 min", quote: 360,
    },
  },
];

const TONE = { amber: "#F59E0B", cyan: "#22D3EE", lime: "#B7FF3A" };

// Global keyframe library injected once per mount.
const KEYFRAMES = `
@keyframes cml-kenburns {
  0%   { transform: scale(1) translate(0,0); }
  50%  { transform: scale(1.05) translate(-1%,-1%); }
  100% { transform: scale(1) translate(0,0); }
}
@keyframes cml-scanline {
  0%   { transform: translateY(-40%); opacity: .8; }
  40%  { transform: translateY(360%); opacity: .8; }
  40.1%,100% { transform: translateY(360%); opacity: 0; }
}
@keyframes cml-issue-0 {
  0%,9%    { opacity: 0; transform: scale(.6); }
  13%,100% { opacity: 1; transform: scale(1); }
}
@keyframes cml-issue-1 {
  0%,19%   { opacity: 0; transform: scale(.6); }
  23%,100% { opacity: 1; transform: scale(1); }
}
@keyframes cml-issue-2 {
  0%,29%   { opacity: 0; transform: scale(.6); }
  33%,100% { opacity: 1; transform: scale(1); }
}
@keyframes cml-scanning-out {
  0%,38%   { opacity: 1; }
  42%,100% { opacity: 0; }
}
@keyframes cml-scan-done {
  0%,40%   { opacity: 0; transform: translateY(4px); }
  45%,100% { opacity: 1; transform: translateY(0); }
}
@keyframes cml-morph {
  0%,44%   { clip-path: inset(0 0% 0 0); }
  70%,100% { clip-path: inset(0 100% 0 0); }
}
@keyframes cml-divider {
  0%,44%   { left: 100%; opacity: 0; }
  46%      { opacity: 1; }
  70%,100% { left: 0%; opacity: 1; }
}
@keyframes cml-match-in {
  0%,74%   { opacity: 0; transform: translateY(20px); }
  82%,100% { opacity: 1; transform: translateY(0); }
}
@keyframes cml-ping {
  0%   { transform: scale(1); opacity: .8; }
  70%  { transform: scale(2.5); opacity: 0; }
  100% { transform: scale(2.5); opacity: 0; }
}
`;

export default function RealityHero() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const scene = SCENES[sceneIdx];

  useEffect(() => {
    const id = setInterval(() => setSceneIdx((p) => (p + 1) % SCENES.length), SCENE_DUR);
    return () => clearInterval(id);
  }, []);

  const totalPrice = scene.issues.reduce((s, i) => s + i.price, 0);

  return (
    <div data-testid="reality-hero" className="relative">
      <style>{KEYFRAMES}</style>
      <div className="absolute -inset-4 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" aria-hidden />
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        <ScanPanel scene={scene} total={totalPrice} />
        <MorphPanel scene={scene} />
      </div>

      {/* Scene indicators */}
      <div className="mt-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              data-testid={`hero-scene-${s.id}`}
              onClick={() => setSceneIdx(i)}
              className="group relative flex items-center gap-2"
              aria-label={`Show ${s.room}`}
            >
              <span
                className={`h-1.5 rounded-full transition-all ${i === sceneIdx ? "w-8 bg-craft-lime" : "w-3 bg-white/15 group-hover:bg-white/30"}`}
              />
              {i === sceneIdx && (
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{s.room}</span>
              )}
            </button>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500">
          <Sparkles className="w-3 h-3 text-craft-lime" />
          Live · not a video
        </div>
      </div>
    </div>
  );
}

function ScanPanel({ scene, total }) {
  return (
    <div
      key={scene.id}
      className="relative rounded-3xl overflow-hidden border border-white/10 bg-craft-slate min-h-[380px]"
    >
      <img
        src={scene.scanImage}
        alt={`Vision scan of ${scene.room}`}
        className="absolute inset-0 w-full h-full object-cover opacity-70 saturate-50"
        style={{ animation: "cml-kenburns 12s ease-in-out infinite" }}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/20 to-slate-950/70" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 mix-blend-screen bg-[linear-gradient(rgba(183,255,58,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(183,255,58,0.35)_1px,transparent_1px)] bg-[length:28px_28px]"
        style={{ animation: "cml-kenburns 12s ease-in-out infinite reverse" }}
      />

      {/* Scanline that sweeps once per cycle */}
      <div
        className="absolute inset-x-0 top-0 h-8 pointer-events-none"
        style={{ animation: `cml-scanline ${SCENE_DUR}ms linear infinite` }}
      >
        <div className="h-full w-full bg-gradient-to-b from-craft-lime/0 via-craft-lime/70 to-craft-lime/0 mix-blend-screen" />
      </div>

      <Reticles />

      {/* SVG boxes with staggered reveal via negative delay */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {scene.issues.map((iss, i) => {
          const stroke = TONE[iss.tone];
          return (
            <g key={`iss-${iss.x}-${iss.y}-${iss.tone}`} style={{ animation: `cml-issue-${i} ${SCENE_DUR}ms linear infinite`, opacity: 0 }}>
              <rect
                x={iss.x} y={iss.y} width={iss.w} height={iss.h}
                fill="none" stroke={stroke} strokeWidth="0.4"
                strokeDasharray="1 1.5"
                vectorEffect="non-scaling-stroke"
              />
              {[[iss.x, iss.y],[iss.x+iss.w, iss.y],[iss.x, iss.y+iss.h],[iss.x+iss.w, iss.y+iss.h]].map(([cx,cy])=>(
                <circle key={`c-${cx}-${cy}`} cx={cx} cy={cy} r="0.8" fill={stroke} />
              ))}
              {/* center ping */}
              <circle
                cx={iss.x + iss.w/2} cy={iss.y + iss.h/2}
                r="0.6" fill={stroke}
                style={{ animation: `cml-ping 2.2s linear infinite`, transformOrigin: `${iss.x + iss.w/2}% ${iss.y + iss.h/2}%` }}
              />
            </g>
          );
        })}
      </svg>

      {/* Labels */}
      {scene.issues.map((iss, i) => {
        const stroke = TONE[iss.tone];
        const rightSide = iss.x + iss.w > 65;
        return (
          <div
            key={`lbl-${scene.id}-${i}`}
            data-testid={`scan-label-${i}`}
            className="absolute"
            style={{
              left: rightSide ? undefined : `calc(${iss.x + iss.w}% + 6px)`,
              right: rightSide ? `calc(${100 - iss.x}% + 6px)` : undefined,
              top: `calc(${iss.y}% - 4px)`,
              animation: `cml-issue-${i} ${SCENE_DUR}ms linear infinite`,
              opacity: 0,
            }}
          >
            <div className="px-2 py-1 rounded-md bg-slate-950/90 border border-white/10 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: stroke }} />
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-200 whitespace-nowrap">{iss.label}</span>
              </div>
              <div className="text-[9px] font-mono text-slate-500 pl-3 whitespace-nowrap">{iss.tag}</div>
            </div>
          </div>
        );
      })}

      {/* Status pills: SCANNING fades out, SCAN COMPLETE fades in */}
      <div className="absolute top-4 left-4">
        <div className="relative">
          <span
            className="absolute inset-0 px-2.5 py-1 rounded-full bg-slate-950/70 border border-craft-lime/30 backdrop-blur-md flex items-center gap-1.5"
            style={{ animation: `cml-scanning-out ${SCENE_DUR}ms linear infinite` }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-craft-lime animate-pulse" />
            <span data-testid="scan-status" className="text-[10px] font-mono uppercase tracking-widest text-craft-lime whitespace-nowrap">Scanning</span>
          </span>
          <span
            className="px-2.5 py-1 rounded-full bg-slate-950/70 border border-craft-lime/30 backdrop-blur-md flex items-center gap-1.5"
            style={{ animation: `cml-scan-done ${SCENE_DUR}ms linear infinite`, opacity: 0 }}
          >
            <CheckCircle2 className="w-3 h-3 text-craft-lime" strokeWidth={3} />
            <span className="text-[10px] font-mono uppercase tracking-widest text-craft-lime whitespace-nowrap">Scan complete</span>
          </span>
        </div>
      </div>

      {/* Metric strip */}
      <div className="absolute bottom-3 inset-x-3 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanEye className="w-3.5 h-3.5 text-craft-lime" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300">
            <span className="text-craft-lime">{scene.issues.length}</span> issues · <span className="text-craft-lime">${total}</span> est
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">conf 96%</span>
      </div>
    </div>
  );
}

function Reticles() {
  return (
    <>
      <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-craft-lime/60" />
      <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-craft-lime/60" />
      <div className="absolute bottom-14 left-3 w-6 h-6 border-l-2 border-b-2 border-craft-lime/60" />
      <div className="absolute bottom-14 right-3 w-6 h-6 border-r-2 border-b-2 border-craft-lime/60" />
    </>
  );
}

function MorphPanel({ scene }) {
  return (
    <div key={scene.id} className="relative rounded-3xl overflow-hidden border border-white/10 bg-craft-slate min-h-[380px] flex flex-col">
      <div className="relative flex-1" data-testid="before-after-slider">
        {/* AFTER (bottom) */}
        <img
          src={scene.morphAfter}
          alt={`${scene.room} — after`}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: "cml-kenburns 12s ease-in-out infinite" }}
          loading="lazy"
        />
        {/* BEFORE (clipped by animated inset) */}
        <div
          className="absolute inset-0"
          style={{ animation: `cml-morph ${SCENE_DUR}ms linear infinite` }}
        >
          <img
            src={scene.morphBefore}
            alt={`${scene.room} — before`}
            className="w-full h-full object-cover grayscale contrast-125"
            loading="lazy"
          />
        </div>

        {/* Divider handle */}
        <div
          className="absolute inset-y-0 pointer-events-none"
          style={{ animation: `cml-divider ${SCENE_DUR}ms linear infinite`, left: "100%", opacity: 0 }}
        >
          <div className="absolute inset-y-0 -translate-x-1/2 w-px bg-craft-lime/80 shadow-[0_0_16px_rgba(183,255,58,0.6)]" />
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/90 border border-craft-lime/70 shadow-lg flex items-center justify-center">
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

        {/* Match card */}
        <div
          data-testid="match-card"
          className="absolute inset-x-3 bottom-3 rounded-2xl border border-craft-lime/30 bg-slate-950/90 backdrop-blur-md px-3 py-2.5 flex items-center gap-3"
          style={{ animation: `cml-match-in ${SCENE_DUR}ms linear infinite`, opacity: 0 }}
        >
          <div className="relative shrink-0">
            <img src={scene.pro.photo} alt={scene.pro.name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-craft-lime text-slate-950 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3" strokeWidth={3} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white truncate">{scene.pro.name}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 truncate">· {scene.pro.role}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 mt-0.5">
              <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> {scene.pro.rating}</span>
              <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5 text-cyan-400" /> {scene.pro.eta}</span>
              <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5 text-slate-400" /> {scene.pro.jobs} jobs</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-craft-lime leading-none">${scene.pro.quote}</div>
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">firm quote</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-slate-950/60 backdrop-blur-md px-3.5 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Wand2 className="w-3 h-3 text-craft-lime" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-craft-lime">Nano Banana · morph</span>
        </div>
        <div className="flex-1 min-w-0 text-xs text-slate-300 truncate">
          <span className="text-slate-500">{scene.morphCaption}</span>
        </div>
      </div>
    </div>
  );
}
