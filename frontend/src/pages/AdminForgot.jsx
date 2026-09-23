import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { http } from "@/lib/api";
import { ShieldCheck, Mail, Loader2, ArrowLeft, KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map(e => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function AdminForgot() {
  const [params] = useSearchParams();
  const preToken = params.get("token") || "";
  const [mode, setMode] = useState(preToken ? "reset" : "request");

  const [identifier, setIdentifier] = useState("");
  const [token, setToken] = useState(preToken);
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const request = async (e) => {
    e.preventDefault();
    setError(""); setMsg(""); setBusy(true);
    try {
      const { data } = await http.post("/admin/forgot", { identifier });
      setMsg(data.message);
      setMode("reset");
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail) || "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await http.post("/admin/reset-password", { token, new_password: newPw });
      setMsg("Password updated. Redirecting to login…");
      setTimeout(() => navigate("/admin/login", { replace: true }), 1500);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail) || "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <Link to="/admin/login" data-testid="admin-forgot-back" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-400 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>

        <div className="glass rounded-3xl p-8 border border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] uppercase tracking-widest font-mono mb-5">
            {mode === "reset" ? <KeyRound className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
            {mode === "reset" ? "Reset password" : "Recover access"}
          </div>
          <h1 className="font-heading font-bold text-3xl leading-tight mb-2">
            {mode === "reset" ? "Set a new password" : "Recover your admin account"}
          </h1>

          {mode === "request" && (
            <>
              <p className="text-sm text-slate-400 mb-6">
                Enter your admin username or the recovery email on file. If it matches, we&apos;ll send a one-time reset link to your recovery inbox.
              </p>
              <form onSubmit={request} className="space-y-4" data-testid="admin-forgot-request-form">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Username or recovery email</label>
                  <input
                    data-testid="admin-forgot-identifier"
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                    placeholder="Appfactory24 or you@example.com"
                  />
                </div>
                <button
                  data-testid="admin-forgot-submit"
                  type="submit"
                  disabled={busy || !identifier}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send reset link
                </button>
              </form>
              <p className="mt-5 text-[11px] text-slate-500 text-center">
                Reset links are one-time-use and expire in 30 minutes.
              </p>
            </>
          )}

          {mode === "reset" && (
            <>
              <p className="text-sm text-slate-400 mb-6">
                Paste the reset token from your recovery email and choose a new password (min 8 characters).
              </p>
              <form onSubmit={reset} className="space-y-4" data-testid="admin-forgot-reset-form">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Reset token</label>
                  <input
                    data-testid="admin-forgot-token"
                    type="text"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-amber-500/60"
                    placeholder="paste token here"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">New password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      data-testid="admin-forgot-newpw"
                      type={showPw ? "text" : "password"}
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
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
                  data-testid="admin-forgot-reset-submit"
                  type="submit"
                  disabled={busy || !token || newPw.length < 8}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Update password
                </button>
              </form>
            </>
          )}

          {msg && (
            <div data-testid="admin-forgot-msg" className="mt-5 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{msg}</span>
            </div>
          )}
          {error && (
            <div data-testid="admin-forgot-error" className="mt-5 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
