import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import useSEO from "@/hooks/useSEO";
import {
  Wrench, HardHat, User, ArrowRight, Loader2, Mail, Lock,
  Eye, EyeOff, AlertCircle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map(e => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function Login() {
  useSEO({
    title: "Sign in — CraftPulse AI",
    description: "Sign in to CraftPulse with email/password or Google to post jobs, accept leads, and manage your marketplace.",
    robots: "noindex,follow",
  });
  const { setUser } = useAuth();
  const [role, setRole] = useState("customer");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [tab, setTab] = useState("email"); // "email" | "google"
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  const handleGoogle = () => {
    // eslint-disable-next-line no-restricted-syntax
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleDemo = async () => {
    setBusy(true);
    setError(""); setInfo("");
    try {
      const { data } = await http.post("/auth/demo-login", { role });
      setUser(data.user);
      toast.success(`Signed in as demo ${role}`);
      navigate(role === "handyman" ? "/handyman" : "/dashboard");
    } catch {
      toast.error("Demo login failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(""); setInfo("");
    try {
      if (mode === "signup") {
        const { data } = await http.post("/auth/signup", { email, password, name, role });
        setInfo(data.message || "Check your email to verify your account.");
        toast.success("Signup complete — verify your email");
      } else {
        const { data } = await http.post("/auth/login-email", { email, password });
        setUser(data.user);
        toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`);
        navigate(data.user.role === "handyman" ? "/handyman" : "/dashboard");
      }
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail) || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const resendVerify = async () => {
    if (!email) return setError("Enter your email above first");
    setBusy(true);
    try {
      const { data } = await http.post("/auth/resend-verification", { email });
      setInfo(data.message);
    } catch (err) {
      setError(formatApiErrorDetail(err?.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <a href="/" className="inline-flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center amber-glow">
            <Wrench className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-heading font-bold text-xl tracking-tight">CraftPulse</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">AI · Marketplace</span>
          </div>
        </a>

        <div className="glass rounded-3xl p-7">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            {mode === "signup" ? "Join the Guild" : "Enter the Guild"}
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            {mode === "signup"
              ? "Create an account with your email or continue with Google."
              : "Sign in with email or Google. New here? "}
            {mode === "signin" && (
              <button
                data-testid="switch-to-signup"
                onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
                className="text-amber-400 hover:underline font-medium"
              >
                Create an account
              </button>
            )}
          </p>

          <div className="mb-5">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">I am a…</div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/8">
              <button
                data-testid="role-customer-btn"
                onClick={() => setRole("customer")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition font-medium text-sm ${role === "customer" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5"}`}
              >
                <User className="w-4 h-4" /> Homeowner
              </button>
              <button
                data-testid="role-handyman-btn"
                onClick={() => setRole("handyman")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition font-medium text-sm ${role === "handyman" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5"}`}
              >
                <HardHat className="w-4 h-4" /> Craftsman
              </button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-4 p-1 bg-white/5 rounded-xl border border-white/8">
            <button
              data-testid="tab-email"
              onClick={() => setTab("email")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === "email" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-white/5"}`}
            >
              <Mail className="w-4 h-4 inline mr-1" /> Email
            </button>
            <button
              data-testid="tab-google"
              onClick={() => setTab("google")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === "google" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-white/5"}`}
            >
              Google
            </button>
          </div>

          {tab === "email" ? (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {mode === "signup" && (
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Your name</label>
                  <input
                    data-testid="signup-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoComplete="name"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                    placeholder="Jane Doe"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    data-testid="email-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400">Password</label>
                  {mode === "signin" && (
                    <Link data-testid="forgot-pw-link" to="/forgot" className="text-[11px] text-amber-400 hover:underline">Forgot?</Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    data-testid="password-input"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-11 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                    placeholder={mode === "signup" ? "min 8 chars" : "••••••••"}
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
                <div data-testid="auth-error" className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span>{error}</span>
                    {error.toLowerCase().includes("verify") && (
                      <button
                        type="button"
                        data-testid="resend-verify-btn"
                        onClick={resendVerify}
                        className="ml-2 text-amber-300 hover:underline text-xs"
                      >
                        Resend link
                      </button>
                    )}
                  </div>
                </div>
              )}
              {info && (
                <div data-testid="auth-info" className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{info}</span>
                </div>
              )}

              <button
                data-testid="email-submit-btn"
                type="submit"
                disabled={busy || !email || !password || (mode === "signup" && !name)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold transition disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
              {mode === "signup" && (
                <p className="mt-2 text-[11px] text-slate-500 text-center">
                  By signing up you agree to our <Link to="/terms" className="text-amber-400 hover:underline">Terms</Link> and <Link to="/privacy" className="text-amber-400 hover:underline">Privacy Policy</Link>.
                </p>
              )}
              {mode === "signup" && (
                <button
                  type="button"
                  data-testid="switch-to-signin"
                  onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
                  className="w-full text-center text-xs text-slate-400 hover:text-amber-300 mt-2"
                >
                  Already have an account? Sign in
                </button>
              )}
            </form>
          ) : (
            <>
              <button
                data-testid="google-login-btn"
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition"
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>
              <p className="mt-3 text-[11px] text-slate-500 text-center">
                Recover your Google account at <Link to="/account/recover" className="text-amber-400 hover:underline">Account help</Link>.
              </p>
            </>
          )}

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">or demo</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <button
            data-testid="demo-login-btn"
            onClick={handleDemo}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-amber-400 font-semibold transition"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Instant Demo · {role === "handyman" ? "Craftsman" : "Homeowner"}
          </button>
        </div>
      </div>
    </div>
  );
}
