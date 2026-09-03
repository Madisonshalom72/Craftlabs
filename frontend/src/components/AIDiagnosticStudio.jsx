import { useState, useRef } from "react";
import { http } from "@/lib/api";
import { Upload, Loader2, ScanEye, AlertTriangle, Wrench, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_IMAGES = [
  { label: "Leaky Pipe", url: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80" },
  { label: "Broken Outlet", url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80" },
  { label: "HVAC Unit", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80" },
];

const SEVERITY_COLOR = { Low: "text-emerald-400", Medium: "text-amber-400", High: "text-orange-400", Critical: "text-red-400" };

export default function AIDiagnosticStudio({ onDiagnosis }) {
  const [image, setImage] = useState(null); // {base64, preview}
  const [hint, setHint] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage({ base64: reader.result, preview: reader.result });
    reader.readAsDataURL(file);
  };

  const loadSample = async (url) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setImage({ base64: reader.result, preview: reader.result });
        setLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      setLoading(false);
      toast.error("Could not load sample");
    }
  };

  const diagnose = async () => {
    if (!image) return toast.error("Upload or pick a photo first");
    setLoading(true);
    setResult(null);
    try {
      const { data } = await http.post("/ai/diagnose", { photo_base64: image.base64, text_hint: hint });
      setResult(data);
      onDiagnosis && onDiagnosis({ ...data, photo_base64: image.base64, text_hint: hint });
      toast.success("Diagnosis complete");
    } catch (e) {
      toast.error("AI diagnosis failed. Try a clearer image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="ai-diagnostic-studio" className="glass rounded-3xl p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="ai-badge mb-2"><ScanEye className="w-3.5 h-3.5" /> Vision Studio</div>
          <h3 className="font-heading text-2xl font-bold tracking-tight">AI Photo Diagnosis</h3>
          <p className="text-sm text-slate-400 mt-1">Snap it. Claude Sonnet reads it. Get a price in seconds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div
            data-testid="upload-dropzone"
            onClick={() => inputRef.current?.click()}
            className="relative aspect-video rounded-2xl border-2 border-dashed border-white/12 hover:border-amber-500/50 transition cursor-pointer overflow-hidden bg-slate-900/40"
          >
            {image?.preview ? (
              <>
                <img src={image.preview} alt="preview" className="w-full h-full object-cover" />
                {loading && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="shimmer w-32 h-1 rounded-full bg-white/5" />
                      <span className="font-mono text-xs uppercase tracking-widest text-amber-400">Scanning…</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Upload className="w-8 h-8" />
                <p className="text-sm font-medium">Click to upload a photo</p>
                <p className="text-xs text-slate-500">JPEG · PNG · WEBP</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              data-testid="upload-input"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_IMAGES.map(s => (
              <button
                key={s.label}
                data-testid={`sample-${s.label.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => loadSample(s.url)}
                className="px-3 py-1.5 rounded-full border border-white/10 hover:border-amber-500/40 text-xs font-medium text-slate-300 transition"
              >
                Sample: {s.label}
              </button>
            ))}
          </div>
          <textarea
            data-testid="hint-input"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Optional: describe what happened (e.g. 'started leaking last night')"
            rows={2}
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
          <button
            data-testid="diagnose-btn"
            onClick={diagnose}
            disabled={loading || !image}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanEye className="w-4 h-4" />}
            Run AI Diagnosis
          </button>
        </div>

        <div data-testid="diagnosis-result" className="bg-slate-900/40 border border-white/8 rounded-2xl p-5 min-h-[280px]">
          {!result && !loading && (
            <div className="h-full flex items-center justify-center text-center text-slate-500 text-sm">
              <div>
                <ScanEye className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Diagnosis will appear here.
              </div>
            </div>
          )}
          {loading && (
            <div className="space-y-3">
              <div className="h-4 rounded shimmer bg-white/5" />
              <div className="h-4 rounded shimmer bg-white/5 w-3/4" />
              <div className="h-4 rounded shimmer bg-white/5 w-1/2" />
            </div>
          )}
          {result && (
            <div className="space-y-4">
              <div>
                <div className="ai-badge mb-2">{result.category}</div>
                <h4 className="font-heading text-lg font-semibold leading-tight">{result.issue}</h4>
                <p className="text-xs text-slate-400 mt-1">{result.root_cause}</p>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-4 h-4 ${SEVERITY_COLOR[result.severity] || "text-amber-400"}`} />
                <span className={`text-sm font-semibold ${SEVERITY_COLOR[result.severity] || "text-amber-400"}`}>
                  {result.severity} severity
                </span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                    style={{ width: `${result.severity_score || 50}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-slate-400">{result.severity_score}/100</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/60 border border-white/8 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
                    <DollarSign className="w-3 h-3" /> Estimate
                  </div>
                  <div data-testid="price-range" className="font-heading text-lg font-bold text-amber-400">
                    ${result.estimated_price_min}–${result.estimated_price_max}
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-white/8 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
                    <Clock className="w-3 h-3" /> Time
                  </div>
                  <div className="font-heading text-lg font-bold">{result.estimated_hours}h</div>
                </div>
              </div>
              {result.parts_needed?.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                    <Wrench className="w-3 h-3" /> Parts
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.parts_needed.slice(0, 6).map(p => (
                      <span key={p} className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.diy_feasible && (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> DIY-feasible for handy homeowners
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
