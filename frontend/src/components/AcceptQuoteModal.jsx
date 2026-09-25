import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, PaymentElement, useStripe, useElements,
} from "@stripe/react-stripe-js";
import { http } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Lock, Info } from "lucide-react";

/**
 * Customer-facing escrow payment modal. Opens after a job is assigned and
 * the customer accepts the contractor's quote. Funds are captured to the
 * platform balance ("escrow") and released to the contractor on completion.
 *
 * Props:
 *  - jobId: string
 *  - amountCents: number (the quoted total)
 *  - open, onClose, onSuccess
 */
export default function AcceptQuoteModal({ jobId, amountCents, open, onClose, onSuccess }) {
  const [initData, setInitData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !jobId || !amountCents) return;
    setLoading(true);
    setErr("");
    http.post("/escrow/accept-quote", { job_id: jobId, amount_cents: amountCents })
      .then((r) => setInitData(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || "Failed to init payment"))
      .finally(() => setLoading(false));
  }, [open, jobId, amountCents]);

  const stripePromise = useMemo(() => {
    if (!initData?.publishable_key) return null;
    return loadStripe(initData.publishable_key);
  }, [initData?.publishable_key]);

  if (!open) return null;

  return (
    <div
      data-testid="accept-quote-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-lg bg-craft-slate border border-white/10 rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-craft-lime/15 border border-craft-lime/40 flex items-center justify-center">
            <Lock className="w-4 h-4 text-craft-lime" />
          </div>
          <div className="flex-1">
            <div className="font-heading font-bold text-lg text-white">Fund the escrow</div>
            <div className="text-xs text-slate-400">Your payment is held safely until you approve the work.</div>
          </div>
        </div>
        <div className="p-6">
          {loading && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Preparing payment…</div>}
          {err && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl p-3">{err}</div>}
          {initData && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: initData.client_secret,
                appearance: {
                  theme: "night",
                  variables: {
                    colorPrimary: "#F59E0B",
                    colorBackground: "#0B0F14",
                    colorText: "#E5E7EB",
                    fontFamily: "system-ui, sans-serif",
                    borderRadius: "10px",
                  },
                },
              }}
            >
              <EscrowForm
                initData={initData}
                jobId={jobId}
                onSuccess={() => {
                  toast.success("Funds held in escrow. Your contractor is on the way.");
                  onSuccess?.();
                }}
                onCancel={onClose}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}

function EscrowForm({ initData, jobId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const total = initData.amount_cents / 100;
  const contractor = initData.contractor_share_cents / 100;
  const fee = initData.platform_fee_cents / 100;

  const submit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr("");
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/jobs/${jobId}?funded=1`,
      },
      redirect: "if_required",
    });
    if (error) {
      setErr(error.message || "Payment failed");
      setSubmitting(false);
    } else {
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">{err}</div>}

      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-1.5 text-sm">
        <div className="flex items-center justify-between text-slate-300">
          <span>Total you pay</span>
          <span className="font-semibold text-white">${total.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-500 text-xs">
          <span>Contractor receives</span>
          <span>${contractor.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-slate-500 text-xs">
          <span>Platform fee (10%)</span>
          <span>${fee.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-slate-400">
        <Info className="w-3.5 h-3.5 text-craft-lime shrink-0 mt-0.5" />
        <span>Funds are held by Craft Master Labs. Your contractor is paid only after you approve the work — or automatically after 72 h of no response.</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="accept-quote-cancel"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-full border border-white/10 hover:border-white/20 text-slate-300 font-medium text-sm transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="accept-quote-submit"
          disabled={!stripe || submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-semibold text-sm transition"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {submitting ? "Processing…" : `Pay $${total.toFixed(2)} into escrow`}
        </button>
      </div>
    </form>
  );
}
