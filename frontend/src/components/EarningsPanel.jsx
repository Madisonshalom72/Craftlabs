import { useEffect, useState } from "react";
import { http } from "@/lib/api";
import { toast } from "sonner";
import { Wallet, Zap, Lock, Clock, TrendingUp, Loader2, ArrowUpRight, ChevronRight, ExternalLink } from "lucide-react";

const fmt = (c) => `$${((c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Contractor-facing earnings dashboard. Big available-balance number,
 * "Cash out now" instant payout, ledger below. Also handles the Connect
 * Express onboarding CTA when the contractor hasn't wired a payout account.
 */
export default function EarningsPanel() {
  const [data, setData] = useState(null);
  const [connect, setConnect] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [e, c] = await Promise.all([
        http.get("/earnings"),
        http.get("/connect/status"),
      ]);
      setData(e.data);
      setConnect(c.data);
    } catch (err) {
      // fine — could be no auth
    }
  };

  useEffect(() => { load(); }, []);

  const startConnect = async () => {
    setBusy(true);
    try {
      const { data: r } = await http.post("/connect/onboarding-link", { origin_url: window.location.origin });
      window.location.href = r.url;
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not start Stripe onboarding");
      setBusy(false);
    }
  };

  const cashOut = async () => {
    if (!window.confirm("Cash out available balance to your debit card now (1% Stripe fee, ~30 min)?")) return;
    setBusy(true);
    try {
      const { data: r } = await http.post("/payouts/instant");
      toast.success(`Instant payout of ${fmt(r.amount_cents)} on its way.`);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Payout failed");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="text-slate-500 text-sm">Loading earnings…</div>;

  const needsConnect = !connect?.connected || !connect?.payouts_enabled;
  const canCashOut = !needsConnect && data.available_cents > 0;

  return (
    <div data-testid="earnings-panel" className="space-y-5">
      {/* Balance hero */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-craft-slate to-slate-950 p-6 lg:p-7">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-craft-lime mb-1">Available balance</div>
            <div data-testid="available-balance" className="font-heading font-bold text-4xl lg:text-5xl text-white leading-none">
              {fmt(data.available_cents)}
            </div>
            <div className="text-xs text-slate-500 mt-2">USD · Stripe balance on your connected account</div>
          </div>
          <button
            data-testid="cash-out-btn"
            onClick={cashOut}
            disabled={!canCashOut || busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold text-sm transition"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Cash out now
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3 text-[11px] font-mono uppercase tracking-widest text-slate-500">
          <span className="flex items-center gap-1"><Wallet className="w-3 h-3 text-slate-400" /> Standard payout: free · 2 days</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-400" /> Instant: 1% fee · ~30 min</span>
        </div>
      </div>

      {/* Connect CTA */}
      {needsConnect && (
        <div data-testid="connect-cta" className="rounded-2xl border border-amber-500/40 bg-amber-500/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <div className="font-semibold text-amber-300 text-sm">Connect a payout account</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {connect?.connected
                ? "You started onboarding but Stripe still needs a few details before you can receive payouts."
                : "One quick step with Stripe (KYC + bank/debit) so your paychecks land."}
            </div>
          </div>
          <button
            data-testid="start-connect-btn"
            onClick={startConnect}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            {connect?.connected ? "Continue" : "Start payout setup"}
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="In escrow" icon={Lock} value={fmt(data.in_escrow_cents)} sub="Held pending customer approval" tone="cyan" />
        <StatCard label="Pending in Stripe" icon={Clock} value={fmt(data.stripe_pending_cents)} sub="Clears in ~2 days" tone="slate" />
        <StatCard label="Lifetime earned" icon={TrendingUp} value={fmt(data.lifetime_earned_cents)} sub="After platform fees" tone="lime" />
        <StatCard label="Fees paid" icon={ArrowUpRight} value={fmt(data.lifetime_fees_cents)} sub="10% platform take" tone="amber" />
      </div>

      {/* Ledger */}
      <div className="rounded-2xl border border-white/10 bg-craft-slate overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Ledger</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Last 50 entries</div>
        </div>
        {data.ledger.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-500 text-sm">
            No entries yet. Payouts will land here as jobs get released.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.ledger.map((row) => (
              <li key={row.entry_id} data-testid={`ledger-${row.entry_id}`} className="px-4 py-3 flex items-center justify-between text-sm hover:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-craft-lime/15 border border-craft-lime/30 flex items-center justify-center">
                    <ChevronRight className="w-3.5 h-3.5 text-craft-lime" />
                  </div>
                  <div>
                    <div className="font-medium text-white">Job payout · {row.job_id?.slice(0, 8)}</div>
                    <div className="text-[10px] font-mono text-slate-500">{new Date(row.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-craft-lime">+{fmt(row.amount_cents)}</div>
                  <div className="text-[10px] font-mono text-slate-500">fee −{fmt(row.platform_fee_cents)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const TONE_MAP = {
  cyan: "border-cyan-500/25 bg-cyan-500/5 text-cyan-300",
  lime: "border-lime-500/25 bg-lime-500/5 text-lime-300",
  amber: "border-amber-500/25 bg-amber-500/5 text-amber-300",
  slate: "border-white/10 bg-white/5 text-slate-300",
};

function StatCard({ label, icon: Icon, value, sub, tone = "slate" }) {
  return (
    <div className={`rounded-2xl border p-4 ${TONE_MAP[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="font-heading font-bold text-xl text-white mt-1.5 leading-none">{value}</div>
      <div className="text-[10px] font-mono text-slate-500 mt-1.5 uppercase tracking-widest">{sub}</div>
    </div>
  );
}
