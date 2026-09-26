import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { http } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Lock, Info, Layers, Plus, X, ChevronRight } from "lucide-react";

const MILESTONE_MIN = 150000;
const fmt = (c) => `$${((c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Customer escrow payment modal.
 * Modes:
 *   'single'  : one PaymentIntent for the full quoted amount (default)
 *   'plan'    : draft up to 3 milestones (only for jobs ≥ $1500)
 *   'pay'     : Stripe Payment Element for the current PI (single or milestone slice)
 */
export default function AcceptQuoteModal({ jobId, amountCents, open, onClose, onSuccess }) {
  const canSplit = amountCents >= MILESTONE_MIN;
  const [mode, setMode] = useState("single");
  const [milestones, setMilestones] = useState(() => [
    { id: "ms-init-1", label: "Materials", amount: Math.floor(amountCents / 3) },
    { id: "ms-init-2", label: "Rough-in", amount: Math.floor(amountCents / 3) },
    { id: "ms-init-3", label: "Finish", amount: amountCents - 2 * Math.floor(amountCents / 3) },
  ]);
  const [planData, setPlanData] = useState(null);   // list of created milestones
  const [payInit, setPayInit] = useState(null);      // {client_secret, amount, ...}
  const [payingMsId, setPayingMsId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (!open) { setMode("single"); setPlanData(null); setPayInit(null); setErr(""); } }, [open]);

  // Auto-init single-payment PI when modal opens in 'single' mode
  useEffect(() => {
    if (!open || mode !== "single" || payInit || planData) return;
    setLoading(true); setErr("");
    http.post("/escrow/accept-quote", { job_id: jobId, amount_cents: amountCents })
      .then((r) => setPayInit(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || "Failed to init payment"))
      .finally(() => setLoading(false));
  }, [open, mode, jobId, amountCents, payInit, planData]);

  const stripePromise = useMemo(() => {
    if (!payInit?.publishable_key) return null;
    return loadStripe(payInit.publishable_key);
  }, [payInit?.publishable_key]);

  const totalPlan = milestones.reduce((s, m) => s + (parseInt(m.amount || 0, 10) || 0), 0);
  const planValid = totalPlan >= MILESTONE_MIN && milestones.every((m) => m.amount >= 500) && milestones.length >= 1 && milestones.length <= 3;

  const addSlice = () => milestones.length < 3 && setMilestones([...milestones, { id: `ms-${Date.now()}`, label: `Phase ${milestones.length + 1}`, amount: 50000 }]);
  const removeSlice = (i) => milestones.length > 1 && setMilestones(milestones.filter((_, idx) => idx !== i));
  const updateSlice = (i, patch) => setMilestones(milestones.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const createPlan = async () => {
    setLoading(true); setErr("");
    try {
      const { data } = await http.post("/escrow/milestones/create", {
        job_id: jobId,
        milestones: milestones.map((m) => ({ label: m.label, amount_cents: parseInt(m.amount, 10) })),
      });
      setPlanData(data.milestones);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not create milestone plan");
    } finally { setLoading(false); }
  };

  const fundMilestone = async (ms) => {
    setPayingMsId(ms.milestone_id); setLoading(true); setErr("");
    try {
      const { data } = await http.post("/escrow/milestones/fund", { milestone_id: ms.milestone_id });
      setPayInit(data);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not init milestone payment");
    } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div
      data-testid="accept-quote-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-lg bg-craft-slate border border-white/10 rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-craft-lime/15 border border-craft-lime/40 flex items-center justify-center">
            <Lock className="w-4 h-4 text-craft-lime" />
          </div>
          <div className="flex-1">
            <div className="font-heading font-bold text-lg text-white">Fund the escrow</div>
            <div className="text-xs text-slate-400">
              {payInit ? "Held safely until you approve the work." : `${fmt(amountCents)} quoted total`}
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        {canSplit && !planData && !payInit && (
          <div className="px-6 pt-5">
            <div className="inline-flex p-1 rounded-full bg-slate-900/60 border border-white/10 w-full">
              <button
                data-testid="mode-single"
                onClick={() => setMode("single")}
                className={`flex-1 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest font-mono rounded-full transition ${
                  mode === "single" ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white"
                }`}
              >
                Pay in full
              </button>
              <button
                data-testid="mode-milestones"
                onClick={() => setMode("plan")}
                className={`flex-1 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest font-mono rounded-full transition inline-flex items-center justify-center gap-1.5 ${
                  mode === "plan" ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Split into milestones
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {loading && <div className="flex items-center gap-2 text-slate-400 text-sm mb-3"><Loader2 className="w-4 h-4 animate-spin" /> Working…</div>}
          {err && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3">{err}</div>}

          {/* Milestone drafter */}
          {mode === "plan" && !planData && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Big jobs deserve their own guardrails. Split into up to 3 slices — you fund and approve each one independently. Minimum total: <span className="font-mono text-craft-lime">$1,500</span>.
              </p>
              {milestones.map((m, i) => (
                <div key={m.id} data-testid={`milestone-row-${i}`} className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 flex items-center justify-center font-mono text-xs shrink-0">{i + 1}</div>
                  <input
                    data-testid={`milestone-label-${i}`}
                    value={m.label}
                    onChange={(e) => updateSlice(i, { label: e.target.value.slice(0, 60) })}
                    className="flex-1 bg-transparent border-b border-white/10 focus:border-amber-500/60 focus:outline-none text-sm py-1"
                    placeholder="Phase label"
                  />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
                    <input
                      data-testid={`milestone-amount-${i}`}
                      type="number"
                      min="5"
                      value={m.amount / 100}
                      onChange={(e) => updateSlice(i, { amount: Math.round(parseFloat(e.target.value || 0) * 100) })}
                      className="w-24 pl-5 pr-1 py-1 rounded-md bg-slate-900/60 border border-white/10 text-sm font-mono text-right focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                  {milestones.length > 1 && (
                    <button
                      data-testid={`milestone-remove-${i}`}
                      onClick={() => removeSlice(i)}
                      className="text-slate-500 hover:text-red-400 transition"
                      aria-label="Remove milestone"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {milestones.length < 3 && (
                <button
                  data-testid="milestone-add"
                  onClick={addSlice}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add another slice
                </button>
              )}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-white/5">
                <span className="text-slate-400">Total</span>
                <span className={`font-mono ${totalPlan >= MILESTONE_MIN ? "text-craft-lime" : "text-red-400"}`}>{fmt(totalPlan)}</span>
              </div>
              {totalPlan < MILESTONE_MIN && (
                <p className="text-[11px] text-red-400 font-mono">Need at least $1,500 across all slices.</p>
              )}
              <button
                data-testid="create-milestones"
                onClick={createPlan}
                disabled={!planValid || loading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-semibold text-sm transition"
              >
                <Layers className="w-4 h-4" /> Create milestone plan
              </button>
            </div>
          )}

          {/* Milestone plan list */}
          {planData && !payInit && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Fund a slice below when you're ready. Each fires its own escrow flow.</p>
              {planData.map((ms) => (
                <div key={ms.milestone_id} data-testid={`plan-row-${ms.milestone_id}`} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{ms.label}</div>
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                      {ms.status} · {fmt(ms.amount_cents)}
                    </div>
                  </div>
                  <button
                    data-testid={`fund-${ms.milestone_id}`}
                    onClick={() => fundMilestone(ms)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-craft-lime/15 border border-craft-lime/40 text-craft-lime text-xs font-semibold hover:bg-craft-lime/25 transition"
                  >
                    Fund <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                data-testid="milestones-done"
                onClick={onClose}
                className="w-full px-4 py-2 rounded-full border border-white/10 hover:border-white/20 text-slate-300 font-medium text-sm"
              >
                Done for now
              </button>
            </div>
          )}

          {/* Payment Element (single or milestone slice) */}
          {payInit && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: payInit.client_secret,
                appearance: {
                  theme: "night",
                  variables: { colorPrimary: "#F59E0B", colorBackground: "#0B0F14", colorText: "#E5E7EB", fontFamily: "system-ui, sans-serif", borderRadius: "10px" },
                },
              }}
            >
              <EscrowForm
                initData={payInit}
                jobId={jobId}
                onSuccess={() => {
                  toast.success("Funds held in escrow.");
                  // If we were funding a milestone, return to plan view
                  if (payingMsId) {
                    setPayInit(null);
                    setPayingMsId(null);
                    // refetch milestones so the row shows 'held'
                    http.get(`/escrow/milestones/${jobId}`).then(r => setPlanData(r.data.milestones));
                  } else {
                    onSuccess?.();
                  }
                }}
                onCancel={() => { setPayInit(null); setPayingMsId(null); if (!planData) onClose?.(); }}
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
    setSubmitting(true); setErr("");
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/jobs/${jobId}?funded=1` },
      redirect: "if_required",
    });
    if (error) { setErr(error.message || "Payment failed"); setSubmitting(false); }
    else { onSuccess?.(); }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />
      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">{err}</div>}
      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-1.5 text-sm">
        <div className="flex items-center justify-between text-slate-300">
          <span>You pay now</span>
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
        <span>Craft Master Labs holds these funds. They release after you approve — or automatically after 72 h of no response.</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} data-testid="accept-quote-cancel"
          className="px-4 py-2.5 rounded-full border border-white/10 hover:border-white/20 text-slate-300 font-medium text-sm">
          Back
        </button>
        <button type="submit" disabled={!stripe || submitting} data-testid="accept-quote-submit"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-semibold text-sm transition">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {submitting ? "Processing…" : `Pay $${total.toFixed(2)} into escrow`}
        </button>
      </div>
    </form>
  );
}
