import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, FileText, Loader2, ShieldCheck } from "lucide-react";
import { http, API } from "@/lib/api";

/**
 * ContractSignModal — one-screen "read + sign" for either party.
 * Props:
 *   jobId, open, onClose, onSigned, expectedName
 * Fetches the generated contract PDF and shows it in an iframe;
 * captures typed name + terms-agreed checkbox and posts to /contract/sign.
 */
export default function ContractSignModal({ jobId, open, onClose, onSigned, expectedName }) {
  const [meta, setMeta] = useState(null);
  const [typed, setTyped] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (!open || !jobId) return;
    // Trigger generation (idempotent) and hand the streaming URL to the iframe.
    http.post(`/jobs/${jobId}/contract/generate`)
      .then(({ data }) => {
        setMeta(data);
        setPdfUrl(`${API}/jobs/${jobId}/contract?ts=${Date.now()}`);
      })
      .catch((e) => toast.error(e?.response?.data?.detail || "Could not load contract"));
  }, [open, jobId]);

  useEffect(() => {
    if (open) { setTyped(""); setAgreed(false); }
  }, [open]);

  const sign = async () => {
    if (!agreed) return toast.error("Confirm you've read the terms first");
    if (typed.trim().length < 3) return toast.error("Type your full legal name");
    setSigning(true);
    try {
      const { data } = await http.post(`/jobs/${jobId}/contract/sign`, {
        typed_name: typed.trim(), agreed_terms: true,
      });
      toast.success(data.both_signed ? "Both parties signed. Proceed to payment." : "Signed — waiting on the other party");
      onSigned?.(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Signing failed");
    } finally {
      setSigning(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" data-testid="contract-modal">
      <div className="glass rounded-3xl border border-white/10 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-heading font-semibold">Service Agreement</div>
              <div className="text-xs text-slate-500">
                {meta?.source === "manual" ? "Custom PDF uploaded" : "Auto-generated · E-SIGN Act compliant"}
              </div>
            </div>
          </div>
          <button data-testid="contract-close" onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 bg-slate-950/60 border-b border-white/10 min-h-0">
          {pdfUrl ? (
            <iframe
              key={pdfUrl}
              src={pdfUrl}
              title="Service Agreement"
              className="w-full h-[52vh]"
              data-testid="contract-iframe"
            />
          ) : (
            <div className="flex items-center justify-center h-[52vh] text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading contract…
            </div>
          )}
        </div>

        <div className="p-5 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              data-testid="contract-agree"
              type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 accent-amber-500 w-4 h-4"
            />
            <span className="text-sm text-slate-300">
              I have read the itemized scope, payment terms, and terms &amp; conditions above.
            </span>
          </label>
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Type your full legal name</div>
            <input
              data-testid="contract-typed-name"
              value={typed} onChange={(e) => setTyped(e.target.value.slice(0, 100))}
              placeholder={expectedName || "First Last"}
              className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 focus:border-amber-500/60 focus:outline-none font-serif italic text-lg"
            />
            <div className="text-[10px] text-slate-500 mt-1">
              Your typed name + timestamp + IP address form a valid electronic signature under the U.S. E-SIGN Act.
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Payment unlocks after both parties sign.
            </div>
            <button
              data-testid="contract-sign-btn"
              onClick={sign} disabled={signing || !agreed || typed.trim().length < 3}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 text-slate-900 font-semibold px-5 py-2.5 hover:bg-amber-400 disabled:opacity-50"
            >
              {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {signing ? "Signing…" : "Sign contract"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
