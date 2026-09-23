import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { http } from "@/lib/api";
import useSEO from "@/hooks/useSEO";
import { CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";

export default function VerifyEmail() {
  useSEO({ title: "Verify email — CraftPulse AI", robots: "noindex,nofollow" });
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("checking");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMsg("No verification token found in the link.");
      return;
    }
    http.get(`/auth/verify?token=${encodeURIComponent(token)}`)
      .then(r => { setStatus("ok"); setMsg(r.data?.message || "Email verified."); })
      .catch(err => {
        setStatus("error");
        setMsg(err?.response?.data?.detail || "Verification failed. The link may be expired.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-5" data-testid="verify-page">
      <div className="w-full max-w-md glass rounded-3xl p-8 text-center">
        {status === "checking" && (
          <>
            <Loader2 className="w-10 h-10 text-amber-400 mx-auto mb-4 animate-spin" />
            <h1 className="font-heading font-bold text-2xl">Verifying your email…</h1>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="font-heading font-bold text-2xl mb-2">Email verified</h1>
            <p className="text-slate-400 mb-6">{msg}</p>
            <Link
              data-testid="verify-signin-btn"
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm"
            >
              Sign in
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="font-heading font-bold text-2xl mb-2">Verification failed</h1>
            <p className="text-slate-400 mb-6">{msg}</p>
            <Link
              data-testid="verify-resend-link"
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-slate-100 font-semibold text-sm"
            >
              <Mail className="w-4 h-4" /> Back to sign in to resend
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
