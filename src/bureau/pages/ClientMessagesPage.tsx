import { useEffect, useRef, useState } from "react";
import { agentClientApi, type ClientConversation, type ClientMessage } from "../api";
import { useAuth } from "../BureauContext";
import { AnimatePresence, motion } from "framer-motion";

export function ClientMessagesPage() {
  const { user } = useAuth();
  const [convs, setConvs]     = useState<ClientConversation[]>([]);
  const [active, setActive]   = useState<ClientConversation | null>(null);
  const [msgs, setMsgs]       = useState<ClientMessage[]>([]);
  const [input, setInput]     = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval>>();

  async function loadConvs() {
    const list = await agentClientApi.conversations();
    setConvs(list);
  }

  async function loadThread(c: ClientConversation) {
    setActive(c);
    const thread = await agentClientApi.thread(c.id);
    setMsgs(thread);
    loadConvs();
  }

  useEffect(() => {
    loadConvs().catch(() => {});
    pollRef.current = setInterval(() => {
      loadConvs().catch(() => {});
      if (active) agentClientApi.thread(active.id).then(setMsgs).catch(() => {});
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [active?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !active || sending) return;
    setSending(true);
    const text = input.trim(); setInput("");
    try {
      await agentClientApi.reply(active.id, text);
      const thread = await agentClientApi.thread(active.id);
      setMsgs(thread);
    } catch { setInput(text); }
    finally { setSending(false); }
  }

  const totalUnread = convs.reduce((s, c) => s + (c.unread ?? 0), 0);
  const timeStr = (dt: string) => new Date(dt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Sidebar conversations */}
      <div className="w-72 shrink-0 flex flex-col">
        <div className="mb-4">
          <h1 className="font-display text-xl font-bold text-white flex items-center gap-2">
            Messages clients
            {totalUnread > 0 && <span className="rounded-full bg-coral text-white text-[10px] font-black px-2 py-0.5">{totalUnread}</span>}
          </h1>
          <p className="text-xs text-white/40 mt-0.5">{convs.length} conversation{convs.length > 1 ? "s" : ""}</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2">
          {convs.length === 0 && (
            <div className="text-center py-8 text-white/30 text-sm">Aucune conversation</div>
          )}
          {convs.map(c => (
            <button key={c.id} onClick={() => loadThread(c)}
              className={`w-full text-left rounded-xl p-3 transition ${
                active?.id === c.id ? "bg-lime/15 border border-lime/20" : "hover:bg-white/[0.04] border border-transparent"
              }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-br from-lime/40 to-lime/10 text-xs font-bold text-lime">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    {c.company && <p className="text-[10px] text-white/35 truncate">{c.company}</p>}
                  </div>
                </div>
                {c.unread > 0 && (
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-[10px] font-black text-white">
                    {c.unread}
                  </span>
                )}
              </div>
              {c.last_message && (
                <p className="mt-1.5 text-xs text-white/35 truncate pl-10">{c.last_message}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        {active ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lime/40 to-lime/10 text-sm font-black text-lime">
                {active.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">{active.name}</p>
                <p className="text-xs text-white/40">{active.email}{active.company ? ` · ${active.company}` : ""}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="rounded-full border border-lime/20 bg-lime/8 px-3 py-1 text-[10px] font-semibold text-lime/80">● Client actif</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <AnimatePresence>
                {msgs.map(m => {
                  const isAgent = m.sender_type === "agent";
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 ${isAgent ? "flex-row-reverse" : ""}`}>
                      <div className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold text-white ${
                        isAgent ? "bg-gradient-to-br from-coral to-violet" : "bg-gradient-to-br from-lime/50 to-lime/20 text-ink"
                      }`}>
                        {isAgent ? (m.agent_name?.charAt(0).toUpperCase() ?? "A") : active.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`max-w-[70%] flex flex-col ${isAgent ? "items-end" : "items-start"} gap-0.5`}>
                        {!isAgent && <p className="text-[10px] text-white/35 px-1 font-semibold">{active.name}</p>}
                        <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                          isAgent ? "rounded-tr-sm bg-coral/90 text-white" : "rounded-tl-sm border border-white/10 bg-white/[0.05] text-white/85"
                        }`}>
                          {m.content}
                        </div>
                        <span className="text-[10px] text-white/25 px-1">{timeStr(m.created_at)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendReply} className="border-t border-white/[0.06] p-4 flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)}
                placeholder={`Répondre à ${active.name}…`} disabled={sending}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-coral/50 focus:outline-none transition" />
              <button type="submit" disabled={!input.trim() || sending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-coral text-white hover:brightness-110 transition active:scale-95 disabled:opacity-30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 translate-x-0.5">
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-5xl mb-4">💬</div>
            <p className="font-semibold text-white">Sélectionnez une conversation</p>
            <p className="text-sm text-white/35 mt-1">Choisissez un client dans la liste pour voir ses messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
