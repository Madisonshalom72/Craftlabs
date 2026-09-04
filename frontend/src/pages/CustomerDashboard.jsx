import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import AIDiagnosticStudio from "@/components/AIDiagnosticStudio";
import AIChat from "@/components/AIChat";
import BookingChat from "@/components/BookingChat";
import ReviewModal from "@/components/ReviewModal";
import { http } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Sparkles, Star, MapPin, CheckCircle2, Loader2, Briefcase, Clock, DollarSign, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

const TIER_META = {
  quick_fix: { name: "Quick Fix", price: 75 },
  standard_repair: { name: "Standard", price: 150 },
  major_project: { name: "Major", price: 325 },
  emergency_call: { name: "Emergency", price: 500 },
};

export default function CustomerDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [diagnosis, setDiagnosis] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matching, setMatching] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [checkoutFor, setCheckoutFor] = useState(null);
  const [sessionId] = useState(() => `chat_${Math.random().toString(36).slice(2)}`);
  const [tab, setTab] = useState("diagnose");
  const [chatJob, setChatJob] = useState(null);
  const [reviewJob, setReviewJob] = useState(null);
  const [reviewedIds, setReviewedIds] = useState({});
  const [maxDistance, setMaxDistance] = useState(15);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);

  useEffect(() => {
    http.get("/skills").then(r => setAvailableSkills(r.data.slice(0, 12))).catch(() => {});
  }, []);

  const refreshBookings = async () => {
    const { data } = await http.get("/jobs?mine=true");
    setBookings(data);
    // Check review status
    const reviews = {};
    await Promise.all(data.filter(j => j.assigned_handyman_id).map(async (j) => {
      try {
        const { data: r } = await http.get(`/jobs/${j.job_id}/review`);
        if (r) reviews[j.job_id] = r;
      } catch {}
    }));
    setReviewedIds(reviews);
  };

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) refreshBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDiagnosis = async (d) => {
    setDiagnosis(d);
    setMatching(true);
    // Post a draft job then match
    try {
      const { data: job } = await http.post("/jobs", {
        category: d.category,
        title: d.issue,
        description: d.root_cause + (d.text_hint ? ` — ${d.text_hint}` : ""),
        photo_base64: d.photo_base64,
        ai_diagnosis: d,
        tier: d.recommended_tier || "standard_repair",
      });
      setCurrentJobId(job.job_id);
      const { data: ranked } = await http.post(`/jobs/${job.job_id}/match`);
      setMatches(ranked.map(r => ({ ...r, _job_id: job.job_id })));
      const list = await http.get("/jobs?mine=true");
      setBookings(list.data);
    } catch (e) {
      toast.error("Match engine failed");
    } finally {
      setMatching(false);
    }
  };

  // Re-fetch matches when distance slider OR selected skills change
  useEffect(() => {
    if (!currentJobId) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("max_distance", String(maxDistance));
        if (selectedSkills.length) params.set("skills", selectedSkills.join(","));
        const { data } = await http.post(`/jobs/${currentJobId}/match?${params.toString()}`);
        if (!cancelled) setMatches(data.map(r => ({ ...r, _job_id: currentJobId })));
      } catch {}
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [maxDistance, currentJobId, selectedSkills]);

  const toggleSkill = (name) => {
    setSelectedSkills(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const book = async (handyman) => {
    setCheckoutFor(handyman.user_id);
    try {
      const tier = diagnosis?.recommended_tier || "standard_repair";
      const { data } = await http.post("/payments/checkout", {
        lookup_key: tier,
        origin_url: window.location.origin,
        job_id: handyman._job_id,
        handyman_id: handyman.user_id,
      });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast.error("Checkout failed. Try again.");
      setCheckoutFor(null);
    }
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="ai-badge mb-2">Homeowner Portal</div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
              Hey, {user.name.split(" ")[0]}.
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Post a job in one photo. AI handles the rest.</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/8 w-fit">
          <button data-testid="tab-diagnose" onClick={() => setTab("diagnose")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "diagnose" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5"}`}>
            AI Diagnosis
          </button>
          <button data-testid="tab-chat" onClick={() => setTab("chat")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "chat" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5"}`}>
            AI Concierge
          </button>
          <button data-testid="tab-bookings" onClick={() => setTab("bookings")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "bookings" ? "bg-amber-500 text-slate-900" : "text-slate-300 hover:bg-white/5"}`}>
            My Jobs
          </button>
        </div>

        {tab === "diagnose" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <AIDiagnosticStudio onDiagnosis={handleDiagnosis} />
            </div>
            <div className="xl:col-span-4">
              <div data-testid="match-panel" className="glass rounded-3xl p-5 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="font-heading text-lg font-bold">Smart Matches</h3>
                </div>
                {diagnosis && (
                  <div data-testid="distance-filter" className="mb-4 p-3 rounded-2xl bg-slate-900/50 border border-white/8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> Within
                      </span>
                      <span data-testid="distance-value" className="font-mono text-xs text-amber-400 font-semibold">{maxDistance} mi</span>
                    </div>
                    <input
                      data-testid="distance-slider"
                      type="range"
                      min="1"
                      max="25"
                      step="1"
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-white/8 accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-slate-500 mt-1">
                      <span>1 mi</span><span>25 mi</span>
                    </div>
                  </div>
                )}
                {diagnosis && availableSkills.length > 0 && (
                  <div data-testid="skills-filter" className="mb-4 p-3 rounded-2xl bg-slate-900/50 border border-white/8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Skills · pick any
                      </span>
                      {selectedSkills.length > 0 && (
                        <button
                          data-testid="skills-clear-btn"
                          onClick={() => setSelectedSkills([])}
                          className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-amber-400 transition"
                        >
                          clear ({selectedSkills.length})
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableSkills.map(s => {
                        const active = selectedSkills.includes(s.name);
                        return (
                          <button
                            key={s.name}
                            data-testid={`skill-chip-${s.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`}
                            onClick={() => toggleSkill(s.name)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${
                              active
                                ? "bg-amber-500 text-slate-900 border-amber-500"
                                : "bg-white/5 text-slate-300 border-white/10 hover:border-amber-500/40"
                            }`}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {!diagnosis && (
                  <p className="text-sm text-slate-500">Run a diagnosis to see AI-ranked craftsmen for your job.</p>
                )}
                {matching && (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl shimmer bg-white/5" />)}
                  </div>
                )}
                {!matching && diagnosis && matches.length === 0 && (
                  <div data-testid="no-matches" className="text-center py-8">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm text-slate-400">No craftsmen within {maxDistance} miles.</p>
                    <p className="text-xs text-slate-500 mt-1">Try widening the search radius.</p>
                  </div>
                )}
                {!matching && matches.length > 0 && (
                  <div className="space-y-3">
                    {matches.slice(0, 5).map(m => (
                      <div key={m.user_id} data-testid={`match-${m.user_id}`} className="border border-white/8 hover:border-amber-500/40 rounded-2xl p-3 transition">
                        <div className="flex items-start gap-3">
                          <img src={m.picture} alt="" className="w-11 h-11 rounded-xl object-cover border border-amber-500/30" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-sm truncate">{m.name}</div>
                              {m.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{m.role_title}</div>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <span className="flex items-center gap-1 text-slate-300"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{m.rating}</span>
                              <span className="text-slate-500">·</span>
                              <span className="font-mono text-amber-400">${m.hourly_rate}/hr</span>
                              {m.distance_miles !== undefined && (
                                <>
                                  <span className="text-slate-500">·</span>
                                  <span data-testid={`distance-${m.user_id}`} className="flex items-center gap-1 text-cyan-400 font-mono">
                                    <MapPin className="w-3 h-3" />{m.distance_miles}mi
                                  </span>
                                </>
                              )}
                            </div>
                            {(m.matched_skills || []).length > 0 && (
                              <div data-testid={`matched-skills-${m.user_id}`} className="mt-2 flex flex-wrap gap-1">
                                {m.matched_skills.slice(0, 3).map(s => (
                                  <span key={s} className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" />{s}
                                  </span>
                                ))}
                                {m.score_reasons?.multi_skill_boost > 0 && (
                                  <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400">
                                    +{m.score_reasons.multi_skill_boost} boost
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Match</div>
                            <div className="font-heading text-lg font-bold text-emerald-400">{m.match_score}%</div>
                          </div>
                        </div>
                        <button
                          data-testid={`book-${m.user_id}`}
                          onClick={() => book(m)}
                          disabled={checkoutFor === m.user_id}
                          className="mt-3 w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-semibold transition disabled:opacity-50"
                        >
                          {checkoutFor === m.user_id ? "Redirecting…" : `Book · $${TIER_META[diagnosis?.recommended_tier || "standard_repair"].price}`}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div className="max-w-3xl">
            <AIChat sessionId={sessionId} />
          </div>
        )}

        {tab === "bookings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bookings.length === 0 && (
              <div className="text-slate-500 text-sm">No jobs yet. Run a diagnosis to post your first.</div>
            )}
            {bookings.map(j => (
              <div key={j.job_id} data-testid={`booking-${j.job_id}`} className="glass rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-amber-400" />
                  <span className="ai-badge">{j.category}</span>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full ml-auto ${j.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                    {j.status}
                  </span>
                </div>
                <h4 className="font-heading text-lg font-semibold">{j.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{j.description}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />${TIER_META[j.tier]?.price}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(j.created_at).toLocaleDateString()}</span>
                  {j.assigned_handyman_name && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{j.assigned_handyman_name}</span>}
                </div>
                {j.assigned_handyman_id && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-white/8">
                    <button
                      data-testid={`open-chat-${j.job_id}`}
                      onClick={() => setChatJob(j)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Chat
                    </button>
                    {reviewedIds[j.job_id] ? (
                      <span data-testid={`reviewed-${j.job_id}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                        <Star className="w-3.5 h-3.5 fill-emerald-400" /> {reviewedIds[j.job_id].rating}/5 reviewed
                      </span>
                    ) : (j.status === "paid" || j.status === "assigned" || j.status === "completed") ? (
                      <button
                        data-testid={`open-review-${j.job_id}`}
                        onClick={() => setReviewJob(j)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/12 hover:border-amber-500/40 text-slate-200 text-xs font-semibold transition"
                      >
                        <Star className="w-3.5 h-3.5" /> Leave Review
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {chatJob && (
        <BookingChat job={chatJob} currentUser={user} onClose={() => setChatJob(null)} />
      )}
      {reviewJob && (
        <ReviewModal job={reviewJob} onClose={() => setReviewJob(null)} onSubmitted={refreshBookings} />
      )}
    </div>
  );
}
