import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http } from "@/lib/api";
import {
  ShieldCheck, Users, Zap, DollarSign, TrendingUp, Crown, LogOut, Loader2,
  BarChart3, ClipboardList, UserCog, Radio, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

function StatCard({ label, value, icon: Icon, hint, tone = "amber", testid }) {
  const tones = {
    amber: "text-amber-300",
    emerald: "text-emerald-300",
    red: "text-red-300",
    slate: "text-slate-200",
  };
  return (
    <div data-testid={testid} className="glass rounded-2xl p-5 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
        <Icon className={`w-4 h-4 ${tones[tone]}`} />
      </div>
      <div className={`font-heading text-3xl font-bold ${tones[tone]}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function fmtCents(cents) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [me, setMe] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [audit, setAudit] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("overview");
  const [newUser, setNewUser] = useState({ username: "", password: "", role: "reviewer" });
  const [creating, setCreating] = useState(false);

  const logout = async () => {
    try { await http.post("/admin/logout"); } catch { /* ignore */ }
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    http.get("/admin/session").then(r => {
      if (!r.data.authenticated) return navigate("/admin/login", { replace: true });
      setMe(r.data);
    }).catch(() => navigate("/admin/login", { replace: true })).finally(() => setChecking(false));
  }, [navigate]);

  useEffect(() => {
    if (!me) return;
    http.get("/admin/analytics").then(r => setAnalytics(r.data)).catch(() => toast.error("Failed to load analytics"));
    http.get("/admin/audit?limit=100").then(r => setAudit(r.data)).catch(() => {});
    http.get("/admin/users").then(r => setUsers(r.data)).catch(() => {});
  }, [me]);

  const createAdmin = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await http.post("/admin/users", newUser);
      toast.success(`Admin ${newUser.username} created`);
      setNewUser({ username: "", password: "", role: "reviewer" });
      const r = await http.get("/admin/users");
      setUsers(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create admin");
    } finally {
      setCreating(false);
    }
  };

  const toggleDisabled = async (u) => {
    try {
      await http.patch(`/admin/users/${u.username}`, { disabled: !u.disabled });
      toast.success(u.disabled ? "Admin re-enabled" : "Admin disabled");
      const r = await http.get("/admin/users");
      setUsers(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Update failed");
    }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;
  if (!me) return null;

  const isOwner = me.role === "owner";
  const TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "audit", label: "Audit log", icon: ClipboardList },
    ...(isOwner ? [{ id: "admins", label: "Admins", icon: UserCog }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Admin header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-white/8">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="font-heading font-bold text-sm">Craft Master Labs Admin</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-amber-400">console · {me.role}</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link data-testid="admin-goto-licenses" to="/admin/licenses" className="hidden sm:inline text-xs font-medium text-slate-300 hover:text-amber-300 transition">License queue →</Link>
            <Link data-testid="admin-goto-disputes" to="/admin/disputes" className="hidden sm:inline text-xs font-medium text-slate-300 hover:text-amber-300 transition">Disputes →</Link>
            <span data-testid="admin-username" className="hidden sm:inline text-xs font-mono text-slate-400">{me.username}</span>
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
        <div className="ai-badge mb-2"><BarChart3 className="w-3.5 h-3.5" /> Admin Dashboard</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">Business at a glance</h1>
        <p className="text-slate-400 mt-1 text-sm">Live metrics from the Craft Master Labs marketplace.</p>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 p-1 bg-white/5 rounded-xl border border-white/8 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              data-testid={`admin-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                tab === t.id ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && analytics && (
          <div data-testid="admin-overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard testid="stat-total-customers" label="Total customers" value={analytics.users.customers} icon={Users} hint={`+${analytics.users.new_this_week} this week`} tone="slate" />
              <StatCard testid="stat-total-handymen" label="Craftsmen" value={analytics.users.handymen} icon={Zap} tone="slate" />
              <StatCard testid="stat-active-subs" label="Active Pro subs" value={analytics.subscriptions.active} icon={Crown} hint={`${analytics.subscriptions.trialing} trialing`} tone="amber" />
              <StatCard testid="stat-mrr" label="Est. MRR" value={fmtCents(analytics.subscriptions.estimated_mrr_cents)} icon={TrendingUp} hint="From active + trialing subs" tone="emerald" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard testid="stat-onetime-rev" label="One-time revenue" value={fmtCents(analytics.revenue.onetime_cents)} icon={DollarSign} hint={`${analytics.revenue.onetime_count} paid jobs`} tone="emerald" />
              <StatCard testid="stat-jobs-week" label="Jobs this week" value={analytics.jobs.this_week} icon={Radio} hint={`${analytics.jobs.total} all-time`} tone="slate" />
              <StatCard testid="stat-pending-licenses" label="Pending licenses" value={analytics.pending_licenses} icon={AlertCircle} tone={analytics.pending_licenses > 0 ? "amber" : "slate"} />
              <StatCard testid="stat-past-due" label="Past-due subs" value={analytics.subscriptions.past_due} icon={AlertCircle} tone={analytics.subscriptions.past_due > 0 ? "red" : "slate"} />
            </div>
            <div className="glass rounded-2xl p-5 border border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Referrals</div>
              <div className="flex flex-wrap gap-8">
                <div><div className="text-3xl font-bold text-amber-300">{analytics.referrals.total_events}</div><div className="text-xs text-slate-500">Reward events</div></div>
                <div><div className="text-3xl font-bold text-amber-300">{analytics.referrals.referred_users}</div><div className="text-xs text-slate-500">Referred users</div></div>
              </div>
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div data-testid="admin-audit-panel" className="mt-6 glass rounded-2xl p-5 border border-white/10">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Recent admin activity</div>
            {audit.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center">No activity yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest font-mono text-slate-500 border-b border-white/8">
                      <th className="text-left py-2">When</th>
                      <th className="text-left py-2">Actor</th>
                      <th className="text-left py-2">Action</th>
                      <th className="text-left py-2">Target</th>
                      <th className="text-left py-2">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map(a => (
                      <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-2 text-slate-400 font-mono text-xs">{fmtDate(a.created_at)}</td>
                        <td className="py-2 text-amber-300 font-medium">{a.actor}</td>
                        <td className="py-2 font-mono text-xs">{a.action}</td>
                        <td className="py-2 text-slate-400 font-mono text-xs">{a.target || "—"}</td>
                        <td className="py-2 text-slate-500 font-mono text-xs">{a.ip || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "admins" && isOwner && (
          <div data-testid="admin-users-panel" className="mt-6 space-y-6">
            <div className="glass rounded-2xl p-5 border border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Add a new admin</div>
              <form onSubmit={createAdmin} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  data-testid="new-admin-username"
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="username"
                  required
                  className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
                />
                <input
                  data-testid="new-admin-password"
                  type="password"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="password (8+ chars)"
                  required
                  minLength={8}
                  className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
                />
                <select
                  data-testid="new-admin-role"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500/60"
                >
                  <option value="reviewer">Reviewer</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  data-testid="new-admin-submit"
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />}
                  Add admin
                </button>
              </form>
              <p className="mt-3 text-[11px] text-slate-500">Owners can add/disable admins. Reviewers can approve licenses and view analytics but can&apos;t manage other admins.</p>
            </div>
            <div className="glass rounded-2xl p-5 border border-white/10">
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">All admins</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest font-mono text-slate-500 border-b border-white/8">
                    <th className="text-left py-2">Username</th>
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Created</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.username} className="border-b border-white/5">
                      <td className="py-3 font-medium">{u.username}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${u.role === "owner" ? "bg-amber-500/15 text-amber-300" : "bg-slate-700/50 text-slate-300"}`}>{u.role}</span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-xs">{fmtDate(u.created_at)}</td>
                      <td className="py-3">
                        {u.disabled ? <span className="text-red-400 text-xs">Disabled</span> : <span className="text-emerald-400 text-xs">Active</span>}
                      </td>
                      <td className="py-3 text-right">
                        {u.username !== me.username && (
                          <button
                            data-testid={`toggle-admin-${u.username}`}
                            onClick={() => toggleDisabled(u)}
                            className={`text-xs px-2.5 py-1 rounded-full border ${u.disabled ? "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10" : "border-red-500/30 text-red-300 hover:bg-red-500/10"} transition`}
                          >
                            {u.disabled ? "Re-enable" : "Disable"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
