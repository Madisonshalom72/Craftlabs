import { createContext, useContext, useState, useEffect, useCallback } from "react";
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
      } catch { /* ignore */ }
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

  const logout = async () => {
    await http.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
