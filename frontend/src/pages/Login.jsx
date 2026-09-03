import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Wrench, HardHat, User, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { setUser } = useAuth();
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogle = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      const { data } = await http.post("/auth/demo-login", { role });
      setUser(data.user);
      toast.success(`Signed in as demo ${role}`);
      navigate(role === "handyman" ? "/handyman" : "/dashboard");
    } catch (e) {
      toast.error("Demo login failed. Try again.");
    } finally {
      setLoading(false);
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
            Enter the Guild
          </h1>
          <p className="text-sm text-slate-400 mb-6">
            Sign in with Google, or drop into a live demo instantly.
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

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">or demo</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <button
            data-testid="demo-login-btn"
            onClick={handleDemo}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-amber-400 font-semibold transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Instant Demo · {role === "handyman" ? "Craftsman" : "Homeowner"}
          </button>

          <p className="mt-5 text-[11px] text-slate-500 text-center">
            No signup needed for the demo. Google sign-in creates a real account.
          </p>
        </div>
      </div>
    </div>
  );
}
