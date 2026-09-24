import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { http } from "@/lib/api";
import { Trophy, Crown, Medal, Gift, ArrowRight, Sparkles, Flame, CalendarClock } from "lucide-react";

function rankAdornment(rank) {
  if (rank === 1) return { icon: Crown, tone: "text-amber-300", bg: "bg-amber-500/15 border-amber-500/40", label: "1st" };
  if (rank === 2) return { icon: Trophy, tone: "text-slate-200", bg: "bg-slate-400/15 border-slate-400/40", label: "2nd" };
  if (rank === 3) return { icon: Medal, tone: "text-orange-300", bg: "bg-orange-500/15 border-orange-500/40", label: "3rd" };
  return { icon: null, tone: "text-slate-400", bg: "bg-white/5 border-white/10", label: `${rank}th` };
}

function fmtCents(c) {
  return `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function useCountdown(endIso) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!endIso) { setRemaining(""); return; }
    const tick = () => {
      const diff = new Date(endIso).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Resetting…"); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      if (days >= 1) setRemaining(`Resets in ${days}d ${hours}h`);
      else {
        const mins = Math.floor((diff % 3600000) / 60000);
        setRemaining(`Resets in ${hours}h ${mins}m`);
      }
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [endIso]);
  return remaining;
}

export default function ReferralLeaderboard() {
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState({ monthly: null, all_time: null });
  const [reward, setReward] = useState(2500);
  const [seasonEnd, setSeasonEnd] = useState(null);
  const countdown = useCountdown(seasonEnd);

  useEffect(() => {
    if (data[period] !== null) return;
    http.get(`/referrals/leaderboard?period=${period}`).then(r => {
      setData(prev => ({ ...prev, [period]: r.data.leaderboard || [] }));
      setReward(r.data.reward_cents_per_referral || 2500);
      if (period === "monthly" && r.data.season_end) setSeasonEnd(r.data.season_end);
    }).catch(() => setData(prev => ({ ...prev, [period]: [] })));
  }, [period, data]);

  const rows = data[period];
  const isMonthly = period === "monthly";

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
            Every friend that books their first paid job with your link earns you both <span className="text-amber-300 font-semibold">${(reward/100).toFixed(0)}</span> credit. Monthly seasons reset on the 1st — fresh chances for newcomers, glory for veterans.
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
            {/* Tabs */}
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div
                role="tablist"
                aria-label="Leaderboard period"
                className="inline-flex p-1 rounded-full bg-slate-900/60 border border-white/10"
              >
                <button
                  role="tab"
                  aria-selected={isMonthly}
                  data-testid="leaderboard-tab-monthly"
                  onClick={() => setPeriod("monthly")}
                  className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-widest font-mono rounded-full transition inline-flex items-center gap-1.5 ${
                    isMonthly ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" /> This month
                </button>
                <button
                  role="tab"
                  aria-selected={!isMonthly}
                  data-testid="leaderboard-tab-all-time"
                  onClick={() => setPeriod("all_time")}
                  className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-widest font-mono rounded-full transition inline-flex items-center gap-1.5 ${
                    !isMonthly ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" /> All-time
                </button>
              </div>
              <div className="flex items-center gap-3">
                {isMonthly && countdown && (
                  <div
                    data-testid="leaderboard-countdown"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono uppercase tracking-widest"
                  >
                    <CalendarClock className="w-3 h-3" /> {countdown}
                  </div>
                )}
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">${(reward/100).toFixed(0)} per referral</div>
              </div>
            </div>

            {rows === null ? (
              <div className="py-10 text-center text-slate-500 text-sm">Loading…</div>
            ) : rows.length === 0 ? (
              <div data-testid="leaderboard-empty" className="py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto mb-4 flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-amber-400" />
                </div>
                <div className="font-heading font-bold text-xl text-white mb-1">
                  {isMonthly ? "New season, wide open." : "Be the first."}
                </div>
                <p className="text-sm text-slate-400 max-w-xs mx-auto">
                  {isMonthly
                    ? "No referrals yet this month. Grab your link now and own the top spot before anyone else shows up."
                    : "No one has topped the leaderboard yet. Sign up, grab your link, and you'll own the #1 spot."}
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
