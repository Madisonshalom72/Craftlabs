import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Zap, CheckCircle2, Radio, Sparkles, ShieldCheck, ArrowRight, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";

const BENEFITS = [
  { icon: Radio, title: "Live lead alerts", body: "Real-time SSE + push notifications the second a matching job posts in your area." },
  { icon: Sparkles, title: "Neural smart-match priority", body: "Your profile ranks higher in the AI's ranked results for every new job in your skill set." },
  { icon: ShieldCheck, title: "Verified badge", body: "Your license-verified badge stays live and visible on every profile card and match." },
  { icon: Zap, title: "Instant job acceptance", body: "One-tap accept on any matched lead — no bidding, no waiting on customers to pick." },
];

export default function HandymanPro() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && user && user.role !== "handyman") navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    http.get("/subscriptions/me").then(r => setSub(r.data)).catch(() => {});
  }, [user]);

  const startTrial = async () => {
    setBusy(true);
    try {
      const { data } = await http.post("/subscriptions/checkout", {
        origin_url: window.location.origin,
      });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to start trial");
      setBusy(false);
    }
  };

  const openPortal = async () => {
    setBusy(true);
    try {
      const { data } = await http.post("/subscriptions/portal", {
        origin_url: window.location.origin,
      });
      window.location.href = data.portal_url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Portal unavailable");
      setBusy(false);
    }
  };

  const isActive = sub?.is_active;
  const s = sub?.subscription;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-14">
        <div data-testid="pro-hero" className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs uppercase tracking-widest font-mono mb-6">
            <Crown className="w-3.5 h-3.5" /> Handyman Pro
          </div>
          <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-5">
            Get every lead the second<br />it hits the grid.
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Try Pro for 7 days for just <span className="text-amber-400 font-semibold">$1</span>. After that,
            it&apos;s $49/mo — cancel anytime, no lock-in.
          </p>
        </div>

        {isActive && (
          <div data-testid="pro-active-banner" className="mb-10 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-heading font-bold text-lg">You&apos;re on Pro</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono uppercase">
                  {s?.status || "active"}
                </span>
              </div>
              {s?.trial_end && s?.status === "trialing" && (
                <p className="text-sm text-slate-400">
                  Trial ends {new Date(s.trial_end * 1000).toLocaleDateString()} — you&apos;ll auto-renew at $49/mo.
                </p>
              )}
              {s?.status === "past_due" && (
                <p className="text-sm text-amber-300">Your last payment failed. Update your card in the portal.</p>
              )}
            </div>
            <button
              data-testid="pro-manage-btn"
              onClick={openPortal}
              disabled={busy}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-slate-100 font-semibold text-sm inline-flex items-center gap-2 transition"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Manage subscription
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {BENEFITS.map(b => (
            <div key={b.title} data-testid={`pro-benefit-${b.title.toLowerCase().replace(/\s+/g, "-")}`} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
              <b.icon className="w-6 h-6 text-amber-400 mb-3" />
              <h3 className="font-heading font-bold text-lg mb-1">{b.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        <div className="p-8 rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/5 to-transparent border border-amber-500/30 text-center">
          <div className="mb-2 text-xs uppercase tracking-widest font-mono text-amber-400">7-day trial</div>
          <div className="text-6xl font-heading font-bold mb-1">$1</div>
          <div className="text-slate-400 mb-6">then $49/month — cancel anytime</div>
          {!isActive ? (
            <button
              data-testid="pro-start-trial-btn"
              onClick={startTrial}
              disabled={busy}
              className="px-8 py-3.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-base inline-flex items-center gap-2 transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Start $1 trial
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="text-emerald-300 font-medium">Already subscribed · check the banner above to manage.</div>
          )}
          <p className="text-xs text-slate-500 mt-4">
            Secure checkout by Stripe. Test mode — use card <span className="font-mono">4242 4242 4242 4242</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
