import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Star, MapPin, Clock, DollarSign, Sparkles, CheckCircle2, XCircle, Loader2, TrendingUp, Zap, Wallet,
} from "lucide-react";
import { toast } from "sonner";

export default function HandymanDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [leads, setLeads] = useState([]);
  const [tab, setTab] = useState("leads");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (user?.role !== "handyman") {
      // auto-assign role for logged-in user
      http.post("/auth/set-role", { role: "handyman" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: l }] = await Promise.all([
        http.get(`/handymen/${user.user_id}`),
        http.get("/jobs?leads=true"),
      ]);
      setProfile(p);
      setLeads(l);
    })();
  }, [user]);

  const acceptJob = async (job_id) => {
    try {
      await http.post(`/jobs/${job_id}/accept`);
      setLeads(l => l.filter(j => j.job_id !== job_id));
      toast.success("Job accepted — customer notified");
    } catch { toast.error("Could not accept"); }
  };

  const declineJob = (job_id) => {
    setLeads(l => l.filter(j => j.job_id !== job_id));
    toast("Lead dismissed");
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await http.put("/handymen/me", {
        role_title: profile.role_title, hourly_rate: Number(profile.hourly_rate),
        years_experience: Number(profile.years_experience), skills: profile.skills,
        service_area: profile.service_area, bio: profile.bio, available: profile.available,
      });
      setProfile(p => ({ ...p, ...data }));
      toast.success("Profile updated");
    } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };

  if (loading || !user || !profile) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;

  const earnings = leads.length * 0; // placeholder; real would compute from paid jobs
  const stats = [
    { label: "AI Leads Live", value: leads.length, icon: Zap, color: "text-amber-400" },
    { label: "Rating", value: profile.rating?.toFixed(2), icon: Star, color: "text-emerald-400" },
    { label: "Reviews", value: profile.reviews_count, icon: TrendingUp, color: "text-cyan-400" },
    { label: "Rate", value: `$${profile.hourly_rate}/hr`, icon: Wallet, color: "text-amber-400" },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="ai-badge mb-2">Craftsman Command</div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
              Welcome, {user.name.split(" ")[0]}.
            </h1>
            <p className="text-slate-400 mt-1 text-sm">{profile.role_title}</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Available</span>
            <input
              type="checkbox"
              data-testid="availability-toggle"
              checked={!!profile.available}
              onChange={async (e) => {
                setProfile(p => ({ ...p, available: e.target.checked }));
                await http.put("/handymen/me", { available: e.target.checked });
              }}
              className="w-11 h-6 rounded-full appearance-none bg-white/10 checked:bg-emerald-500 relative transition cursor-pointer
                before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:w-5 before:h-5 before:bg-white before:rounded-full before:transition
                checked:before:translate-x-5"
            />
          </label>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {stats.map(s => (
            <div key={s.label} data-testid={`stat-${s.label.replace(/\s+/g, '-').toLowerCase()}`} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="font-heading text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/8 w-fit">
          <button data-testid="tab-leads" onClick={() => setTab("leads")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "leads" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5"}`}>
            AI Job Leads
          </button>
          <button data-testid="tab-profile" onClick={() => setTab("profile")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "profile" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5"}`}>
            Profile Studio
          </button>
        </div>

        {tab === "leads" && (
          <div className="space-y-3">
            {leads.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <p className="text-slate-400 text-sm">No live leads right now. New matches will stream here in real time.</p>
              </div>
            )}
            {leads.map(j => (
              <div key={j.job_id} data-testid={`lead-${j.job_id}`} className="glass rounded-2xl p-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {j.photo_base64 && (
                    <div className="lg:col-span-3">
                      <img src={j.photo_base64} alt="" className="w-full h-32 lg:h-full object-cover rounded-xl border border-white/8" />
                    </div>
                  )}
                  <div className={j.photo_base64 ? "lg:col-span-6" : "lg:col-span-9"}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="ai-badge">{j.category}</span>
                      {j.ai_diagnosis?.severity && (
                        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                          {j.ai_diagnosis.severity}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-lg font-semibold">{j.title}</h3>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{j.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(j.created_at).toLocaleString()}</span>
                      {j.ai_diagnosis?.estimated_hours && <span className="flex items-center gap-1">≈{j.ai_diagnosis.estimated_hours}h</span>}
                    </div>
                  </div>
                  <div className="lg:col-span-3 flex flex-col gap-2">
                    <div className="text-right">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">AI Match</div>
                      <div className="font-heading text-2xl font-bold text-emerald-400">{j.match_score}%</div>
                    </div>
                    <button data-testid={`accept-${j.job_id}`} onClick={() => acceptJob(j.job_id)} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 text-sm font-semibold transition">
                      <CheckCircle2 className="w-4 h-4" /> Accept
                    </button>
                    <button data-testid={`decline-${j.job_id}`} onClick={() => declineJob(j.job_id)} className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/10 hover:border-white/20 text-slate-400 text-sm font-medium transition">
                      <XCircle className="w-4 h-4" /> Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "profile" && (
          <div className="glass rounded-3xl p-6 max-w-3xl">
            <h3 className="font-heading text-xl font-bold mb-4">Profile Studio</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Role Title" value={profile.role_title} onChange={v => setProfile(p => ({...p, role_title: v}))} testid="input-role-title" />
              <Field label="Hourly Rate (USD)" value={profile.hourly_rate} onChange={v => setProfile(p => ({...p, hourly_rate: v}))} testid="input-hourly-rate" />
              <Field label="Years Experience" value={profile.years_experience} onChange={v => setProfile(p => ({...p, years_experience: v}))} testid="input-experience" />
              <Field label="Service Area" value={profile.service_area} onChange={v => setProfile(p => ({...p, service_area: v}))} testid="input-service-area" />
              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5 block">Skills (comma separated)</label>
                <input
                  data-testid="input-skills"
                  value={(profile.skills || []).join(", ")}
                  onChange={(e) => setProfile(p => ({ ...p, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5 block">Bio</label>
                <textarea
                  data-testid="input-bio"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>
            <button
              data-testid="save-profile-btn"
              onClick={saveProfile}
              disabled={saving}
              className="mt-5 px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const Field = ({ label, value, onChange, testid }) => (
  <div>
    <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5 block">{label}</label>
    <input
      data-testid={testid}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
    />
  </div>
);
