import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http } from "@/lib/api";
import {
  ShieldCheck, ShieldAlert, ShieldX, Loader2, CheckCircle2, XCircle,
  Star, MapPin, Clock, FileText, ArrowRight, Filter, CheckSquare, Square, LogOut,
} from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "pending",  label: "Pending",  icon: ShieldAlert, tone: "amber" },
  { id: "approved", label: "Approved", icon: ShieldCheck, tone: "emerald" },
  { id: "rejected", label: "Rejected", icon: ShieldX,     tone: "red" },
];

export default function AdminLicenses() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState(null); // license image lightbox
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelect = (uid) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map(r => r.user_id)));
  };

  const approveBulk = async () => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    try {
      const { data } = await http.post("/admin/approve-bulk", { user_ids: ids });
      toast.success(`Approved ${data.approved} craftsmen · now live in matches`);
      setRows(r => r.filter(x => !selected.has(x.user_id)));
      setSelected(new Set());
    } catch { toast.error("Bulk approve failed"); }
    finally { setBulkBusy(false); }
  };

  const logout = async () => {
    try { await http.post("/admin/logout"); } catch { /* ignore */ }
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    http.get("/admin/session")
      .then(r => {
        if (r.data.authenticated) {
          setIsAdmin(true);
          setAdminUsername(r.data.username || "");
        } else {
          navigate("/admin/login", { replace: true });
        }
      })
      .catch(() => navigate("/admin/login", { replace: true }))
      .finally(() => setChecking(false));
  }, [navigate]);

  const fetchRows = async () => {
    setFetching(true);
    try {
      const { data } = await http.get(`/admin/pending-craftsmen?status=${tab}`);
      setRows(data);
    } catch (e) {
      if (e?.response?.status === 401) {
        navigate("/admin/login", { replace: true });
      } else {
        toast.error("Could not load queue");
      }
    } finally { setFetching(false); }
  };

  useEffect(() => { if (isAdmin) { fetchRows(); setSelected(new Set()); } /* eslint-disable-next-line */ }, [isAdmin, tab]);

  const approve = async (user_id) => {
    try {
      await http.post(`/admin/approve/${user_id}`);
      toast.success("Approved · now visible in matches");
      setRows(r => r.filter(x => x.user_id !== user_id));
    } catch { toast.error("Approve failed"); }
  };

  const reject = async (user_id) => {
    try {
      await http.post(`/admin/reject/${user_id}`, { reason });
      toast("Rejected — craftsman will be notified");
      setRows(r => r.filter(x => x.user_id !== user_id));
      setRejectingId(null); setReason("");
    } catch { toast.error("Reject failed"); }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;

  if (!isAdmin) {
    // Should have redirected; render nothing as a safety net
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Admin-only header (no customer Navbar) */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="font-heading font-bold text-sm">Craft Master Labs Admin</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-amber-400">console</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span data-testid="admin-username" className="hidden sm:inline text-xs font-mono text-slate-400">
              Signed in as <span className="text-amber-300">{adminUsername}</span>
            </span>
            <button
              data-testid="admin-logout-btn"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 hover:border-red-500/40 text-xs font-medium text-slate-300 hover:text-red-300 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
        <div className="ai-badge mb-2"><ShieldCheck className="w-3.5 h-3.5" /> Admin Console</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">License Review Queue</h1>
        <p className="text-slate-400 mt-1 text-sm">Approve craftsmen so they appear in customer matches. Reject with a reason for follow-up.</p>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 p-1 bg-white/5 rounded-xl border border-white/8 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              data-testid={`admin-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
              {tab === t.id && rows.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-900/40 text-[10px] font-mono">{rows.length}</span>}
            </button>
          ))}
        </div>

        {/* Bulk toolbar (only for pending tab) */}
        {tab === "pending" && rows.length > 0 && (
          <div data-testid="bulk-toolbar" className="mt-4 flex items-center gap-3 flex-wrap glass rounded-xl px-4 py-3">
            <button
              data-testid="bulk-select-all-btn"
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-300 hover:text-amber-400 transition"
            >
              {selected.size === rows.length && rows.length > 0
                ? <CheckSquare className="w-4 h-4 text-amber-400" />
                : <Square className="w-4 h-4" />}
              {selected.size === rows.length && rows.length > 0 ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
              {selected.size} of {rows.length} selected
            </span>
            <div className="flex-1" />
            <button
              data-testid="bulk-approve-btn"
              onClick={approveBulk}
              disabled={selected.size === 0 || bulkBusy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 text-sm font-semibold transition"
            >
              {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve selected{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
          </div>
        )}

        {/* List */}
        <div className="mt-6 space-y-3">
          {fetching && <div className="text-slate-400 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
          {!fetching && rows.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <Filter className="w-8 h-8 mx-auto mb-2 text-slate-500" />
              <p className="text-slate-400 text-sm">No {tab} craftsmen right now.</p>
            </div>
          )}
          {rows.map(c => (
            <div key={c.user_id} data-testid={`admin-row-${c.user_id}`} className={`glass rounded-2xl p-5 transition ${selected.has(c.user_id) ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-5 flex items-start gap-3">
                  {tab === "pending" && (
                    <button
                      data-testid={`admin-select-${c.user_id}`}
                      onClick={() => toggleSelect(c.user_id)}
                      className="flex-shrink-0 mt-1"
                      aria-label="Select craftsman"
                    >
                      {selected.has(c.user_id)
                        ? <CheckSquare className="w-5 h-5 text-amber-400" />
                        : <Square className="w-5 h-5 text-slate-500 hover:text-amber-400 transition" />}
                    </button>
                  )}
                  <img src={c.picture} alt="" className="w-14 h-14 rounded-xl object-cover border border-amber-500/30" />
                  <div className="min-w-0">
                    <div className="font-heading font-semibold text-base leading-tight">{c.name}</div>
                    <div className="text-xs text-amber-400">{c.role_title}</div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{c.service_area || "—"}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="font-mono text-amber-400">${c.hourly_rate}/hr</span>
                      <span>·</span>
                      <span>{c.years_experience}y exp</span>
                      {c.rating && (<><span>·</span><span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{c.rating}</span></>)}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(c.skills || []).slice(0, 5).map(s => (
                        <span key={s} className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">License</div>
                  <div className="text-sm text-slate-200 font-medium">{c.license_type || <span className="text-slate-500">not provided</span>}</div>
                  {c.license_number && (
                    <div className="text-xs text-slate-400 mt-1">Number: <span className="font-mono text-slate-200">{c.license_number}</span></div>
                  )}
                  {c.license_base64 ? (
                    c.license_base64.startsWith("data:image") ? (
                      <button
                        data-testid={`admin-view-license-${c.user_id}`}
                        onClick={() => setPreview(c.license_base64)}
                        className="mt-2 inline-flex items-center gap-2 group"
                      >
                        <img src={c.license_base64} alt="license" className="w-24 h-16 object-cover rounded-lg border border-white/10 group-hover:border-amber-500/50 transition" />
                        <span className="text-[11px] text-amber-400 group-hover:underline">view full</span>
                      </button>
                    ) : (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <FileText className="w-4 h-4 text-emerald-400" /> PDF uploaded
                      </div>
                    )
                  ) : (
                    <div className="mt-2 text-xs text-red-400">No license file</div>
                  )}
                  <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Submitted {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : "—"}
                  </div>
                  {c.rejection_reason && (
                    <div className="mt-2 text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                      {c.rejection_reason}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-3 flex flex-col gap-2">
                  {tab === "pending" && (
                    <>
                      <button
                        data-testid={`admin-approve-${c.user_id}`}
                        onClick={() => approve(c.user_id)}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-400 text-sm font-semibold transition"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </button>
                      <button
                        data-testid={`admin-reject-${c.user_id}`}
                        onClick={() => { setRejectingId(c.user_id); setReason(""); }}
                        className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-sm font-semibold transition"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                  {tab === "approved" && (
                    <>
                      <div className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Approved
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 text-center">
                        {c.verified_at ? new Date(c.verified_at).toLocaleDateString() : ""}
                      </div>
                    </>
                  )}
                  {tab === "rejected" && (
                    <button
                      data-testid={`admin-reopen-${c.user_id}`}
                      onClick={() => approve(c.user_id)}
                      className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-400 text-sm font-semibold transition"
                    >
                      Re-approve <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reject reason modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass rounded-3xl w-full max-w-md p-6">
            <h3 className="font-heading text-lg font-bold mb-2">Reject application</h3>
            <p className="text-xs text-slate-400 mb-4">The craftsman will see this note when they log in.</p>
            <textarea
              data-testid="admin-reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="e.g. License number doesn't match NYC DOB records. Please reupload with clearer photo."
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setRejectingId(null); setReason(""); }}
                className="px-4 py-2 rounded-full text-sm text-slate-300 hover:bg-white/5 transition"
              >Cancel</button>
              <button
                data-testid="admin-reject-confirm"
                onClick={() => reject(rejectingId)}
                className="px-5 py-2 rounded-full bg-red-500/90 hover:bg-red-500 text-white text-sm font-semibold transition"
              >Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* License lightbox */}
      {preview && (
        <div onClick={() => setPreview(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 cursor-zoom-out">
          <img src={preview} alt="license full" className="max-w-full max-h-full rounded-2xl border border-white/10" />
        </div>
      )}
    </div>
  );
}
