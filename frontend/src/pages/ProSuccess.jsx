import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { http } from "@/lib/api";
import { CheckCircle2, Loader2, ArrowRight, Crown } from "lucide-react";

export default function ProSuccess() {
  const [params] = useSearchParams();
  const sid = params.get("session_id");
  const [status, setStatus] = useState("checking");
  const [poll, setPoll] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sid) return;
    let timer;
    const tick = async () => {
      try {
        const { data } = await http.get("/subscriptions/me");
        if (data.is_active) {
          setStatus("active");
          return;
        }
      } catch { /* ignore */ }
      setPoll(p => p + 1);
      timer = setTimeout(tick, 2000);
    };
    tick();
    return () => timer && clearTimeout(timer);
  }, [sid]);

  useEffect(() => {
    if (poll > 15) setStatus("timeout");
  }, [poll]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 lg:px-8 py-24 text-center" data-testid="pro-success-page">
        {status === "checking" && (
          <>
            <Loader2 className="w-12 h-12 text-amber-400 mx-auto mb-6 animate-spin" />
            <h1 className="font-heading font-bold text-3xl mb-3">Activating your Pro membership…</h1>
            <p className="text-slate-400">Confirming with Stripe — this usually takes a couple of seconds.</p>
          </>
        )}
        {status === "active" && (
          <>
            <div className="inline-flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <Crown className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="font-heading font-bold text-4xl mb-3" data-testid="pro-success-heading">Welcome to Pro.</h1>
            <p className="text-slate-400 mb-8">
              You&apos;re all set. New leads in your service area will hit your dashboard in real time.
            </p>
            <button
              data-testid="pro-goto-dashboard"
              onClick={() => navigate("/handyman")}
              className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold inline-flex items-center gap-2"
            >
              Go to dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
        {status === "timeout" && (
          <>
            <h1 className="font-heading font-bold text-3xl mb-3">Still processing…</h1>
            <p className="text-slate-400 mb-6">
              Stripe is taking longer than usual. Your subscription will activate the moment payment confirms.
              You can refresh or head back to the dashboard.
            </p>
            <button
              onClick={() => navigate("/handyman")}
              className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 font-semibold"
            >
              Back to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
