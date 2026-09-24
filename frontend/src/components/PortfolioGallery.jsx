import { useEffect, useRef, useState } from "react";
import { API, http } from "@/lib/api";
import { toast } from "sonner";
import { Upload, Sparkles, Loader2, Trash2, Wand2, Image as ImageIcon } from "lucide-react";

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export default function PortfolioGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiRemaining, setAiRemaining] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await http.get("/portfolio/me/items");
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onPickFile = () => fileRef.current?.click();

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) {
      toast.error("Only JPG / PNG / WEBP / GIF are allowed");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File exceeds the 50 MB limit");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("kind", "portfolio");
      const { data: up } = await http.post("/uploads", form, {
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      await http.post("/portfolio", {
        file_id: up.file_id,
        title: f.name.replace(/\.[^.]+$/, "").slice(0, 60),
      });
      toast.success("Added to your portfolio");
      await load();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const generateMockup = async () => {
    const prompt = aiPrompt.trim();
    if (prompt.length < 10) {
      toast.error("Describe the mockup in at least 10 characters");
      return;
    }
    setAiBusy(true);
    try {
      const { data } = await http.post("/ai/image/generate", {
        prompt,
        kind: "portfolio",
        save_to_portfolio: true,
        title: prompt.slice(0, 60),
      });
      setAiRemaining(data.remaining_today);
      setAiPrompt("");
      toast.success("AI mockup added to your portfolio");
      await load();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Image generation failed";
      toast.error(msg);
    } finally {
      setAiBusy(false);
    }
  };

  const remove = async (item_id) => {
    if (!window.confirm("Remove this portfolio item?")) return;
    try {
      await http.delete(`/portfolio/${item_id}`);
      setItems(prev => prev.filter(i => i.item_id !== item_id));
      toast("Removed");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div data-testid="portfolio-gallery" className="glass rounded-3xl p-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h3 className="font-heading text-xl font-bold">Portfolio Gallery</h3>
          <p className="text-xs text-slate-500 mt-0.5">Show off your best work. Up to 50 MB per image.</p>
        </div>
        <div className="flex gap-2">
          <button
            data-testid="portfolio-upload-btn"
            onClick={onPickFile}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? `Uploading ${progress}%` : "Upload photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={onFile}
            className="hidden"
            data-testid="portfolio-file-input"
          />
        </div>
      </div>

      {/* AI mockup generator */}
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 mb-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-mono uppercase tracking-widest mb-2">
          <Wand2 className="w-3.5 h-3.5" />
          AI before/after mockup · powered by Nano Banana
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            data-testid="ai-prompt-input"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Bathroom after full remodel: quartz vanity, matte-black fixtures, walk-in glass shower"
            maxLength={1000}
            className="flex-1 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/60"
          />
          <button
            data-testid="ai-generate-btn"
            onClick={generateMockup}
            disabled={aiBusy || aiPrompt.trim().length < 10}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-white text-slate-900 font-semibold text-sm transition disabled:opacity-50"
          >
            {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiBusy ? "Generating…" : "Generate"}
          </button>
        </div>
        {aiRemaining !== null && (
          <p className="text-[11px] text-slate-500 mt-2 font-mono">
            {aiRemaining} generations left today
          </p>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div data-testid="portfolio-empty" className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-400">No portfolio pieces yet. Upload a photo or generate an AI mockup.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((it) => (
            <div
              key={it.item_id}
              data-testid={`portfolio-item-${it.item_id}`}
              className="relative group rounded-2xl overflow-hidden border border-white/10 aspect-square bg-slate-900/60"
            >
              <img
                src={`${API}${it.url}`}
                alt={it.title || "Portfolio"}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.opacity = "0.2"; }}
              />
              {it.is_ai_generated && (
                <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-slate-900 text-[10px] font-bold font-mono uppercase tracking-widest">
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </div>
              )}
              <button
                data-testid={`portfolio-remove-${it.item_id}`}
                onClick={() => remove(it.item_id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                aria-label="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {it.title && (
                <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-gradient-to-t from-slate-900/90 to-transparent text-xs text-white truncate">
                  {it.title}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
