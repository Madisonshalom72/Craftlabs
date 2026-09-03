import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const session_id = params.get("session_id");
    if (!session_id) {
      navigate("/login");
      return;
    }
    (async () => {
      try {
        const { data } = await http.post("/auth/session", { session_id });
        setUser(data.user);
        window.history.replaceState({}, document.title, "/dashboard");
        const target = data.user?.role === "handyman" ? "/handyman" : "/dashboard";
        navigate(target, { replace: true, state: { user: data.user } });
      } catch (e) {
        console.error("auth exchange failed", e);
        navigate("/login");
      }
    })();
  }, [location.hash, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
          Establishing secure session…
        </p>
      </div>
    </div>
  );
}
