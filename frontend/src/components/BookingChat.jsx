import { useEffect, useRef, useState } from "react";
import { http } from "@/lib/api";
import { Send, Loader2, MessageSquare, X, Wrench } from "lucide-react";
import { toast } from "sonner";

export default function BookingChat({ job, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef();
  const pollRef = useRef();

  const fetchMessages = async () => {
    try {
      const { data } = await http.get(`/jobs/${job.job_id}/messages`);
      setMessages(data);
    } catch (e) { /* silent poll fail */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3500);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.job_id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const { data } = await http.post(`/jobs/${job.job_id}/messages`, { content: text });
      setMessages(m => [...m, data]);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Send failed");
      setInput(text);
    } finally { setSending(false); }
  };

  const otherName = currentUser.user_id === job.customer_id
    ? (job.assigned_handyman_name || "Craftsman")
    : (job.customer_name || "Homeowner");

  return (
    <div data-testid="booking-chat-modal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="glass rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg h-[80vh] sm:h-[600px] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/8 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading font-semibold text-base leading-tight truncate">{otherName}</div>
            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
              <Wrench className="w-3 h-3" /> {job.title}
            </div>
          </div>
          <button data-testid="close-chat-btn" onClick={onClose} className="p-2 rounded-full hover:bg-white/5 transition">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-8">
              No messages yet — say hi to kick things off.
            </div>
          )}
          {messages.map(m => {
            const isMe = m.sender_id === currentUser.user_id;
            return (
              <div key={m.message_id} data-testid={`msg-${m.message_id}`} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  isMe ? "bg-amber-500 text-slate-900 font-medium" : "bg-slate-900/60 border border-white/8 text-slate-200"
                }`}>
                  <div>{m.content}</div>
                  <div className={`text-[10px] mt-1 ${isMe ? "text-slate-800/60" : "text-slate-500"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-white/8 flex gap-2">
          <input
            data-testid="booking-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            className="flex-1 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60"
          />
          <button
            data-testid="booking-chat-send-btn"
            onClick={send}
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-900 font-semibold transition flex items-center gap-1.5"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
