import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { http } from "@/lib/api";
import { BookOpen, Clock, ArrowRight, Sparkles, Loader2 } from "lucide-react";

export default function BlogIndex() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Field Notes · Craft Master Labs Expert Guides";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = "AI-written expert guides for NYC homeowners: electrical, plumbing, HVAC, windows, doors, stairs, and more. Spot bad installs, know what to pay, hire smarter.";
    http.get("/blog").then(r => { setArticles(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="max-w-7xl mx-auto px-5 lg:px-8 pt-14 pb-8">
        <div className="ai-badge mb-4"><BookOpen className="w-3.5 h-3.5" /> Field Notes</div>
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
          Expert guides,<br />
          <span className="text-amber-400">written by AI</span>,<br />
          <span className="text-slate-300 text-3xl sm:text-4xl lg:text-5xl font-semibold">edited by 15-year veterans.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-400">
          One long-form guide per niche. Spot bad installs before they void your warranty. Know exactly what to pay. Hire the pro your neighbor wishes they had.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-5 lg:px-8 py-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map(a => (
            <Link
              to={`/blog/${a.slug}`}
              key={a.slug}
              data-testid={`article-card-${a.slug}`}
              className="glass rounded-2xl p-6 hover:border-amber-500/40 hover:-translate-y-0.5 transition group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="ai-badge">{a.category}</span>
                <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                  <Clock className="w-3 h-3" /> {a.reading_time_min}min
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold leading-tight mb-2 group-hover:text-amber-400 transition line-clamp-3 min-h-[72px]">
                {a.title}
              </h3>
              {a.subtitle && (
                <p className="text-sm text-slate-400 line-clamp-2 mb-3">{a.subtitle}</p>
              )}
              <div className="flex items-center gap-2 mt-4 text-xs font-mono uppercase tracking-widest">
                {a.status === "ready" ? (
                  <span className="text-emerald-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> ready</span>
                ) : a.status === "generating" ? (
                  <span className="text-amber-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> drafting…</span>
                ) : (
                  <span className="text-slate-500">tap to generate</span>
                )}
                <span className="ml-auto text-amber-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
