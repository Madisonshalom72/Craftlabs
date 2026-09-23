import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { http } from "@/lib/api";
import { ShieldCheck, Lock, User, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map(e => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await http.post("/admin/login", { username, password });
      toast.success("Signed in as admin");
      navigate("/admin/licenses", { replace: true });
    } catch (err) {
      const msg = formatApiErrorDetail(err?.response?.data?.detail) || "Login failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2.5 justify-center mb-8 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="text-left leading-none">
            <div className="font-heading font-bold text-lg tracking-tight">CraftPulse</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-amber-400">Admin console</div>
          </div>
        </Link>
        <div data-testid="admin-login-card" className="glass rounded-3xl p-8 border border-white/10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] uppercase tracking-widest font-mono mb-5">
            <Lock className="w-3 h-3" /> Protected area
          </div>
          <h1 className="font-heading font-bold text-3xl leading-tight mb-2">Admin sign in</h1>
          <p className="text-sm text-slate-400 mb-7">Enter your admin credentials to access the license review queue.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  data-testid="admin-username-input"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                  placeholder="admin username"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  data-testid="admin-password-input"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div data-testid="admin-login-error" className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              data-testid="admin-login-submit"
              type="submit"
              disabled={busy || !username || !password}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Sign in
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/8 text-center">
            <Link
              data-testid="admin-forgot-link"
              to="/admin/forgot"
              className="text-xs text-slate-400 hover:text-amber-400 transition"
            >
              Forgot username or password?
            </Link>
          </div>
        </div>
        <p className="text-center text-[10px] font-mono uppercase tracking-widest text-slate-600 mt-6">
          Not a customer or handyman? <Link to="/" className="text-amber-500 hover:text-amber-400">Back to CraftPulse</Link>
        </p>
      </div>
    </div>
  );
}
