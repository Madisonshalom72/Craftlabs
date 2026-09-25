import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/lib/api";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, RotateCcw, GitMerge, Loader2, ChevronLeft, User, Wrench, Clock } from "lucide-react";

const fmt = (c) => `$${((c || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rel = (iso) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function AdminDisputes() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("open");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get(`/admin/disputes?status=${filter}`);
      setRows(data.disputes || []);
    } catch (e) {
      if (e?.response?.status === 401) navigate("/admin/login", { replace: true });
      else toast.error(e?.response?.data?.detail || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const resolve = async (action, extra = {}) => {
    if (!active) return;
    setBusy(true);
    try {
      const { data } = await http.post("/admin/disputes/resolve", {
        dispute_id: active.dispute_id, action, ...extra,
      });
      toast.success(`Resolved (${data.outcome.action})`);
      setActive(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Resolution failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="admin-disputes" className="min-h-screen bg-craft-graphite text-slate-100">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        <button
          data-testid="back-admin"
          onClick={() => navigate("/admin")}
          className="text-xs font-mono uppercase tracking-widest text-slate-500 hover:text-amber-400 inline-flex items-center gap-1 mb-6"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to admin
        </button>

        <div className="flex items-baseline gap-4 mb-2">
          <h1 className="font-heading font-bold text-3xl lg:text-4xl">Dispute Console</h1>
          <span className="text-[10px] font-mono uppercase tracking-widest text-craft-lime">
            {rows.length} {filter}
          </span>
        </div>
        <p className="text-slate-400 text-sm max-w-xl mb-6">
          Resolve customer/contractor disputes by releasing funds, refunding, or splitting.
          Every action is logged in the admin audit trail.
        </p>

        <div className="inline-flex p-1 rounded-full bg-craft-slate border border-white/10 mb-5">
          {["open", "resolved", "all"].map((f) => (
            <button
              key={f}
              data-testid={`filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-widest font-mono rounded-full transition ${
                filter === f ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            <div className="text-sm text-slate-400">No {filter} disputes right now. Nice.</div>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map((d) => (
              <li
                key={d.dispute_id}
                data-testid={`dispute-${d.dispute_id}`}
                className="rounded-2xl border border-white/10 bg-craft-slate p-4 hover:border-amber-500/40 transition"
              >
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{d.job_title || `Job ${d.job_id.slice(0, 8)}`}</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">· {rel(d.created_at)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3 h-3 text-cyan-400" /> {d.customer_name}</span>
                      <span className="flex items-center gap-1"><Wrench className="w-3 h-3 text-amber-400" /> {d.contractor_name || "—"}</span>
                      <span className="font-mono text-craft-lime">{fmt(d.job_amount_cents)}</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] uppercase tracking-widest ${
                        d.escrow_status === "held" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30" :
                        d.escrow_status === "released" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" :
                        d.escrow_status === "refunded" ? "bg-slate-500/10 text-slate-300 border border-slate-500/30" :
                        "bg-red-500/10 text-red-300 border border-red-500/30"
                      }`}>
                        {d.escrow_status || "—"}
                      </span>
                    </div>
                    {d.reason && (
                      <p className="mt-2 text-sm text-slate-300 bg-slate-950/40 border border-white/5 rounded-lg px-3 py-2 max-w-xl">
                        &ldquo;{d.reason}&rdquo;
                      </p>
                    )}
                    {d.status === "resolved" && d.resolution_action && (
                      <div className="mt-2 text-[11px] font-mono uppercase tracking-widest text-emerald-400">
                        Resolved · {d.resolution_action} · {rel(d.resolved_at)}
                      </div>
                    )}
                  </div>
                  {d.status === "open" && (
                    <button
                      data-testid={`open-resolve-${d.dispute_id}`}
                      onClick={() => setActive(d)}
                      className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-semibold"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active && (
        <ResolveModal
          dispute={active}
          busy={busy}
          onClose={() => setActive(null)}
          onResolve={resolve}
        />
      )}
    </div>
  );
}

function ResolveModal({ dispute, busy, onClose, onResolve }) {
  const [action, setAction] = useState("release");
  const [splitPct, setSplitPct] = useState(50);
  const [notes, setNotes] = useState("");
  const total = dispute.job_amount_cents || 0;
  const contractorCents = Math.round((total * splitPct) / 100);
  const customerCents = total - contractorCents;

  const go = () => {
    if (action === "split") {
      onResolve("split", { split_contractor_cents: contractorCents, notes });
    } else {
      onResolve(action, { notes });
    }
  };

  const opts = [
    { id: "release", icon: ShieldCheck, label: "Release to contractor", sub: `Pay 90% (${fmt(Math.floor(total * 0.9))}) · keep 10% fee` },
    { id: "refund",  icon: RotateCcw,   label: "Full refund to customer", sub: `${fmt(total)} back to original method · no fee` },
    { id: "split",   icon: GitMerge,    label: "Split it",                sub: "Refund some, release the rest" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-lg bg-craft-slate border border-white/10 rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10">
          <div className="text-[10px] font-mono uppercase tracking-widest text-craft-lime mb-1">Resolve dispute</div>
          <div className="font-heading font-bold text-lg text-white">{dispute.job_title || `Job ${dispute.job_id.slice(0, 8)}`}</div>
          <div className="text-xs text-slate-400 mt-0.5 font-mono">{fmt(total)} · {dispute.customer_name} vs {dispute.contractor_name}</div>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            {opts.map((o) => {
              const Icon = o.icon;
              const on = action === o.id;
              return (
                <button
                  key={o.id}
                  data-testid={`resolve-${o.id}`}
                  onClick={() => setAction(o.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border transition flex items-start gap-3 ${
                    on ? "bg-amber-500/10 border-amber-500/60" : "bg-slate-950/40 border-white/10 hover:border-white/20"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 ${on ? "text-amber-400" : "text-slate-400"}`} />
                  <div>
                    <div className={`text-sm font-semibold ${on ? "text-white" : "text-slate-200"}`}>{o.label}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">{o.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {action === "split" && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-400">Contractor gets</span>
                <span className="font-mono text-craft-lime">{fmt(contractorCents)} · {splitPct}%</span>
              </div>
              <input
                type="range"
                data-testid="split-slider"
                min="0" max="100" step="5"
                value={splitPct}
                onChange={(e) => setSplitPct(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500"
              />
              <div className="flex items-center justify-between text-xs mt-2 text-slate-500">
                <span>Customer refund: <span className="font-mono text-white">{fmt(customerCents)}</span></span>
                <span>Fee kept: <span className="font-mono">{fmt(Math.floor(contractorCents * 0.1))}</span></span>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Admin notes</label>
            <textarea
              data-testid="resolve-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes for the audit trail…"
              className="mt-1 w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              data-testid="resolve-cancel"
              className="px-4 py-2 rounded-full border border-white/10 hover:border-white/20 text-slate-300 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={go}
              disabled={busy}
              data-testid="resolve-confirm"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-semibold text-sm"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
