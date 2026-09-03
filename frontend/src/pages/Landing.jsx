import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { http } from "@/lib/api";
import {
  ArrowRight, Zap, Droplet, Wind, Hammer, Home, Radio, Wrench,
  ScanEye, Sparkles, ShieldCheck, Star, MapPin, Clock,
} from "lucide-react";

const CATEGORY_ICONS = { Zap, Droplet, Wind, Hammer, Home, Radio, Wrench };

export default function Landing() {
  const [handymen, setHandymen] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    http.get("/handymen").then(r => setHandymen(r.data.slice(0, 4)));
    http.get("/categories").then(r => setCategories(r.data));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-14 lg:pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <span className="ai-badge mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Claude Sonnet · Vision · Match
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Fix your home in
              <span className="block mt-1">
                <span className="text-amber-400">one photo.</span>
              </span>
              <span className="block text-slate-300 font-semibold text-3xl sm:text-4xl lg:text-5xl mt-2">
                AI does the rest.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base sm:text-lg text-slate-400 leading-relaxed">
              Snap a picture of what&rsquo;s broken. CraftPulse AI diagnoses the issue, prices the
              repair, and matches you with a vetted craftsman in seconds &mdash; with escrow-backed
              payments and licensed pros.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                data-testid="hero-cta-post-job"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition amber-glow"
              >
                Diagnose a Repair <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                data-testid="hero-cta-handyman"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/12 hover:border-amber-500/40 text-slate-100 font-semibold transition"
              >
                Join as a Craftsman
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 items-center text-xs font-mono uppercase tracking-widest text-slate-500">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Escrow protected</div>
              <div className="flex items-center gap-2"><ScanEye className="w-4 h-4 text-cyan-400" /> Vision AI diagnosis</div>
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> Neural matching</div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
              <div className="glass rounded-3xl p-4 relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80"
                  alt="Craftsman at work"
                  className="w-full h-72 sm:h-96 object-cover rounded-2xl"
                />
                <div className="absolute top-8 left-8 glass rounded-xl px-3 py-2 flex items-center gap-2 pulse-amber">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span className="font-mono text-xs uppercase tracking-widest">Live · scanning</span>
                </div>
                <div className="absolute bottom-8 right-8 glass rounded-xl p-4 max-w-[220px]">
                  <div className="ai-badge mb-2">Vision AI</div>
                  <div className="text-sm font-semibold text-white leading-tight">Loose junction box · Electrical</div>
                  <div className="text-xs text-slate-400 mt-1">Est. <span className="text-amber-400 font-mono">$120 – $180</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="ai-badge mb-3">Services</div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Every trade. One marketplace.
            </h2>
          </div>
          <Link to="/login" className="hidden sm:inline text-sm text-amber-400 hover:text-amber-300 font-medium">Browse craftsmen →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {categories.map(c => {
            const Icon = CATEGORY_ICONS[c.icon] || Wrench;
            return (
              <div
                key={c.id}
                data-testid={`category-${c.id}`}
                className="glass rounded-2xl p-4 flex flex-col items-start gap-3 hover:border-amber-500/40 transition cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/20 transition">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                <div className="text-sm font-semibold text-slate-100">{c.name}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="ai-badge mb-3">Workflow</div>
        <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-10">
          Three steps. Zero guesswork.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { n: "01", t: "Snap & Diagnose", d: "Upload a photo of the broken item. Claude Vision returns issue, severity, parts, and a price range in seconds.", i: <ScanEye className="w-6 h-6 text-amber-400" /> },
            { n: "02", t: "Neural Match", d: "Our matching engine ranks craftsmen by skill fit, rating, distance, and rate. You pick who works on your home.", i: <Sparkles className="w-6 h-6 text-cyan-400" /> },
            { n: "03", t: "Escrow Checkout", d: "Book via Stripe with funds held in escrow until the work is verified complete. Craftsmen get paid fast, you stay protected.", i: <ShieldCheck className="w-6 h-6 text-emerald-400" /> },
          ].map(s => (
            <div key={s.n} className="glass rounded-2xl p-6 hover:border-amber-500/30 transition">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs uppercase tracking-widest text-slate-500">{s.n}</span>
                {s.i}
              </div>
              <h3 className="font-heading text-xl font-semibold mb-2">{s.t}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TOP CRAFTSMEN */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="ai-badge mb-3">Guild</div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Top-rated craftsmen this week
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {handymen.map(h => (
            <div key={h.user_id} data-testid={`craftsman-${h.user_id}`} className="glass rounded-2xl p-5 hover:border-amber-500/40 transition">
              <div className="flex items-start gap-3 mb-3">
                <img src={h.picture} alt="" className="w-14 h-14 rounded-xl object-cover border border-amber-500/30" />
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-semibold text-base leading-tight truncate">{h.name}</div>
                  <div className="text-xs text-slate-400 line-clamp-2 mt-1">{h.role_title}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 mb-3">
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {h.rating}</span>
                <span className="text-slate-500">·</span>
                <span className="font-mono text-amber-400">${h.hourly_rate}/hr</span>
                <span className="text-slate-500">·</span>
                <span className="flex items-center gap-1 text-slate-400"><Clock className="w-3.5 h-3.5" />{h.years_experience}y</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(h.skills || []).slice(0, 3).map(s => (
                  <span key={s} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 border border-white/8 text-slate-300">{s}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
                <MapPin className="w-3.5 h-3.5" />{h.service_area}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20">
        <div className="glass rounded-3xl p-10 lg:p-14 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <h2 className="font-heading text-3xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
              Ready to fix that thing you&rsquo;ve been staring at?
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl">
              Post your first job in under 60 seconds. AI diagnoses. AI prices. Humans deliver.
            </p>
            <Link
              to="/login"
              data-testid="cta-bottom-post-job"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition amber-glow"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 py-8">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-mono uppercase tracking-widest">
          <span>© 2026 CraftPulse AI · Guild Marketplace</span>
          <span>Made with tools, not templates.</span>
        </div>
      </footer>
    </div>
  );
}
