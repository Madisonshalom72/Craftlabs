import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { http } from "@/lib/api";
import useSEO from "@/hooks/useSEO";
import { KeyRound, Mail, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";

export default function AccountRecover() {
  useSEO({
    title: "Recover access — Handy Fix AI",
    description: "How to recover your Handy Fix account when you can't sign in with Google.",
  });
  const [email, setEmail] = useState(null);
  useEffect(() => {
    http.get("/auth/me").then(r => setEmail(r.data?.email)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 lg:px-8 py-14" data-testid="account-recover-page">
        <div className="ai-badge mb-3"><HelpCircle className="w-3.5 h-3.5" /> Account help</div>
        <h1 className="font-heading font-bold text-4xl leading-tight mb-3">Recover your Handy Fix account</h1>
        <p className="text-slate-400 mb-10">
          Handy Fix signs you in with your Google account — so there&apos;s no Handy Fix password to reset.
          Here&apos;s how to regain access in the two most common cases.
        </p>

        {email && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm">
            <ShieldCheck className="inline w-4 h-4 mr-1" />
            You&apos;re currently signed in as <span className="font-mono">{email}</span>. Nothing to recover.
          </div>
        )}

        <div className="space-y-5">
          <div className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl">You forgot your Google password</h2>
                <p className="text-sm text-slate-400 mt-1">Reset it directly with Google — the new password will let you sign back into Handy Fix automatically.</p>
              </div>
            </div>
            <a
              data-testid="recover-google-btn"
              href="https://accounts.google.com/signin/recovery"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition"
            >
              Open Google account recovery
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-xl">You lost access to your Google email</h2>
                <p className="text-sm text-slate-400 mt-1">Contact us — we&apos;ll verify your identity and help you migrate your Handy Fix account to a new email.</p>
              </div>
            </div>
            <a
              data-testid="recover-contact-btn"
              href="mailto:loans24funding@gmail.com?subject=Handy Fix%20account%20recovery"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-slate-100 font-semibold text-sm transition"
            >
              Email support
            </a>
          </div>
        </div>

        <p className="mt-10 text-xs text-slate-500 text-center">
          Not what you were looking for? Back to <Link to="/" className="text-amber-400 hover:underline">home</Link> or
          {" "}<Link to="/login" className="text-amber-400 hover:underline">sign in</Link>.
        </p>
      </div>
    </div>
  );
}
