import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Table as TableIcon, DollarSign, Loader2, Save } from "lucide-react";
import { http } from "@/lib/api";

const money = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

/**
 * AdminOps — 3-tab console for owner-role admins:
 *   1. Contractor Loader  (hand-create a contractor)
 *   2. Rates Table        (edit state labor $/hr + materials markup %)
 *   3. Price Override     (adjust an un-funded quote total)
 */
export default function AdminOps() {
  const [tab, setTab] = useState("contractors");
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-8 pb-24">
        <div className="mb-2 text-xs font-mono uppercase tracking-[0.2em] text-amber-400">Admin ops</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">Operator console</h1>

        <div className="mt-6 flex gap-2 flex-wrap border-b border-white/10">
          {[
            { k: "contractors", label: "Contractor loader", icon: UserPlus },
            { k: "rates",       label: "Rates table",       icon: TableIcon },
            { k: "override",    label: "Price override",    icon: DollarSign },
          ].map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              data-testid={`ops-tab-${k}`}
              onClick={() => setTab(k)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                tab === k ? "border-amber-500 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            ><Icon className="w-4 h-4" /> {label}</button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "contractors" && <ContractorLoader />}
          {tab === "rates" && <RatesTable />}
          {tab === "override" && <PriceOverride />}
        </div>
      </div>
    </div>
  );
}

// ---- Tab 1: Contractor Loader ----
function ContractorLoader() {
  const initial = {
    name: "", email: "", phone: "", service_state: "NY",
    skills: "", license_number: "", hourly_rate_cents: 8000, temp_password: "",
  };
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const patch = (p) => setF({ ...f, ...p });
  const submit = async () => {
    if (!f.name || !f.email || !f.temp_password) return toast.error("Name, email and temp password required");
    setBusy(true);
    try {
      const { data } = await http.post("/admin/contractors/create", {
        ...f,
        skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
        hourly_rate_cents: Math.round(Number(f.hourly_rate_cents) || 8000),
      });
      toast.success(`Created · ${data.email}`);
      setF(initial);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Create failed");
    } finally { setBusy(false); }
  };
  return (
    <div className="glass rounded-3xl border border-white/10 p-6 max-w-2xl">
      <div className="font-heading font-semibold mb-1">Hand-load a contractor</div>
      <p className="text-sm text-slate-400 mb-5">Provisions a fully-approved contractor. They get a "set your password" email; you share the temp password out-of-band.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Full name" value={f.name} onChange={(v) => patch({ name: v })} testId="ops-c-name" />
        <Field label="Email" type="email" value={f.email} onChange={(v) => patch({ email: v })} testId="ops-c-email" />
        <Field label="Phone (optional)" value={f.phone} onChange={(v) => patch({ phone: v })} testId="ops-c-phone" />
        <label className="block">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Service state</div>
          <select data-testid="ops-c-state" value={f.service_state} onChange={(e) => patch({ service_state: e.target.value })}
            className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 focus:outline-none">
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <Field label="Skills (comma-separated)" value={f.skills} onChange={(v) => patch({ skills: v })} placeholder="electrical, plumbing" testId="ops-c-skills" />
        <Field label="License #" value={f.license_number} onChange={(v) => patch({ license_number: v })} testId="ops-c-license" />
        <Field label="Hourly rate (¢)" type="number" value={f.hourly_rate_cents} onChange={(v) => patch({ hourly_rate_cents: v })} testId="ops-c-rate" />
        <Field label="Temp password (share out-of-band)" value={f.temp_password} onChange={(v) => patch({ temp_password: v })} testId="ops-c-temp" />
      </div>
      <button data-testid="ops-c-submit" onClick={submit} disabled={busy}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500 text-slate-900 font-semibold px-5 py-2.5 hover:bg-amber-400 disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        {busy ? "Creating…" : "Create contractor"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", testId }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">{label}</div>
      <input
        data-testid={testId} type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 focus:border-amber-500/60 focus:outline-none text-sm"
      />
    </label>
  );
}

// ---- Tab 2: Rates Table ----
function RatesTable() {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState({});
  useEffect(() => {
    http.get("/pricing/rates").then(({ data }) => setRows(data)).catch(() => toast.error("Rates load failed"));
  }, []);
  const patch = (state, k, v) => setRows(rows.map((r) => r.state === state ? { ...r, [k]: v, _dirty: true } : r));
  const save = async (row) => {
    setSaving({ ...saving, [row.state]: true });
    try {
      await http.put(`/admin/pricing/rates/${row.state}`, {
        labor_hourly_cents: Number(row.labor_hourly_cents),
        materials_markup_pct: Number(row.materials_markup_pct),
      });
      setRows(rows.map((r) => r.state === row.state ? { ...r, _dirty: false } : r));
      toast.success(`${row.state} saved`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving({ ...saving, [row.state]: false });
    }
  };
  return (
    <div className="glass rounded-3xl border border-white/10 overflow-hidden">
      <div className="max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 sticky top-0 z-10">
            <tr className="text-left uppercase text-[10px] tracking-wider text-slate-500">
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Labor ¢/hr</th>
              <th className="px-4 py-3">Materials markup %</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {rows.map((r) => (
              <tr key={r.state} data-testid={`ops-rate-row-${r.state}`} className={r._dirty ? "bg-amber-500/5" : ""}>
                <td className="px-4 py-2 font-mono font-semibold text-amber-400">{r.state}</td>
                <td className="px-4 py-2">
                  <input
                    data-testid={`ops-rate-labor-${r.state}`}
                    type="number" value={r.labor_hourly_cents}
                    onChange={(e) => patch(r.state, "labor_hourly_cents", e.target.value)}
                    className="w-28 rounded-lg bg-slate-900 border border-white/10 px-2 py-1.5 text-right font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 ml-2">= {money(r.labor_hourly_cents)}/hr</span>
                </td>
                <td className="px-4 py-2">
                  <input
                    data-testid={`ops-rate-markup-${r.state}`}
                    type="number" value={r.materials_markup_pct}
                    onChange={(e) => patch(r.state, "materials_markup_pct", e.target.value)}
                    className="w-20 rounded-lg bg-slate-900 border border-white/10 px-2 py-1.5 text-right font-mono focus:outline-none"
                  />
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">{(r.updated_at || "").slice(0, 10)} · {r.updated_by || "seed"}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    data-testid={`ops-rate-save-${r.state}`}
                    onClick={() => save(r)} disabled={!r._dirty || saving[r.state]}
                    className="inline-flex items-center gap-1.5 text-xs rounded-full bg-amber-500 text-slate-900 font-semibold px-3 py-1.5 hover:bg-amber-400 disabled:opacity-30"
                  >
                    {saving[r.state] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Tab 3: Price Override ----
function PriceOverride() {
  const [jobId, setJobId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!jobId || !amount || !reason || reason.length < 8) {
      return toast.error("Job id, new total and reason (min 8 chars) required");
    }
    setBusy(true);
    try {
      const cents = Math.round(parseFloat(amount) * 100);
      await http.patch(`/admin/jobs/${jobId}/pricing`, { total_cents: cents, reason });
      toast.success(`Job ${jobId} → ${money(cents)}`);
      setJobId(""); setAmount(""); setReason("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Override failed");
    } finally { setBusy(false); }
  };
  return (
    <div className="glass rounded-3xl border border-white/10 p-6 max-w-2xl">
      <div className="font-heading font-semibold mb-1">Adjust an un-funded quote</div>
      <p className="text-sm text-slate-400 mb-5">Funded / held / released jobs are read-only — use the disputes console instead.</p>
      <div className="space-y-3">
        <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="job_xxxxxxxxxxxx" testId="ops-pv-job" />
        <Field label="New total ($)" type="number" value={amount} onChange={setAmount} placeholder="e.g. 425.50" testId="ops-pv-amount" />
        <label className="block">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Reason (audit log)</div>
          <textarea
            data-testid="ops-pv-reason"
            value={reason} onChange={(e) => setReason(e.target.value.slice(0, 400))} rows={3}
            className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 focus:border-amber-500/60 focus:outline-none text-sm resize-none"
            placeholder="e.g. Customer service credit — waived materials markup on second-attempt fix"
          />
        </label>
      </div>
      <button data-testid="ops-pv-submit" onClick={submit} disabled={busy}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500 text-slate-900 font-semibold px-5 py-2.5 hover:bg-amber-400 disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
        {busy ? "Applying…" : "Apply override"}
      </button>
    </div>
  );
}
