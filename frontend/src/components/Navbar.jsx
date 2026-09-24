import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { http } from "@/lib/api";
import { Wrench, LogOut, LayoutDashboard, HardHat, BookOpen, ShieldCheck, Radio, Crown } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    http.get("/admin/me").then(r => setIsAdmin(!!r.data.is_admin)).catch(() => setIsAdmin(false));
  }, [user]);

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <nav data-testid="navbar" className="sticky top-0 z-40 glass border-b border-white/8">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" data-testid="brand-link" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center amber-glow">
            <Wrench className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-heading font-bold text-lg tracking-tight">Handy Fix</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-amber-400">AI · Marketplace</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/live"
            data-testid="nav-live-btn"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium text-amber-300 hover:bg-amber-500/10 transition"
          >
            <Radio className="w-4 h-4 animate-pulse" /> Live
          </Link>
          <Link
            to="/blog"
            data-testid="nav-blog-btn"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium text-slate-300 hover:bg-white/5 transition"
          >
            <BookOpen className="w-4 h-4" /> Field Notes
          </Link>
          {user?.role === "handyman" && (
            <Link
              to="/pro"
              data-testid="nav-pro-btn"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition"
            >
              <Crown className="w-4 h-4" /> Pro
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin/licenses"
              data-testid="nav-admin-btn"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium text-emerald-400 hover:bg-emerald-500/10 transition"
            >
              <ShieldCheck className="w-4 h-4" /> Admin
            </Link>
          )}
          {user ? (
            <>
              <Link
                to={user.role === "handyman" ? "/handyman" : "/dashboard"}
                data-testid="nav-dashboard-btn"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium text-slate-200 hover:bg-white/5 transition"
              >
                {user.role === "handyman" ? <HardHat className="w-4 h-4" /> : <LayoutDashboard className="w-4 h-4" />}
                Dashboard
              </Link>
              <div className="flex items-center gap-2.5 pl-2 border-l border-white/8">
                <img src={user.picture} alt="" className="w-8 h-8 rounded-full border border-amber-500/40" />
                <span className="hidden sm:block text-sm font-medium">{user.name}</span>
                <button
                  data-testid="logout-btn"
                  onClick={onLogout}
                  className="p-2 rounded-full hover:bg-white/5 transition"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              data-testid="nav-login-btn"
              className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
