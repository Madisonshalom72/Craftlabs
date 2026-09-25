import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { http } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await http.get("/auth/me");
      setUser(data);
      // Attach any pending referral code captured from /r/:code
      try {
        const code = localStorage.getItem("cp_ref_code");
        if (code && !data.referred_by) {
          await http.post("/referrals/attach", { code });
          localStorage.removeItem("cp_ref_code");
        }
      } catch (err) { console.debug("[Auth] referral attach skipped:", err); }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    await http.post("/auth/logout");
    setUser(null);
  }, []);

  // Memoise the context value so children don't re-render on every parent render.
  const value = useMemo(
    () => ({ user, setUser, loading, checkAuth, logout }),
    [user, loading, checkAuth, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
