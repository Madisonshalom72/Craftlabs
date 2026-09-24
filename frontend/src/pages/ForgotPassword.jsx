import { useState } from "react";
import { Link } from "react-router-dom";
import { http } from "@/lib/api";
import useSEO from "@/hooks/useSEO";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map(e => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function ForgotPassword() {
  useSEO({ title: "Reset password — Handy Fix AI", robots: "noindex,follow" });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setMsg("");
    try {
      const { data } = await http.post("/auth/forgot-password", { email });
      setMsg(data?.message || "If that email is registered, we sent a reset link.");
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" data-testid="forgot-page">
      <div className="w-full max-w-md">
        <Link to="/login" data-testid="forgot-back" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
        <div className="glass rounded-3xl p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] uppercase tracking-widest font-mono mb-4">
            <Mail className="w-3 h-3" /> Password reset
          </div>
          <h1 className="font-heading font-bold text-3xl leading-tight mb-2">Forgot your password?</h1>
          <p className="text-sm text-slate-400 mb-6">
            Enter the email tied to your Handy Fix account. If it exists, we&apos;ll send a reset link that expires in 60 minutes.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Email</label>
              <input
                data-testid="forgot-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                placeholder="you@example.com"
              />
            </div>
            <button
              data-testid="forgot-submit"
              type="submit"
              disabled={busy || !email}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send reset link
            </button>
          </form>

          {msg && (
            <div data-testid="forgot-success" className="mt-5 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          )}
          {error && (
            <div data-testid="forgot-error" className="mt-5 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <p className="mt-6 text-[11px] text-slate-500 text-center">
            Signed up with Google? Use <Link to="/account/recover" className="text-amber-400 hover:underline">Account help</Link> instead.
          </p>
        </div>
      </div>
    </div>
  );
}
