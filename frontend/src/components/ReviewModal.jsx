import { useState } from "react";
import { http } from "@/lib/api";
import { Star, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ReviewModal({ job, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!rating) return toast.error("Pick a star rating");
    setSubmitting(true);
    try {
      await http.post(`/jobs/${job.job_id}/review`, { rating, comment });
      toast.success("Review submitted — thanks!");
      onSubmitted && onSubmitted();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not submit");
    } finally { setSubmitting(false); }
  };

  return (
    <div data-testid="review-modal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="glass rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="ai-badge mb-2">Review</div>
            <h3 className="font-heading text-xl font-bold">Rate {job.assigned_handyman_name || "your craftsman"}</h3>
            <p className="text-xs text-slate-400 mt-1">{job.title}</p>
          </div>
          <button data-testid="close-review-btn" onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 py-4">
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              data-testid={`star-${n}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110"
            >
              <Star className={`w-9 h-9 ${(hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-slate-600"}`} />
            </button>
          ))}
        </div>
        <div className="text-center font-mono text-xs uppercase tracking-widest text-slate-400 mb-4">
          {rating ? `${rating} / 5` : "tap a star"}
        </div>

        <textarea
          data-testid="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell other homeowners how it went…"
          rows={3}
          className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 mb-4"
        />

        <button
          data-testid="submit-review-btn"
          onClick={submit}
          disabled={submitting || !rating}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-900 font-semibold transition flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-slate-900" />}
          Submit Review
        </button>
      </div>
    </div>
  );
}
