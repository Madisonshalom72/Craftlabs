import { LogoMark, LogoWordmark, LogoLockup } from "@/components/Logo";
import useSEO from "@/hooks/useSEO";

const PALETTE = [
  { name: "craft-graphite", hex: "#0B0F14", note: "Primary background surface" },
  { name: "craft-slate", hex: "#141B24", note: "Elevated surfaces, cards" },
  { name: "craft-fog", hex: "#94A3B8", note: "Muted text, subtle borders" },
  { name: "craft-ink", hex: "#E5E7EB", note: "Primary foreground on graphite" },
  { name: "craft-amber", hex: "#F59E0B", note: "Primary heat · CTAs, hover peaks" },
  { name: "craft-ember", hex: "#B45309", note: "Pressed / low-emphasis heat" },
  { name: "craft-lime", hex: "#B7FF3A", note: "Lab-lime · scan lines, active AI" },
  { name: "craft-cyan", hex: "#22D3EE", note: "Secondary scanline / diagnostic tags" },
];

const TYPE = [
  { label: "H1 · Hero", cls: "text-4xl sm:text-5xl lg:text-6xl font-heading font-bold tracking-tight" },
  { label: "H2 · Section", cls: "text-2xl md:text-3xl font-heading font-bold" },
  { label: "H3 · Card", cls: "text-lg md:text-xl font-heading font-semibold" },
  { label: "Body", cls: "text-base text-slate-300" },
  { label: "Meta · Mono", cls: "text-[10px] font-mono uppercase tracking-widest text-slate-500" },
];

export default function Brand() {
  useSEO({ title: "Brand Kit — Craft Master Labs", robots: "noindex,nofollow" });

  return (
    <div data-testid="brand-page" className="min-h-screen bg-craft-graphite text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-16 space-y-16">
        {/* Header */}
        <header>
          <div className="text-[10px] font-mono uppercase tracking-widest text-craft-lime mb-4">
            Brand Kit · v1
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold tracking-tight leading-none">
            Craft Master <span className="text-amber-400">Labs</span>
          </h1>
          <p className="mt-4 max-w-xl text-slate-400 leading-relaxed">
            Artisan meets lab. Amber is the action, lime is the signal, cyan is the label. Everything on this
            page is rendered live from <code className="text-craft-lime">tailwind.config.js</code> tokens.
          </p>
        </header>

        {/* Logo */}
        <section>
          <SectionTitle>Logo</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
            <BrandCard label="Mark · 96px">
              <LogoMark size={96} />
            </BrandCard>
            <BrandCard label="Wordmark">
              <LogoWordmark size={40} />
            </BrandCard>
            <BrandCard label="Lockup (navbar)">
              <LogoLockup size={44} />
            </BrandCard>
          </div>
          <div className="mt-5 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 items-center">
            {[16, 20, 24, 32, 48, 64, 96, 128].map((s) => (
              <div key={s} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex flex-col items-center gap-2">
                <LogoMark size={s} />
                <span className="text-[10px] font-mono text-slate-500">{s}px</span>
              </div>
            ))}
          </div>
        </section>

        {/* Palette */}
        <section>
          <SectionTitle>Palette</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {PALETTE.map((c) => (
              <div
                key={c.name}
                data-testid={`swatch-${c.name}`}
                className="rounded-2xl border border-white/10 overflow-hidden bg-craft-slate"
              >
                <div className="h-24" style={{ background: c.hex }} />
                <div className="p-3">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">{c.hex}</div>
                  <div className="text-xs text-slate-400 mt-2 leading-snug">{c.note}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Type */}
        <section>
          <SectionTitle>Typography</SectionTitle>
          <div className="mt-6 space-y-5 rounded-2xl border border-white/10 p-6 bg-craft-slate">
            {TYPE.map((t) => (
              <div key={t.label} className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                <div className="w-32 shrink-0 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  {t.label}
                </div>
                <div className={t.cls}>The chisel meets the circuit.</div>
              </div>
            ))}
          </div>
        </section>

        {/* Motion */}
        <section>
          <SectionTitle>Motion Tokens</SectionTitle>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <BrandCard label="animate-scanline">
              <div className="relative h-32 w-full rounded-xl overflow-hidden bg-craft-slate border border-white/10">
                <div className="absolute inset-x-0 h-6 bg-gradient-to-b from-craft-lime/0 via-craft-lime/60 to-craft-lime/0 animate-scanline" />
              </div>
            </BrandCard>
            <BrandCard label="animate-grid-pulse">
              <div
                className="h-32 w-full rounded-xl border border-white/10 bg-[linear-gradient(rgba(183,255,58,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(183,255,58,0.35)_1px,transparent_1px)] bg-[length:24px_24px] animate-grid-pulse"
              />
            </BrandCard>
          </div>
        </section>

        <footer className="pt-8 border-t border-white/10 text-[11px] font-mono uppercase tracking-widest text-slate-500">
          Preview only · internal
        </footer>
      </div>
    </div>
  );
}

const SectionTitle = ({ children }) => (
  <div className="flex items-baseline gap-3">
    <h2 className="text-2xl md:text-3xl font-heading font-bold">{children}</h2>
    <div className="h-px flex-1 bg-white/10" />
  </div>
);

const BrandCard = ({ label, children }) => (
  <div className="rounded-2xl border border-white/10 bg-craft-slate p-6 flex flex-col items-center justify-center gap-4 min-h-[160px]">
    {children}
    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
  </div>
);
