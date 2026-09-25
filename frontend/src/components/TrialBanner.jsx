import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { http } from "@/lib/api";
import { Sparkles, AlertTriangle, X } from "lucide-react";

/**
 * Slim persistent banner shown across the contractor dashboard whenever the
 * subscription is in trial, past due, or unsubscribed. Hides when active + paid.
 */
export default function TrialBanner() {
  const [state, setState] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    http.get("/subscriptions/me").then(r => setState(r.data)).catch(() => setState(null));
  }, []);

  if (!state || dismissed) return null;
  const sub = state.subscription || {};
  const status = sub.status;
  const daysLeft = state.comp_until ? Math.max(0, Math.ceil((new Date(state.comp_until) - Date.now()) / 86400000)) : null;

  // Hide when a real paid subscription is active.
  if (status === "active" && !state.comp_until) return null;

  let variant = "trial";
  let msg = "";
  let cta = { label: "Start 14-day free trial", to: "/pro" };

  if (state.comp_until && daysLeft > 0 && !sub.stripe_customer_id) {
    variant = "comp";
    msg = `You're on your grandfathered free month · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
    cta = { label: "Add card to keep leads flowing", to: "/pro" };
  } else if (status === "trialing") {
    variant = "trial";
    msg = "Your 14-day trial is running. Card on file · $50/mo after trial";
    cta = { label: "Manage plan", to: "/pro" };
  } else if (status === "past_due") {
    variant = "past_due";
    msg = "Your card was declined. Leads will pause in 3 days if the retry fails";
    cta = { label: "Fix payment", to: "/pro" };
  } else if (!state.is_active) {
    variant = "gate";
    msg = "Subscription required to accept leads · 14 days free, then $50/mo";
  }

  const tone = {
    comp:     "bg-craft-lime/10 border-craft-lime/40 text-craft-lime",
    trial:    "bg-amber-500/10 border-amber-500/40 text-amber-300",
    past_due: "bg-red-500/10 border-red-500/40 text-red-300",
    gate:     "bg-amber-500/10 border-amber-500/40 text-amber-300",
  }[variant];

  const Icon = variant === "past_due" ? AlertTriangle : Sparkles;

  return (
    <div
      data-testid={`trial-banner-${variant}`}
      className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${tone}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <div className="flex-1 text-sm">{msg}</div>
      <Link
        to={cta.to}
        data-testid="trial-banner-cta"
        className="text-xs font-semibold underline underline-offset-4 whitespace-nowrap hover:opacity-80"
      >
        {cta.label}
      </Link>
      <button
        data-testid="trial-banner-dismiss"
        onClick={() => setDismissed(true)}
        className="opacity-60 hover:opacity-100 transition"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
