import { useEffect, useRef, useState } from "react";
import { chatApi, type ChatMessage } from "../api";
import { useAuth } from "../BureauContext";
import { motion, AnimatePresence } from "framer-motion";

export function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const lastIdRef = useRef(0);

  async function loadMessages(initial = false) {
    const since = initial ? undefined : lastIdRef.current;
    const msgs = await chatApi.list(since);
    if (initial) {
      setMessages(msgs);
    } else {
      setMessages(prev => [...prev, ...msgs]);
    }
    if (msgs.length) lastIdRef.current = msgs[msgs.length - 1].id;
  }

  useEffect(() => {
    loadMessages(true).catch(() => {});
    pollRef.current = setInterval(() => loadMessages().catch(() => {}), 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    const text = input.trim();
    setInput("");
    try {
      const res = await chatApi.send(text);
      setMessages(prev => [...prev, res.message]);
      lastIdRef.current = res.message.id;
    } catch { setInput(text); }
    finally { setLoading(false); }
  }

  const timeStr = (dt: string) => new Date(dt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = (dt: string) => new Date(dt).toLocaleDateString("fr-FR", { day:"numeric",month:"long" });

  let lastDate = "";

  return (
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 8rem)" }}>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-white">Chat interne</h1>
        <p className="text-sm text-white/40 mt-0.5">Canal général NUMAFRIQ</p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/25 text-sm">Aucun message. Soyez le premier à écrire !</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            const d = dateStr(msg.created_at);
            const showDate = d !== lastDate;
            lastDate = d;
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/25 bg-white/5 rounded-full px-3 py-1">{d}</span>
                  </div>
                )}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                    isMe ? "bg-gradient-to-br from-coral to-violet" : "bg-gradient-to-br from-violet/60 to-lime/60"
                  }`}>
                    {msg.sender_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[72%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!isMe && <p className="text-[10px] text-white/35 font-semibold px-1">{msg.sender_name}</p>}
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                      isMe ? "rounded-tr-sm bg-coral/90 text-white" : "rounded-tl-sm bg-white/[0.06] border border-white/10 text-white/85"
                    }`}>
                      {msg.content}
                    </div>
                    <p className="text-[10px] text-white/25 px-1">{timeStr(msg.created_at)}</p>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-3">
        <input
          value={input} onChange={e => setInput(e.target.value)}
          placeholder="Écrivez un message…" disabled={loading}
          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white placeholder:text-white/25 focus:border-coral/50 focus:outline-none focus:ring-1 focus:ring-coral/20 transition"
        />
        <button type="submit" disabled={!input.trim() || loading}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral text-white hover:brightness-110 transition active:scale-95 disabled:opacity-30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 translate-x-0.5">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
