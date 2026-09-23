import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { http } from "@/lib/api";
import useSEO from "@/hooks/useSEO";
import { KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map(e => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function ResetPassword() {
  useSEO({ title: "Set new password — CraftPulse AI", robots: "noindex,nofollow" });
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(""); setMsg("");
    try {
      const { data } = await http.post("/auth/reset-password", { token, new_password: newPw });
      setMsg(data?.message || "Password updated. Redirecting…");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" data-testid="reset-page">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] uppercase tracking-widest font-mono mb-4">
            <KeyRound className="w-3 h-3" /> Reset password
          </div>
          <h1 className="font-heading font-bold text-3xl leading-tight mb-2">Set a new password</h1>
          <p className="text-sm text-slate-400 mb-6">
            Paste the token from your reset email (it&apos;s pre-filled if you came from the link) and pick a new password.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Reset token</label>
              <input
                data-testid="reset-token"
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-amber-500/60"
                placeholder="paste token from email"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">New password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  data-testid="reset-newpw"
                  type={showPw ? "text" : "password"}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                  placeholder="min 8 chars"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              data-testid="reset-submit"
              type="submit"
              disabled={busy || !token || newPw.length < 8}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Update password
            </button>
          </form>

          {msg && (
            <div data-testid="reset-success" className="mt-5 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          )}
          {error && (
            <div data-testid="reset-error" className="mt-5 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="mt-6 text-[11px] text-slate-500 text-center">
            <Link to="/login" className="text-amber-400 hover:underline">← Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
