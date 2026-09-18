import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { http } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await http.get(`/payments/status/${sessionId}`);
        if (!cancelled) {
          setStatus(data);
          if (data.payment_status !== "paid" && attempts < 15) {
            setTimeout(() => setAttempts(a => a + 1), 1500);
          }
        }
      } catch (e) { console.error("payment status poll failed", e); /* keep trying */ }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId, attempts]);

  const paid = status?.payment_status === "paid";

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 py-16">
        <div className="glass rounded-3xl p-10 text-center">
          {!paid ? (
            <>
              <Loader2 className="w-10 h-10 mx-auto mb-4 text-amber-500 animate-spin" />
              <h1 className="font-heading text-2xl font-bold">Confirming your payment…</h1>
              <p className="text-slate-400 mt-2 text-sm">Escrow release is being verified with Stripe.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="ai-badge mb-3">Escrow Active</div>
              <h1 data-testid="payment-success-title" className="font-heading text-3xl font-extrabold tracking-tight">
                Booking Confirmed
              </h1>
              <p className="text-slate-400 mt-2">
                Funds are held safely in escrow. Your craftsman has been notified and will reach out shortly.
              </p>
              {status?.amount && (
                <p className="mt-3 font-mono text-amber-400">
                  ${(status.amount / 100).toFixed(2)} · {status.session_id.slice(-10)}
                </p>
              )}
              <Link
                to="/dashboard"
                data-testid="back-to-dashboard-btn"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition"
              >
                Back to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
