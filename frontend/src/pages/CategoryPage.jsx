import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { http } from "@/lib/api";
import {
  Zap, Droplet, Wind, Hammer, Home, Radio, Wrench,
  PanelTop, DoorOpen, TrendingUp, Paintbrush, Grid3x3, Refrigerator, Fence, KeyRound,
  ArrowRight, Star, MapPin, ShieldCheck, ScanEye, Sparkles, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";

const ICONS = {
  Zap, Droplet, Wind, Hammer, Home, Radio, Wrench,
  PanelTop, DoorOpen, TrendingUp, Paintbrush, Grid3x3, Refrigerator, Fence, KeyRound,
};

export default function CategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    http.get(`/categories/${slug}`)
      .then(r => setData(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // SEO: dynamic title + meta description
  useEffect(() => {
    if (!data) return;
    const kicker = data.hero_kicker || data.category?.name;
    const title = `${data.hero_title || data.category?.name} · CraftPulse AI`;
    document.title = title;
    const desc = `${data.hero_sub || ""} ${data.total_pros || 0} vetted craftsmen · avg $${data.avg_hourly_rate}/hr · ${data.avg_rating}★. AI diagnosis, escrow-backed booking.`.trim();
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = desc.slice(0, 300);
    let k = document.querySelector('meta[name="keywords"]');
    if (!k) { k = document.createElement("meta"); k.name = "keywords"; document.head.appendChild(k); }
    k.content = (data.keywords || []).join(", ");
    // JSON-LD structured data for Google
    const existing = document.getElementById("cat-jsonld");
    if (existing) existing.remove();
    const jsonld = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": data.hero_title,
      "description": desc,
      "provider": { "@type": "Organization", "name": "CraftPulse AI" },
      "areaServed": { "@type": "City", "name": "New York" },
      "aggregateRating": data.total_pros ? {
        "@type": "AggregateRating",
        "ratingValue": data.avg_rating,
        "reviewCount": Math.max(data.total_pros * 40, 100),
      } : undefined,
    };
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "cat-jsonld";
    s.textContent = JSON.stringify(jsonld);
    document.head.appendChild(s);
    return () => { document.title = "CraftPulse AI"; };
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen"><Navbar /><div className="pt-40 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div></div>
    );
  }
  if (notFound || !data) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="max-w-3xl mx-auto px-5 py-24 text-center">
          <h1 className="font-heading text-3xl font-bold">Service not found</h1>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-amber-400">← Back home</Link>
        </div>
      </div>
    );
  }

  const Icon = ICONS[data.category?.icon] || Wrench;

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-5 lg:px-8 pt-6">
        <nav data-testid="breadcrumbs" className="text-xs font-mono uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Link to="/" className="hover:text-amber-400 transition">Home</Link>
          <span>/</span>
          <Link to="/#services" className="hover:text-amber-400 transition">Services</Link>
          <span>/</span>
          <span className="text-slate-300">{data.category.name}</span>
        </nav>
      </div>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-10 lg:pt-14 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="ai-badge mb-5 inline-flex">
              <Icon className="w-3.5 h-3.5" /> {data.hero_kicker || data.category.name}
            </div>
            <h1 data-testid="category-hero-title" className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
              {data.hero_title || data.category.name}
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-slate-400 leading-relaxed">
              {data.hero_sub}
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
              <StatCard label="Pros" value={data.total_pros} />
              <StatCard label="Avg Rate" value={`$${data.avg_hourly_rate}`} suffix="/hr" />
              <StatCard label="Rating" value={data.avg_rating} icon={<Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />} />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                data-testid="category-cta-post"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition amber-glow"
              >
                Diagnose {data.category.name} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={`/blog/${slug}`}
                data-testid="category-blog-link"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/12 hover:border-amber-500/40 text-slate-100 font-semibold transition"
              >
                Read the expert guide
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 items-center text-xs font-mono uppercase tracking-widest text-slate-500">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Escrow protected</div>
              <div className="flex items-center gap-2"><ScanEye className="w-4 h-4 text-cyan-400" /> AI diagnosis</div>
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> NYC vetted</div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
              <div className="glass rounded-3xl p-6 relative">
                <div className="ai-badge mb-3"><Sparkles className="w-3 h-3" /> AI Match Preview</div>
                <h3 className="font-heading text-xl font-bold mb-4">Popular {data.category.name} services</h3>
                <div className="flex flex-wrap gap-2">
                  {(data.keywords || []).map(k => (
                    <span key={k} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-mono">{k}</span>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/8">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Response time</div>
                  <div className="font-heading text-3xl font-bold text-emerald-400">&lt; 4h</div>
                  <div className="text-xs text-slate-400 mt-1">Average dispatch after AI match confirmation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TOP PROS */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-14">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
          <div>
            <div className="ai-badge mb-3">Top-rated · Verified</div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Top 3 {data.category.name} pros in NYC
            </h2>
          </div>
          <Link to="/login" className="hidden sm:inline text-sm text-amber-400 hover:text-amber-300 font-medium">See all →</Link>
        </div>

        {data.top_pros.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-slate-400">
            No specialists in this niche yet. New pros are onboarding weekly.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {data.top_pros.map((p, i) => (
              <div key={p.user_id} data-testid={`top-pro-${p.user_id}`} className="glass rounded-2xl p-6 hover:border-amber-500/40 transition relative">
                <div className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">#0{i+1}</div>
                <img src={p.picture} alt={p.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 mb-4" />
                <div className="font-heading font-bold text-lg">{p.name}</div>
                <div className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">{p.role_title}</div>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {p.rating}</span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-amber-400">${p.hourly_rate}/hr</span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-cyan-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.distance_miles}mi</span>
                </div>
                <p className="text-xs text-slate-400 mt-3 line-clamp-3">{p.bio}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(p.skills || []).slice(0, 3).map(s => (
                    <span key={s} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 border border-white/8 text-slate-300">{s}</span>
                  ))}
                </div>
                <Link to="/login" className="mt-5 inline-flex w-full items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-semibold transition">
                  Book {p.name.split(" ")[0]}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-14">
        <div className="ai-badge mb-3">Workflow</div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-10">
          How CraftPulse handles {data.category.name.toLowerCase()} jobs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { n: "01", t: "Snap the problem", d: `Upload a photo of the ${data.category.name.toLowerCase()} issue. Claude Vision returns the diagnosis, severity, parts, and a price range in seconds.` },
            { n: "02", t: "AI ranks the pros", d: `Our matching engine ranks NYC ${data.category.name.toLowerCase()} craftsmen by skill fit, rating, distance, and rate. Pick who works on your home.` },
            { n: "03", t: "Book with escrow", d: `Pay via Stripe with funds held in escrow until the job is verified complete. Your ${data.category.name.toLowerCase()} pro gets paid fast, you stay protected.` },
          ].map(s => (
            <div key={s.n} className="glass rounded-2xl p-6 hover:border-amber-500/30 transition">
              <span className="font-mono text-xs uppercase tracking-widest text-slate-500">{s.n}</span>
              <h3 className="font-heading text-xl font-semibold mt-2 mb-2">{s.t}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      {(data.faq || []).length > 0 && (
        <section className="max-w-4xl mx-auto px-5 lg:px-8 py-14">
          <div className="ai-badge mb-3">FAQ</div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-8">
            Common questions about {data.category.name.toLowerCase()}
          </h2>
          <div className="space-y-3">
            {data.faq.map((f, i) => (
              <div key={i} data-testid={`faq-${i}`} className="glass rounded-2xl overflow-hidden">
                <button
                  data-testid={`faq-toggle-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="w-full flex items-center justify-between text-left p-5 hover:bg-white/2 transition"
                >
                  <span className="font-heading font-semibold pr-4">{f.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-amber-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed border-t border-white/8 pt-4">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="glass rounded-3xl p-10 lg:p-14 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <h2 className="font-heading text-3xl lg:text-5xl font-extrabold tracking-tight max-w-2xl">
              Fix your {data.category.name.toLowerCase()} today.
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl">
              Upload a photo, get an AI diagnosis and quote in under a minute. Meet your craftsman by tomorrow.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition amber-glow"
            >
              Start Diagnosis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 py-8">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-mono uppercase tracking-widest">
          <span>© 2026 CraftPulse AI · {data.category.name} Marketplace</span>
          <Link to="/" className="hover:text-amber-400 transition">All services →</Link>
        </div>
      </footer>
    </div>
  );
}

const StatCard = ({ label, value, suffix, icon }) => (
  <div className="glass rounded-xl p-3">
    <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1">{label}</div>
    <div className="font-heading text-xl font-bold flex items-center gap-1">
      {icon}{value}{suffix && <span className="text-sm text-slate-400 font-medium">{suffix}</span>}
    </div>
  </div>
);
