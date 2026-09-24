import { useEffect, useState } from "react";
import { http } from "@/lib/api";
import { Gift, Copy, Check, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function ReferralPanel() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    http.get("/referrals/me").then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return null;

  const shareUrl = `${window.location.origin}/r/${data.code}`;
  const shareText = `I'm using Craft Master Labs for NYC handyman work — snap a photo and their AI diagnoses the fix. Use my link to get $${(data.reward_cents / 100).toFixed(0)} credit: ${shareUrl}`;

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed — long-press to copy manually");
    }
  };

  return (
    <div data-testid="referral-panel" className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/25 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[10px] uppercase tracking-widest font-mono mb-2">
            <Gift className="w-3 h-3" /> Refer & earn
          </div>
          <h3 className="font-heading font-bold text-xl">Give $25, get $25</h3>
          <p className="text-sm text-slate-400 mt-1">
            Share your link — you both get ${(data.reward_cents / 100).toFixed(0)} credit when they complete their first paid job or start a Pro trial.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest font-mono text-slate-500">Balance</div>
          <div data-testid="referral-balance" className="font-heading font-bold text-2xl text-amber-300">
            ${(data.balance_cents / 100).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-slate-500 mb-1">
            <Users className="w-3 h-3" /> Referred
          </div>
          <div className="font-heading font-bold text-lg">{data.successful_referrals}</div>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-mono text-slate-500 mb-1">
            <DollarSign className="w-3 h-3" /> Monthly cap
          </div>
          <div className="font-heading font-bold text-lg">{data.monthly_cap}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-white/8 mb-3">
        <div data-testid="referral-code" className="flex-1 font-mono text-sm truncate px-2">{shareUrl}</div>
        <button
          data-testid="referral-copy-link-btn"
          onClick={() => copy(shareUrl)}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <div className="flex gap-2">
        <a
          data-testid="referral-share-sms"
          href={`sms:?&body=${encodeURIComponent(shareText)}`}
          className="flex-1 text-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium"
        >SMS</a>
        <a
          data-testid="referral-share-whatsapp"
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank" rel="noreferrer"
          className="flex-1 text-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium"
        >WhatsApp</a>
        <a
          data-testid="referral-share-x"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank" rel="noreferrer"
          className="flex-1 text-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium"
        >X</a>
      </div>
    </div>
  );
}
