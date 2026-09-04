import { Link } from "react-router-dom";
import { ShieldCheck, Sparkles, Linkedin } from "lucide-react";

/** Compact byline block shown near the top of an article. */
export function BylineCompact({ byline }) {
  if (!byline?.author) return null;
  const { author, reviewer } = byline;
  return (
    <div data-testid="byline-compact" className="mt-6 flex items-center gap-3 flex-wrap">
      <Link
        to={`/authors/${author.id}`}
        data-testid={`author-link-${author.id}`}
        className="flex items-center gap-3 group"
      >
        <img
          src={author.picture}
          alt={author.name}
          className="w-11 h-11 rounded-full object-cover border-2 border-amber-500/40"
        />
        <div className="leading-tight">
          <div className="font-heading font-semibold text-sm text-slate-100 group-hover:text-amber-400 transition">
            {author.name}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            {author.title}
          </div>
        </div>
      </Link>
      {reviewer && (
        <div className="flex items-center gap-2 pl-3 border-l border-white/8 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Reviewed by</span>
          <Link to={`/authors/${reviewer.id}`} className="text-emerald-400 hover:text-emerald-300 font-medium">
            {reviewer.name}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Full author bio card shown at the bottom of an article. */
export function AuthorCard({ author, role = "Written by" }) {
  if (!author) return null;
  return (
    <div data-testid={`author-card-${author.id}`} className="glass rounded-3xl p-6">
      <div className="flex items-start gap-4">
        <img
          src={author.picture}
          alt={author.name}
          className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/40 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">{role}</div>
          <Link to={`/authors/${author.id}`} className="font-heading font-bold text-lg text-slate-100 hover:text-amber-400 transition">
            {author.name}
          </Link>
          <div className="text-xs text-amber-400 mt-0.5">{author.title}</div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mt-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />{author.credentials}
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-300 leading-relaxed">{author.bio}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(author.expertise || []).map(e => (
          <span key={e} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">{e}</span>
        ))}
      </div>
      {author.linkedin && (
        <a href={author.linkedin} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition">
          <Linkedin className="w-3.5 h-3.5" /> LinkedIn
        </a>
      )}
    </div>
  );
}
