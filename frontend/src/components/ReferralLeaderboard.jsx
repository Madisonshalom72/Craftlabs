import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { http } from "@/lib/api";
import { Trophy, Crown, Medal, Gift, ArrowRight, Sparkles } from "lucide-react";

function rankAdornment(rank) {
  if (rank === 1) return { icon: Crown, tone: "text-amber-300", bg: "bg-amber-500/15 border-amber-500/40", label: "1st" };
  if (rank === 2) return { icon: Trophy, tone: "text-slate-200", bg: "bg-slate-400/15 border-slate-400/40", label: "2nd" };
  if (rank === 3) return { icon: Medal, tone: "text-orange-300", bg: "bg-orange-500/15 border-orange-500/40", label: "3rd" };
  return { icon: null, tone: "text-slate-400", bg: "bg-white/5 border-white/10", label: `${rank}th` };
}

function fmtCents(c) {
  return `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function ReferralLeaderboard() {
  const [rows, setRows] = useState(null);
  const [reward, setReward] = useState(2500);

  useEffect(() => {
    http.get("/referrals/leaderboard").then(r => {
      setRows(r.data.leaderboard || []);
      setReward(r.data.reward_cents_per_referral || 2500);
    }).catch(() => setRows([]));
  }, []);

  return (
    <section data-testid="referral-leaderboard" className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Copy pane */}
        <div className="lg:col-span-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs uppercase tracking-widest font-mono mb-4">
            <Trophy className="w-3.5 h-3.5" /> Community leaderboard
          </div>
          <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
            Refer friends,<br />
            <span className="text-amber-400">climb the ranks.</span>
          </h2>
          <p className="mt-4 text-slate-400 max-w-md leading-relaxed">
            Every friend that books their first paid job with your link earns you both <span className="text-amber-300 font-semibold">${(reward/100).toFixed(0)}</span> credit. The top ten sharers of all time are shown here — will you break in?
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/login"
              data-testid="leaderboard-cta-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition"
            >
              <Gift className="w-4 h-4" /> Get your referral link
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Anti-abuse: unique email · payment method · cap 10/mo
          </div>
        </div>

        {/* Leaderboard pane */}
        <div className="lg:col-span-7">
          <div className="glass rounded-3xl p-5 sm:p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Top referrers · all time</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">${(reward/100).toFixed(0)} per referral</div>
            </div>
            {rows === null ? (
              <div className="py-10 text-center text-slate-500 text-sm">Loading…</div>
            ) : rows.length === 0 ? (
              <div data-testid="leaderboard-empty" className="py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto mb-4 flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-amber-400" />
                </div>
                <div className="font-heading font-bold text-xl text-white mb-1">Be the first.</div>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                  No one has topped the leaderboard yet. Sign up, grab your link, and you&apos;ll own the #1 spot.
                </p>
                <Link
                  to="/login"
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300"
                >
                  Claim #1 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => {
                  const ad = rankAdornment(r.rank);
                  const Icon = ad.icon;
                  return (
                    <li
                      key={r.rank}
                      data-testid={`leaderboard-row-${r.rank}`}
                      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border ${ad.bg} transition hover:translate-x-0.5`}
                    >
                      <div className={`shrink-0 w-9 sm:w-10 flex items-center justify-center font-heading font-bold text-lg ${ad.tone}`}>
                        {Icon ? <Icon className="w-5 h-5" /> : ad.label}
                      </div>
                      <div className="relative shrink-0">
                        {r.picture ? (
                          <img
                            src={r.picture}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover border-2 border-white/10"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-900 font-bold">
                            {r.display_name.charAt(0)}
                          </div>
                        )}
                        {r.rank <= 3 && (
                          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${ad.bg} border-2 border-slate-900 flex items-center justify-center`}>
                            <span className={`text-[9px] font-bold ${ad.tone}`}>{r.rank}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm sm:text-base truncate">{r.display_name}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{r.role}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-heading font-bold text-lg text-amber-300 leading-none">{r.count}</div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">referrals</div>
                      </div>
                      <div className="hidden sm:block text-right shrink-0 border-l border-white/8 pl-4">
                        <div className="text-sm font-semibold text-emerald-400">{fmtCents(r.total_reward_cents)}</div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">earned</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
