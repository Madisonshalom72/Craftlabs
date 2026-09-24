import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { http } from "@/lib/api";
import { Sparkles, Loader2, ArrowRight, Linkedin, ShieldCheck, Clock } from "lucide-react";

export default function AuthorPage() {
  const { editorId } = useParams();
  const [editor, setEditor] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    http.get(`/editors/${editorId}`)
      .then(r => setEditor(r.data))
      .catch(() => setNotFound(true));
  }, [editorId]);

  useEffect(() => {
    if (!editor) return;
    document.title = `${editor.name} · ${editor.title} · Handy Fix AI`;
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
    m.content = `${editor.name} — ${editor.credentials}. ${editor.bio}`.slice(0, 300);
    const existing = document.getElementById("author-jsonld");
    if (existing) existing.remove();
    const jsonld = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": editor.name,
      "jobTitle": editor.title,
      "description": editor.bio,
      "image": editor.picture,
      "knowsAbout": editor.expertise,
      "sameAs": editor.linkedin ? [editor.linkedin] : [],
      "worksFor": { "@type": "Organization", "name": "Handy Fix AI" },
    };
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "author-jsonld";
    s.textContent = JSON.stringify(jsonld);
    document.head.appendChild(s);
    return () => { document.title = "Handy Fix AI"; };
  }, [editor]);

  if (notFound) return (
    <div className="min-h-screen"><Navbar />
      <div className="max-w-3xl mx-auto px-5 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold">Editor not found</h1>
        <Link to="/blog" className="mt-6 inline-flex text-amber-400">← Back to guides</Link>
      </div>
    </div>
  );
  if (!editor) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="max-w-4xl mx-auto px-5 lg:px-8 pt-12 pb-8">
        <div className="glass rounded-3xl p-8">
          <div className="flex items-start gap-5 flex-wrap">
            <img src={editor.picture} alt={editor.name} className="w-28 h-28 rounded-3xl object-cover border-2 border-amber-500/40" />
            <div className="flex-1 min-w-0">
              <div className="ai-badge mb-2"><Sparkles className="w-3.5 h-3.5" /> Editorial Panel</div>
              <h1 data-testid="author-name" className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">{editor.name}</h1>
              <div className="text-amber-400 font-semibold mt-1">{editor.title}</div>
              <div className="text-xs font-mono uppercase tracking-widest text-slate-400 mt-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {editor.credentials}
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(editor.expertise || []).map(e => (
                  <span key={e} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">{e}</span>
                ))}
              </div>
              {editor.linkedin && (
                <a href={editor.linkedin} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition">
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
              )}
            </div>
          </div>
          <p className="mt-6 text-slate-200 leading-relaxed">{editor.bio}</p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-5 lg:px-8 py-8 pb-24">
        <h2 className="font-heading text-2xl font-bold tracking-tight mb-6">Guides {editor.name.split(" ")[0]} has contributed to</h2>
        {editor.articles.length === 0 ? (
          <div className="text-slate-500 text-sm">No articles yet.</div>
        ) : (
          <div className="space-y-3">
            {editor.articles.map(a => (
              <Link
                key={a.slug}
                to={`/blog/${a.slug}`}
                data-testid={`author-article-${a.slug}`}
                className="glass rounded-2xl p-5 flex items-start gap-3 hover:border-amber-500/40 transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="ai-badge">{a.category}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full ${a.role === "author" ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"}`}>
                      {a.role === "author" ? "author" : "reviewer"}
                    </span>
                  </div>
                  <h3 className="font-heading font-semibold text-base leading-tight group-hover:text-amber-400 transition line-clamp-2">{a.title}</h3>
                  {a.subtitle && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{a.subtitle}</p>}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
