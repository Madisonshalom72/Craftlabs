import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2, Wand2, Loader2, ArrowRight } from "lucide-react";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const CATEGORIES = [
  "General", "Electrical", "Plumbing", "HVAC", "Carpentry", "Roofing",
  "Smart Home", "Painting", "Appliance Repair", "Locksmith",
];

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const money = (c) => `$${(Number(c || 0) / 100).toFixed(2)}`;

const blankItem = () => ({
  id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  label: "",
  category: "General",
  hours: 1,
  materials_cost_cents: 0,
  quantity: 1,
});

/**
 * BookingBuilder — the itemized customer flow.
 * 1. Pick state (locks the rate snapshot)
 * 2. Add line items (AI can seed them from a photo)
 * 3. Server prices each item and rolls up a total
 * 4. Submit → posted job → contract signing → payment page
 */
export default function BookingBuilder() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState("NY");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("General");
  const [items, setItems] = useState([blankItem()]);
  const [priced, setPriced] = useState(null); // {items, total_cents, pricing_snapshot}
  const [pricing, setPricing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?next=/book");
  }, [authLoading, user, navigate]);

  const addItem = () => setItems([...items, blankItem()]);
  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));
  const patch = (id, p) => setItems(items.map((i) => (i.id === id ? { ...i, ...p } : i)));

  // Auto-price whenever items change (debounced by state comparison)
  const priceKey = useMemo(
    () => JSON.stringify({ state, items: items.map((i) => ({ ...i, id: undefined })) }),
    [state, items]
  );

  useEffect(() => {
    let stale = false;
    const valid = items.every((i) => i.label && i.hours >= 0 && i.quantity >= 1);
    if (!valid) { setPriced(null); return; }
    setPricing(true);
    http.post("/pricing/estimate", {
      state,
      items: items.map(({ id, ...rest }) => ({ ...rest, hours: Number(rest.hours) || 0 })),
    })
      .then(({ data }) => { if (!stale) setPriced(data); })
      .catch((e) => { if (!stale) toast.error(e?.response?.data?.detail || "Pricing failed"); })
      .finally(() => { if (!stale) setPricing(false); });
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceKey]);

  const suggestFromPhoto = async (file) => {
    setAiBusy(true);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      setPhoto(b64);
      const { data } = await http.post("/ai/diagnose", { photo_base64: b64, text_hint: title });
      const seeds = [];
      if (data.issue) {
        seeds.push({
          ...blankItem(),
          label: data.issue.slice(0, 60),
          category: data.category || "General",
          hours: Math.max(0.5, Number(data.estimated_hours || 1)),
          materials_cost_cents: Math.max(0, Math.round((data.estimated_price_min || 40) * 20)),
        });
      }
      (data.parts_needed || []).slice(0, 2).forEach((p) => {
        seeds.push({ ...blankItem(), label: p.slice(0, 60), category: data.category || "General", hours: 0.5, materials_cost_cents: 2500 });
      });
      if (!seeds.length) throw new Error("no seeds");
      setItems(seeds);
      if (data.category) setCategory(data.category);
      if (data.issue && !title) setTitle(data.issue.slice(0, 80));
      toast.success("AI seeded your line items — tweak and submit");
    } catch (e) {
      toast.error("AI suggestion unavailable — add items manually");
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async () => {
    if (!priced) return toast.error("Fill every item name before submitting");
    if (!title.trim()) return toast.error("Add a short title");
    if (!location.trim()) return toast.error("Add the job location");
    setSubmitting(true);
    try {
      const { data } = await http.post("/jobs/itemized", {
        category, title: title.trim(), description: "", photo_base64: photo,
        location: location.trim(), state,
        items: items.map(({ id, ...rest }) => ({ ...rest, hours: Number(rest.hours) || 0 })),
      });
      toast.success(`Booked · ${money(data.quoted_amount_cents)}`);
      navigate(`/dashboard?job=${data.job_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto px-5 lg:px-8 pt-10 pb-24">
        <div className="mb-2 text-xs font-mono uppercase tracking-[0.2em] text-amber-400">
          Book a repair
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight">
          Line-by-line. No surprises.
        </h1>
        <p className="mt-3 text-slate-400 max-w-xl">
          Add what needs fixing. We price it against your state's labor + materials rates and lock the total before your card is charged.
        </p>

        {/* AI seed */}
        <div className="mt-8 glass rounded-3xl p-6 border border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Wand2 className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="font-heading font-semibold">AI-seed your items from a photo</div>
              <p className="text-sm text-slate-400 mt-1">Optional. Snap the broken thing → we suggest a starting list you can edit.</p>
              <div className="mt-3 flex gap-3 flex-wrap">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm border border-white/10" data-testid="booking-ai-photo">
                  <input
                    type="file" accept="image/*" className="hidden"
                    disabled={aiBusy}
                    onChange={(e) => e.target.files?.[0] && suggestFromPhoto(e.target.files[0])}
                  />
                  {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {aiBusy ? "Analysing…" : "Upload photo"}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Job meta */}
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Short title</div>
            <input
              data-testid="booking-title"
              value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 focus:border-amber-500/60 focus:outline-none"
              placeholder="e.g. Kitchen outlet + fan"
            />
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Category</div>
            <select
              data-testid="booking-category"
              value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 focus:border-amber-500/60 focus:outline-none"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Location</div>
            <input
              data-testid="booking-location"
              value={location} onChange={(e) => setLocation(e.target.value.slice(0, 120))}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 focus:border-amber-500/60 focus:outline-none"
              placeholder="e.g. Brooklyn, NY"
            />
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">State (locks pricing)</div>
            <select
              data-testid="booking-state"
              value={state} onChange={(e) => setState(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 focus:border-amber-500/60 focus:outline-none"
            >
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        {/* Line items table */}
        <div className="mt-8 glass rounded-3xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="font-heading font-semibold">Line items</div>
            <button
              data-testid="booking-add-item"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 text-sm rounded-full bg-amber-500 text-slate-900 font-semibold px-3.5 py-1.5 hover:bg-amber-400"
            ><Plus className="w-4 h-4" /> Add row</button>
          </div>
          <div className="divide-y divide-white/8">
            {items.map((it, idx) => {
              const p = priced?.items?.[idx];
              return (
                <div key={it.id} data-testid={`booking-row-${idx}`} className="p-4 grid sm:grid-cols-12 gap-3 items-center">
                  <input
                    data-testid={`booking-label-${idx}`}
                    value={it.label} onChange={(e) => patch(it.id, { label: e.target.value.slice(0, 60) })}
                    placeholder="e.g. Replace GFCI outlet"
                    className="sm:col-span-4 rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm focus:border-amber-500/60 focus:outline-none"
                  />
                  <select
                    value={it.category} onChange={(e) => patch(it.id, { category: e.target.value })}
                    className="sm:col-span-2 rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-sm focus:outline-none"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="sm:col-span-1">
                    <input
                      data-testid={`booking-hours-${idx}`}
                      type="number" step="0.25" min="0" max="40"
                      value={it.hours} onChange={(e) => patch(it.id, { hours: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 border border-white/10 px-2 py-2 text-sm text-right font-mono focus:outline-none"
                    />
                    <div className="text-[10px] text-slate-500 text-right mt-0.5">hrs</div>
                  </div>
                  <div className="sm:col-span-1">
                    <input
                      data-testid={`booking-qty-${idx}`}
                      type="number" min="1" max="20"
                      value={it.quantity} onChange={(e) => patch(it.id, { quantity: Math.max(1, parseInt(e.target.value || 1)) })}
                      className="w-full rounded-lg bg-slate-900 border border-white/10 px-2 py-2 text-sm text-right font-mono focus:outline-none"
                    />
                    <div className="text-[10px] text-slate-500 text-right mt-0.5">qty</div>
                  </div>
                  <div className="sm:col-span-2 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
                    <input
                      data-testid={`booking-materials-${idx}`}
                      type="number" min="0" step="1"
                      value={(it.materials_cost_cents / 100) || 0}
                      onChange={(e) => patch(it.id, { materials_cost_cents: Math.round(parseFloat(e.target.value || 0) * 100) })}
                      className="w-full rounded-lg bg-slate-900 border border-white/10 pl-6 pr-2 py-2 text-sm text-right font-mono focus:outline-none"
                    />
                    <div className="text-[10px] text-slate-500 text-right mt-0.5">materials</div>
                  </div>
                  <div className="sm:col-span-1 text-right font-mono text-sm text-amber-300" data-testid={`booking-subtotal-${idx}`}>
                    {p ? money(p.subtotal_cents) : "—"}
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <button
                      data-testid={`booking-remove-${idx}`}
                      onClick={() => removeItem(it.id)}
                      disabled={items.length === 1}
                      className="text-slate-500 hover:text-red-400 disabled:opacity-30"
                    ><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between bg-slate-950/40">
            <div className="text-xs text-slate-500">
              {pricing ? "Pricing…" : priced ? `${priced.pricing_snapshot.state} · $${priced.pricing_snapshot.labor_hourly_cents / 100}/hr · ${priced.pricing_snapshot.materials_markup_pct}% markup` : "Add items to see the total"}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Total</div>
              <div data-testid="booking-total" className="font-mono text-3xl font-bold text-amber-400">
                {priced ? money(priced.total_cents) : "$0.00"}
              </div>
            </div>
          </div>
        </div>

        <button
          data-testid="booking-submit"
          onClick={submit} disabled={submitting || !priced || pricing}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-500 text-slate-900 font-semibold px-6 py-3 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {submitting ? "Booking…" : `Book · ${priced ? money(priced.total_cents) : "$0.00"}`}
        </button>

        <p className="mt-4 text-xs text-slate-500 max-w-lg">
          Your card is <strong>not</strong> charged now. A contractor accepts (or counters), you both sign a contract, then you fund escrow. Funds hold until you approve the work.
        </p>
      </div>
    </div>
  );
}
