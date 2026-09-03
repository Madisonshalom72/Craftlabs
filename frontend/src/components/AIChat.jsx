import { useState, useRef, useEffect } from "react";
import { API } from "@/lib/api";
import { MessageCircle, Send, Loader2, Sparkles } from "lucide-react";

export default function AIChat({ sessionId }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey — describe the issue in your own words. What's broken and where?" },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: userMsg }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() || "";
        for (const l of lines) {
          if (!l.startsWith("data: ")) continue;
          const payload = JSON.parse(l.slice(6));
          if (payload.delta) {
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + payload.delta };
              return copy;
            });
          }
        }
      }
    } catch (e) {
      setMessages(m => [...m.slice(0, -1), { role: "assistant", content: "Sorry — connection dropped. Try again." }]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div data-testid="ai-chat" className="glass rounded-3xl flex flex-col h-[520px]">
      <div className="p-5 border-b border-white/8 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="font-heading font-semibold text-base leading-none">AI Repair Concierge</div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-slate-500 mt-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Claude Sonnet · streaming
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((m, i) => (
          <div key={i} data-testid={`chat-msg-${m.role}-${i}`} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-amber-500 text-slate-900 font-medium"
                : "bg-slate-900/60 border border-white/8 text-slate-200"
            }`}>
              {m.content || (streaming && i === messages.length - 1 ? <span className="inline-flex gap-1 items-center"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /></span> : null)}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-white/8 flex gap-2">
        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Describe the issue…"
          className="flex-1 bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
        />
        <button
          data-testid="chat-send-btn"
          onClick={send}
          disabled={streaming || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-slate-900 font-semibold transition flex items-center gap-1.5"
        >
          {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
