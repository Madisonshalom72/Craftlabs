import { useState } from "react";
import { toast } from "sonner";
import { X, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import { http } from "@/lib/api";

const money = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;

/**
 * CounterOfferModal — one-shot, +20% cap. Contractor sees the customer's
 * total and proposes a new bottom line + a required "why" note.
 */
export default function CounterOfferModal({ jobId, originalCents, open, onClose, onSubmitted }) {
  const [amount, setAmount] = useState(((originalCents || 0) / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const capCents = Math.floor((originalCents || 0) * 1.2);
  const proposedCents = Math.round(parseFloat(amount || 0) * 100);
  const overCap = proposedCents > capCents;
  const under = proposedCents <= 0;

  const submit = async () => {
    if (overCap) return toast.error(`Cap is ${money(capCents)} (120%)`);
    if (under) return toast.error("Amount must be positive");
    if (reason.trim().length < 8) return toast.error("Please explain why (min 8 chars)");
    setBusy(true);
    try {
      await http.post(`/jobs/${jobId}/counter`, { total_cents: proposedCents, reason: reason.trim() });
      toast.success("Counter sent to the customer");
      onSubmitted?.();
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Counter failed");
    } finally { setBusy(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" data-testid="counter-modal">
      <div className="glass rounded-3xl border border-white/10 w-full max-w-md">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-heading font-semibold">Propose a new total</div>
              <div className="text-xs text-slate-500">One shot per job · cap {money(capCents)} (120%)</div>
            </div>
          </div>
          <button data-testid="counter-close" onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Customer's total</span>
            <span className="font-mono">{money(originalCents)}</span>
          </div>
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Your new total</div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">$</span>
              <input
                data-testid="counter-amount"
                type="number" step="0.01" min="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className={`w-full rounded-xl bg-slate-900 border pl-8 pr-3 py-2.5 font-mono text-right focus:outline-none ${
                  overCap ? "border-red-500/60 text-red-300" : "border-white/10 focus:border-amber-500/60"
                }`}
              />
            </div>
            {overCap && (
              <div className="mt-1.5 text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Above the 120% cap ({money(capCents)}) — will be rejected
              </div>
            )}
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Why (customer will see this)</div>
            <textarea
              data-testid="counter-reason"
              value={reason} onChange={(e) => setReason(e.target.value.slice(0, 400))} rows={3}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 focus:border-amber-500/60 focus:outline-none text-sm resize-none"
              placeholder="e.g. Parts shortage adds materials cost"
            />
          </label>
        </div>
        <div className="p-5 border-t border-white/10 flex items-center justify-end gap-2">
          <button data-testid="counter-cancel" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200 px-3 py-2">Cancel</button>
          <button
            data-testid="counter-submit"
            onClick={submit} disabled={busy || overCap || under || reason.trim().length < 8}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 text-slate-900 font-semibold px-5 py-2.5 hover:bg-amber-400 disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {busy ? "Sending…" : "Send counter"}
          </button>
        </div>
      </div>
    </div>
  );
}
