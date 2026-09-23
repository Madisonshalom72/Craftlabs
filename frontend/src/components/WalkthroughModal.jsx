import { useEffect, useState, useRef } from "react";
import { X, ArrowRight, ArrowLeft, Camera, ScanEye, Users, CheckCircle2, Zap, Sparkles, Play, Pause } from "lucide-react";
import { Link } from "react-router-dom";

const SCENES = [
  {
    id: "snap",
    label: "Step 1",
    title: "Snap a photo",
    body: "Point your phone at the broken thing. A cracked tile, a leaky pipe, a flickering outlet — anything.",
    icon: Camera,
    accent: "amber",
  },
  {
    id: "diagnose",
    label: "Step 2",
    title: "AI diagnoses it",
    body: "Claude Sonnet vision reads the photo, flags the exact defect with a bounding box, and estimates the fix.",
    icon: ScanEye,
    accent: "amber",
  },
  {
    id: "match",
    label: "Step 3",
    title: "Meet your pro",
    body: "Smart matching ranks NYC craftsmen by skill, distance, and rating — you pick from the top three.",
    icon: Users,
    accent: "amber",
  },
  {
    id: "book",
    label: "Step 4",
    title: "Book & relax",
    body: "One-tap Stripe checkout, escrow-protected. Your pro arrives on time — or you get your money back.",
    icon: CheckCircle2,
    accent: "emerald",
  },
];

const SCENE_MS = 4200;

function SceneVisual({ index }) {
  // Distinct animated illustration for each scene, built from divs + inline SVG.
  if (index === 0) {
    // Scene 1: Camera framing a "damaged wall" with a shutter click
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.15),transparent_60%)]" />
        <div className="relative w-64 h-40 rounded-2xl bg-gradient-to-br from-stone-700 to-stone-800 shadow-2xl border border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.02)_0,rgba(255,255,255,0.02)_2px,transparent_2px,transparent_18px)]" />
          <div className="absolute top-8 left-14 w-16 h-1 bg-red-400/70 rotate-[8deg] animate-pulse" />
          <div className="absolute top-14 left-20 w-10 h-1 bg-red-400/50 rotate-[15deg]" />
        </div>
        <div className="absolute w-64 h-40 rounded-2xl border-4 border-amber-400 pointer-events-none animate-[cp-frame_1.8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white shadow-[0_10px_30px_rgba(245,158,11,0.35)] border-4 border-amber-400 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-amber-400" />
        </div>
      </div>
    );
  }
  if (index === 1) {
    // Scene 2: AI scanning — same wall with a bounding box + confidence badge appearing
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.15),transparent_60%)]" />
        <div className="relative w-72 h-44 rounded-2xl bg-gradient-to-br from-stone-700 to-stone-800 shadow-2xl border border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.02)_0,rgba(255,255,255,0.02)_2px,transparent_2px,transparent_18px)]" />
          <div className="absolute top-8 left-14 w-16 h-1 bg-red-400/70 rotate-[8deg]" />
          <div className="absolute top-14 left-20 w-10 h-1 bg-red-400/50 rotate-[15deg]" />
          {/* Scanning line */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-[cp-scan_2s_ease-in-out_infinite]" />
          {/* Bounding box */}
          <div className="absolute top-6 left-10 w-24 h-12 border-2 border-amber-400 rounded-lg animate-[cp-fade-in_1.4s_ease-out_forwards]">
            <div className="absolute -top-6 left-0 px-2 py-0.5 rounded-md bg-amber-500 text-slate-900 text-[10px] font-mono uppercase tracking-widest font-bold">
              Cracked tile · 96%
            </div>
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-amber-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-amber-400" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-amber-400" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-amber-400" />
          </div>
        </div>
        <div className="absolute -bottom-2 right-6 px-3 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/40 text-xs font-mono text-amber-300 flex items-center gap-1.5 animate-[cp-fade-in_1.8s_ease-out_forwards]">
          <Sparkles className="w-3 h-3" /> Est. $120 – $180
        </div>
      </div>
    );
  }
  if (index === 2) {
    // Scene 3: Three matched pros sliding in
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.12),transparent_60%)]" />
        {[
          { name: "Marcus Vance", role: "Master Electrician", score: 98, delay: "0s" },
          { name: "Elena Rostova", role: "Certified Plumber", score: 94, delay: "0.15s" },
          { name: "David Chen", role: "Carpenter", score: 89, delay: "0.3s" },
        ].map((p) => (
          <div
            key={p.name}
            className="relative w-full max-w-sm flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 border border-white/10 shadow-lg animate-[cp-slide-in-right_0.6s_ease-out_forwards]"
            style={{ animationDelay: p.delay, opacity: 0 }}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-900 font-bold text-sm">
              {p.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-white truncate">{p.name}</div>
              <div className="text-xs text-slate-400">{p.role}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono text-emerald-400">{p.score}%</div>
              <div className="text-[10px] text-slate-500">match</div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  // Scene 4: Booking confirmed
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(16,185,129,0.15),transparent_60%)]" />
      <div className="relative w-72 rounded-2xl bg-slate-800/90 border border-emerald-500/40 shadow-2xl p-6 animate-[cp-pop_0.7s_ease-out_forwards]">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-400" strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-[cp-ring_1.5s_ease-out_infinite]" />
          </div>
        </div>
        <div className="text-center">
          <div className="font-heading font-bold text-xl text-white mb-1">Booking confirmed</div>
          <div className="text-xs text-slate-400 mb-3">Marcus arrives Sat, 10:00 AM</div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono uppercase tracking-widest">
            <Zap className="w-3 h-3" /> $150 · escrow held
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WalkthroughModal({ open, onClose }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setI(0);
    setPlaying(true);
  }, [open]);

  useEffect(() => {
    if (!open || !playing) return;
    timerRef.current = setTimeout(() => {
      setI(prev => (prev + 1) % SCENES.length);
    }, SCENE_MS);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [i, playing, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI(p => Math.min(p + 1, SCENES.length - 1));
      if (e.key === "ArrowLeft") setI(p => Math.max(p - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const scene = SCENES[i];
  const Icon = scene.icon;
  const isLast = i === SCENES.length - 1;

  return (
    <div
      data-testid="walkthrough-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[cp-fade-in_0.3s_ease-out_forwards]"
    >
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-3xl border border-white/10 shadow-[0_30px_100px_rgba(245,158,11,0.15)] overflow-hidden">
        {/* Skip button */}
        <button
          data-testid="walkthrough-close-btn"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 transition"
          aria-label="Close tour"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Visual pane */}
          <div className="relative h-64 md:h-96 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            <SceneVisual index={i} />
          </div>

          {/* Copy pane */}
          <div className="p-8 md:p-10 flex flex-col">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-mono font-bold w-fit mb-4 ${
              scene.accent === "emerald"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border border-amber-500/30 text-amber-300"
            }`}>
              <Icon className="w-3 h-3" /> {scene.label}
            </div>
            <h2 data-testid="walkthrough-title" className="font-heading font-bold text-3xl md:text-4xl leading-tight tracking-tight text-white mb-3">
              {scene.title}
            </h2>
            <p className="text-slate-400 text-base leading-relaxed mb-8">
              {scene.body}
            </p>

            {/* Progress dots */}
            <div className="flex items-center gap-2 mb-6">
              {SCENES.map((s, idx) => (
                <button
                  key={s.id}
                  data-testid={`walkthrough-dot-${idx}`}
                  onClick={() => setI(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === i
                      ? "w-8 bg-amber-400"
                      : idx < i
                        ? "w-4 bg-amber-500/60"
                        : "w-4 bg-white/15 hover:bg-white/25"
                  }`}
                  aria-label={`Go to scene ${idx + 1}`}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="mt-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  data-testid="walkthrough-play-btn"
                  onClick={() => setPlaying(p => !p)}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 transition"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  data-testid="walkthrough-prev-btn"
                  onClick={() => setI(p => Math.max(p - 1, 0))}
                  disabled={i === 0}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous scene"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
              {isLast ? (
                <Link
                  data-testid="walkthrough-cta-btn"
                  to="/login"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition"
                >
                  Try it now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  data-testid="walkthrough-next-btn"
                  onClick={() => setI(p => Math.min(p + 1, SCENES.length - 1))}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
