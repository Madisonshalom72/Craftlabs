import { useState, useRef } from "react";
import { http } from "@/lib/api";
import { toast } from "sonner";
import {
  X, ArrowRight, ArrowLeft, Loader2, ShieldCheck, Upload, FileText, CheckCircle2, MapPin, Crosshair,
} from "lucide-react";

const ALL_SKILLS = [
  "Electrical", "Plumbing", "HVAC", "Carpentry", "Roofing", "Smart Home",
  "Windows", "Doors", "Stairs & Railings", "Painting", "Tile & Masonry",
  "Appliance Repair", "Deck & Fencing", "Locksmith", "General Repair",
  "Water Heaters", "EV Charging", "Drywall", "TV Mounting",
];

const LICENSE_TYPES = [
  "NYC Master Electrician",
  "NYC Master Plumber",
  "GC / HIC (DCA)",
  "NATE (HVAC)",
  "EPA Section 608",
  "ALOA Locksmith",
  "Other / State Certificate",
];

export default function CraftsmanOnboarding({ profile, onDone, onSkip }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({
    role_title: profile?.role_title || "",
    hourly_rate: profile?.hourly_rate || 65,
    years_experience: profile?.years_experience || 3,
    skills: profile?.skills || [],
    service_area: profile?.service_area || "",
    bio: profile?.bio || "",
    license_type: profile?.license_type || "",
    license_number: profile?.license_number || "",
    license_base64: profile?.license_base64 || "",
    lat: profile?.lat || null,
    lng: profile?.lng || null,
    agreement_accepted: false,
  });
  const [locBusy, setLocBusy] = useState(false);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      return toast.error("Geolocation isn't available in this browser");
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setLocBusy(false);
        toast.success("Location set — your map pin will be sharpened to street level");
      },
      (err) => {
        setLocBusy(false);
        const msg = err?.code === 1
          ? "Permission denied. You can still enter your service area manually."
          : "Couldn't get your location. Try again or enter it manually.";
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const toggleSkill = (s) =>
    setForm(f => ({
      ...f,
      skills: f.skills.includes(s) ? f.skills.filter(x => x !== s) : [...f.skills, s],
    }));

  const handleLicense = (file) => {
    if (!file) return;
    if (!/^(image\/(png|jpe?g|webp)|application\/pdf)$/i.test(file.type)) {
      return toast.error("Upload a JPG, PNG, WEBP, or PDF");
    }
    if (file.size > 2 * 1024 * 1024) return toast.error("File must be under 2MB");
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, license_base64: reader.result }));
    reader.readAsDataURL(file);
  };

  const canAdvance = () => {
    if (step === 1) return form.role_title && form.skills.length > 0 && form.hourly_rate;
    if (step === 2) return form.service_area && form.bio.length >= 30;
    if (step === 3) return form.license_type && form.license_base64 && form.agreement_accepted;
    return false;
  };

  const submit = async () => {
    setSaving(true);
    try {
      await http.put("/handymen/me", { ...form, onboarded: true });
      toast.success("Welcome to the guild!");
      onDone && onDone();
    } catch (e) {
      toast.error("Save failed. Check your fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="onboarding-modal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="glass rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/8 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <div className="ai-badge mb-1"><ShieldCheck className="w-3 h-3" /> Craftsman verification · Step {step}/3</div>
            <h2 className="font-heading text-xl font-bold">
              {step === 1 && "Your trade & rate"}
              {step === 2 && "Your service area"}
              {step === 3 && "License & agreement"}
            </h2>
          </div>
          <button data-testid="onboarding-skip" onClick={onSkip} className="p-2 rounded-full hover:bg-white/5 transition" aria-label="Close">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex gap-1.5">
            {[1,2,3].map(n => (
              <div key={n} className={`flex-1 h-1 rounded-full transition ${n <= step ? "bg-amber-500" : "bg-white/8"}`} />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <FieldLabel label="Trade title" testid="onboard-role-title">
                <input
                  value={form.role_title}
                  onChange={(e) => setForm(f => ({...f, role_title: e.target.value}))}
                  placeholder="e.g. Master Electrician & Smart Home Installer"
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                />
              </FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <FieldLabel label="Hourly rate (USD)" testid="onboard-rate">
                  <input
                    type="number" min="20" max="500"
                    value={form.hourly_rate}
                    onChange={(e) => setForm(f => ({...f, hourly_rate: Number(e.target.value)}))}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                  />
                </FieldLabel>
                <FieldLabel label="Years experience" testid="onboard-experience">
                  <input
                    type="number" min="0" max="60"
                    value={form.years_experience}
                    onChange={(e) => setForm(f => ({...f, years_experience: Number(e.target.value)}))}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                  />
                </FieldLabel>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                  Skills (pick at least 1)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SKILLS.map(s => {
                    const on = form.skills.includes(s);
                    return (
                      <button
                        key={s}
                        data-testid={`onboard-skill-${s.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`}
                        onClick={() => toggleSkill(s)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition font-medium ${
                          on ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-white/5 text-slate-300 border-white/10 hover:border-amber-500/40"
                        }`}
                      >{s}</button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <FieldLabel label="Service area (boroughs / neighborhoods)" testid="onboard-service-area">
                <input
                  value={form.service_area}
                  onChange={(e) => setForm(f => ({...f, service_area: e.target.value}))}
                  placeholder="e.g. Brooklyn, Queens, Manhattan"
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                />
              </FieldLabel>
              <div className="rounded-xl bg-slate-900/40 border border-white/10 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold">Sharpen your map pin</div>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
                        Share your rough location to appear on the Live Map at street level (fuzzed to ~1 km for privacy).
                      </p>
                      {form.lat && form.lng && (
                        <div data-testid="onboard-geo-set" className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Location set · {form.lat.toFixed(3)}, {form.lng.toFixed(3)}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    data-testid="onboard-use-location-btn"
                    type="button"
                    onClick={useMyLocation}
                    disabled={locBusy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition whitespace-nowrap disabled:opacity-50"
                  >
                    {locBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                    {form.lat ? "Update location" : "Use my location"}
                  </button>
                </div>
              </div>
              <FieldLabel label={`Bio (${form.bio.length}/500 · min 30 chars)`} testid="onboard-bio">
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm(f => ({...f, bio: e.target.value.slice(0, 500)}))}
                  rows={5}
                  placeholder="Tell homeowners what makes your work different. Mention certifications, signature projects, and turnaround time."
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/60"
                />
              </FieldLabel>
            </>
          )}

          {step === 3 && (
            <>
              <FieldLabel label="License / certification type" testid="onboard-license-type">
                <select
                  value={form.license_type}
                  onChange={(e) => setForm(f => ({...f, license_type: e.target.value}))}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                >
                  <option value="">— Pick one —</option>
                  {LICENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FieldLabel>
              <FieldLabel label="License number (optional)" testid="onboard-license-number">
                <input
                  value={form.license_number}
                  onChange={(e) => setForm(f => ({...f, license_number: e.target.value}))}
                  placeholder="e.g. 4471"
                  className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
                />
              </FieldLabel>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
                  Upload license (JPG · PNG · WEBP · PDF · max 2MB)
                </div>
                <div
                  data-testid="onboard-license-drop"
                  onClick={() => fileRef.current?.click()}
                  className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition p-6 ${form.license_base64 ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/12 hover:border-amber-500/50 bg-slate-900/40"}`}
                >
                  {form.license_base64 ? (
                    <div className="flex items-center gap-3">
                      {form.license_base64.startsWith("data:image") ? (
                        <img src={form.license_base64} alt="license preview" className="w-20 h-20 object-cover rounded-xl border border-white/10" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-emerald-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                          <CheckCircle2 className="w-4 h-4" /> License attached
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Click to replace</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Upload className="w-6 h-6" />
                      <p className="text-sm font-medium">Tap to upload your license</p>
                      <p className="text-xs text-slate-500">Encrypted at rest · reviewed within 24h</p>
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    data-testid="onboard-license-input"
                    onChange={(e) => handleLicense(e.target.files?.[0])}
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 mt-4 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="onboard-agreement"
                  checked={form.agreement_accepted}
                  onChange={(e) => setForm(f => ({...f, agreement_accepted: e.target.checked}))}
                  className="mt-0.5 w-4 h-4 rounded accent-amber-500"
                />
                <span>
                  I confirm my license is valid, I carry liability insurance, and I agree to
                  Craft Master Labs&apos;s craftsman agreement and 15% platform fee on booked jobs.
                </span>
              </label>
            </>
          )}
        </div>

        <div className="p-5 border-t border-white/8 flex items-center justify-between gap-3 sticky bottom-0 bg-slate-900/95 backdrop-blur">
          {step > 1 ? (
            <button
              data-testid="onboarding-back"
              onClick={() => setStep(s => s - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm text-slate-300 hover:bg-white/5 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}
          {step < 3 ? (
            <button
              data-testid="onboarding-next"
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 text-sm font-semibold transition"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              data-testid="onboarding-submit"
              onClick={submit}
              disabled={!canAdvance() || saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-900 text-sm font-semibold transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Submit for review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const FieldLabel = ({ label, testid, children }) => (
  <label data-testid={testid} className="block">
    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">{label}</div>
    {children}
  </label>
);
