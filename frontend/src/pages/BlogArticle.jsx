import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { http } from "@/lib/api";
import {
  Loader2, ArrowRight, Clock, Sparkles, ChevronRight, BookOpen, CheckCircle2,
} from "lucide-react";

const CATEGORY_HERO = {
  electrical:  "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1600&q=80",
  plumbing:    "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1600&q=80",
  hvac:        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80",
  carpentry:   "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1600&q=80",
  roofing:     "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&q=80",
  smart_home:  "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1600&q=80",
  windows:     "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
  doors:       "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1600&q=80",
  stairs:      "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=1600&q=80",
  painting:    "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1600&q=80",
  tiling:      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
  appliance:   "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80",
  deck_fence:  "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1600&q=80",
  locksmith:   "https://images.unsplash.com/photo-1622432088523-3d4ed4dc5f26?auto=format&fit=crop&w=1600&q=80",
  general:     "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1600&q=80",
};

export default function BlogArticle() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [status, setStatus] = useState("loading");
  const [pollN, setPollN] = useState(0);

  useEffect(() => {
    setArticle(null);
    setStatus("loading");
    setPollN(0);
    let cancelled = false;
    let timeout;

    const fetchOnce = async () => {
      try {
        const { data } = await http.get(`/blog/${slug}`);
        if (cancelled) return;
        if (data?.status === "ready" || data?.title) {
          setArticle(data);
          setStatus("ready");
          return;
        }
        if (data?.status === "generating") {
          setStatus("generating");
          setPollN(n => n + 1);
          timeout = setTimeout(fetchOnce, 3500);
          return;
        }
        setStatus("error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    fetchOnce();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [slug]);

  // SEO metadata
  useEffect(() => {
    if (!article) return;
    document.title = `${article.title} · CraftPulse AI`;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = (article.meta_description || article.subtitle || "").slice(0, 300);
    let k = document.querySelector('meta[name="keywords"]');
    if (!k) { k = document.createElement("meta"); k.name = "keywords"; document.head.appendChild(k); }
    k.content = (article.keywords || []).join(", ");
    const existing = document.getElementById("blog-jsonld");
    if (existing) existing.remove();
    const jsonld = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": article.title,
      "description": article.meta_description,
      "author": { "@type": "Organization", "name": "CraftPulse AI" },
      "datePublished": article.created_at,
      "publisher": { "@type": "Organization", "name": "CraftPulse AI" },
      "keywords": (article.keywords || []).join(", "),
    };
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "blog-jsonld";
    s.textContent = JSON.stringify(jsonld);
    document.head.appendChild(s);
    return () => { document.title = "CraftPulse AI"; };
  }, [article]);

  if (status === "loading" || status === "generating") {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="max-w-3xl mx-auto px-5 py-24 text-center">
          <div className="glass rounded-3xl p-12">
            <BookOpen className="w-10 h-10 mx-auto mb-4 text-amber-400" />
            <div className="ai-badge mb-3 inline-flex"><Sparkles className="w-3 h-3" /> Claude Sonnet</div>
            <h1 className="font-heading text-2xl font-bold mb-3">Drafting your expert guide…</h1>
            <p className="text-slate-400 text-sm mb-6">Our AI editor is writing a fresh long-form article for this niche. This takes about 30-60 seconds. Grab a coffee.</p>
            <div className="max-w-xs mx-auto space-y-2">
              <div className="h-2 rounded shimmer bg-white/5" />
              <div className="h-2 rounded shimmer bg-white/5 w-4/5" />
              <div className="h-2 rounded shimmer bg-white/5 w-2/3" />
            </div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mt-6">
              polling {pollN}× · caches forever after first render
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error" || !article) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="max-w-3xl mx-auto px-5 py-24 text-center">
          <h1 className="font-heading text-2xl font-bold">Article couldn't load</h1>
          <Link to="/blog" className="mt-6 inline-flex text-amber-400">← Back to guides</Link>
        </div>
      </div>
    );
  }

  const hero = CATEGORY_HERO[slug] || CATEGORY_HERO.general;

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Breadcrumbs */}
      <div className="max-w-4xl mx-auto px-5 lg:px-8 pt-6">
        <nav data-testid="breadcrumbs" className="text-xs font-mono uppercase tracking-widest text-slate-500 flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-amber-400 transition">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/blog" className="hover:text-amber-400 transition">Field Notes</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-300">{article.category}</span>
        </nav>
      </div>

      {/* HERO */}
      <article className="max-w-4xl mx-auto px-5 lg:px-8 pt-8 pb-16">
        <div className="ai-badge mb-4 inline-flex"><BookOpen className="w-3.5 h-3.5" /> {article.category} · Expert Guide</div>
        <h1 data-testid="blog-title" className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]">
          {article.title}
        </h1>
        <p className="mt-5 text-lg text-slate-300 leading-relaxed">
          {article.subtitle}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-mono uppercase tracking-widest text-slate-500">
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {article.reading_time_min} min read</span>
          <span>·</span>
          <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Written with Claude Sonnet</span>
          {article.created_at && (<><span>·</span><span>{new Date(article.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></>)}
        </div>

        {/* Hero image */}
        <div className="mt-8 rounded-3xl overflow-hidden border border-white/10">
          <img src={hero} alt={article.title} className="w-full h-64 sm:h-80 object-cover" />
        </div>

        {/* Intro */}
        <div data-testid="blog-intro" className="mt-10 text-lg leading-relaxed text-slate-200 space-y-4">
          {(article.intro || "").split(/\n\n+/).filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* Sections */}
        <div className="mt-12 space-y-12">
          {(article.sections || []).map((s, i) => (
            <section key={i} data-testid={`section-${i}`}>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 mb-4">
                {i + 1}. {s.heading}
              </h2>
              <div className="text-slate-300 leading-relaxed space-y-4">
                {(s.body || "").split(/\n\n+/).filter(Boolean).map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Key Takeaways */}
        {(article.key_takeaways || []).length > 0 && (
          <div className="mt-12 glass rounded-3xl p-7">
            <div className="ai-badge mb-3 inline-flex"><CheckCircle2 className="w-3.5 h-3.5" /> Key takeaways</div>
            <h3 className="font-heading text-xl font-bold mb-4">TL;DR</h3>
            <ul className="space-y-3">
              {article.key_takeaways.map((t, i) => (
                <li key={i} data-testid={`takeaway-${i}`} className="flex items-start gap-3 text-slate-200">
                  <div className="w-6 h-6 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xs font-mono flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FAQ */}
        {(article.faq || []).length > 0 && (
          <section className="mt-12">
            <h2 className="font-heading text-2xl font-bold tracking-tight mb-5">FAQ</h2>
            <div className="space-y-3">
              {article.faq.map((f, i) => (
                <div key={i} className="glass rounded-2xl p-5">
                  <h4 className="font-heading font-semibold text-lg mb-2">{f.q}</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <div className="mt-14 glass rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <div className="ai-badge mb-3 inline-flex">Ready to book</div>
            <h3 className="font-heading text-xl sm:text-2xl font-bold mb-3">{article.cta_line}</h3>
            <div className="flex flex-wrap gap-3 mt-4">
              <Link
                to={`/services/${slug}`}
                data-testid="blog-cta-services"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition"
              >
                See top {article.category} pros <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                data-testid="blog-cta-login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/12 hover:border-amber-500/40 text-slate-100 font-semibold transition"
              >
                Diagnose your issue
              </Link>
            </div>
          </div>
        </div>
      </article>

      <footer className="border-t border-white/8 py-8">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 font-mono uppercase tracking-widest">
          <span>© 2026 CraftPulse AI · Field Notes</span>
          <Link to="/blog" className="hover:text-amber-400 transition">More guides →</Link>
        </div>
      </footer>
    </div>
  );
}
