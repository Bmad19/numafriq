import { useEffect, useRef, useState, useCallback } from "react";
import { chatApi, usersApi, dmChannel, type ChatMessage, type BureauUser } from "../api";
import { useAuth } from "../BureauContext";
import { motion, AnimatePresence } from "framer-motion";

// ── Canaux publics ────────────────────────────────────────────────────────────
const PUBLIC_CHANNELS = [
  { id: "general",    label: "Général",    icon: "💬", desc: "Canal principal" },
  { id: "projets",    label: "Projets",    icon: "📁", desc: "Suivi des projets" },
  { id: "design",     label: "Design",     icon: "🎨", desc: "UI/UX & branding" },
  { id: "marketing",  label: "Marketing",  icon: "📈", desc: "Croissance & SEO" },
  { id: "admin",      label: "Admin",      icon: "⚙️",  desc: "Infos internes" },
];

export function ChatPage() {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState("general");
  const [messages, setMessages]           = useState<ChatMessage[]>([]);
  const [input, setInput]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [agents, setAgents]               = useState<BureauUser[]>([]);
  const [showUsers, setShowUsers]         = useState(false);
  const [unreadDms, setUnreadDms]         = useState<Record<string, number>>({});
  const bottomRef  = useRef<HTMLDivElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval>>();
  const lastIdRef  = useRef(0);
  const inputRef   = useRef<HTMLInputElement>(null);

  // ── Chargement des agents pour les DMs ─────────────────────────────────────
  useEffect(() => {
    usersApi.list().then(u => setAgents(u.filter(a => a.id !== user?.id))).catch(() => {});
  }, [user]);

  // ── Chargement/polling des messages ────────────────────────────────────────
  const loadMessages = useCallback(async (initial = false) => {
    if (!user) return;
    const since = initial ? undefined : lastIdRef.current;
    const msgs = await chatApi.list(since, activeChannel);
    if (initial) {
      setMessages(msgs);
      lastIdRef.current = msgs.length ? msgs[msgs.length - 1].id : 0;
    } else if (msgs.length) {
      setMessages(prev => [...prev, ...msgs]);
      lastIdRef.current = msgs[msgs.length - 1].id;
    }
  }, [activeChannel, user]);

  useEffect(() => {
    lastIdRef.current = 0;
    setMessages([]);
    loadMessages(true).catch(() => {});
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages().catch(() => {}), 3000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  // ── Polling unread DMs ─────────────────────────────────────────────────────
  useEffect(() => {
    const poll = () => chatApi.unreadDms().then(setUnreadDms).catch(() => {});
    poll();
    const t = setInterval(poll, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Envoi de message ──────────────────────────────────────────────────────
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      const res = await chatApi.send(text, activeChannel);
      if (res.message) {
        setMessages(prev => [...prev, res.message]);
        lastIdRef.current = res.message.id;
      }
    } catch { setInput(text); }
    finally { setSending(false); inputRef.current?.focus(); }
  }

  // ── Ouvrir un DM ─────────────────────────────────────────────────────────
  function openDm(agent: BureauUser) {
    if (!user) return;
    const ch = dmChannel(user.id, agent.id);
    setActiveChannel(ch);
    setShowUsers(false);
    // Effacer le badge unread pour ce canal
    setUnreadDms(prev => { const n = {...prev}; delete n[ch]; return n; });
  }

  const isDm    = activeChannel.startsWith("dm:");
  const pubChan = PUBLIC_CHANNELS.find(c => c.id === activeChannel);

  // Pour les DMs, trouver l'autre agent
  let dmAgent: BureauUser | undefined;
  if (isDm && user) {
    const otherId = activeChannel.replace("dm:", "").split("-").map(Number).find(id => id !== user.id);
    dmAgent = agents.find(a => a.id === otherId);
  }

  const channelTitle = isDm
    ? (dmAgent?.full_name ?? "Message privé")
    : (pubChan?.label ?? activeChannel);

  const totalUnreadDms = Object.values(unreadDms).reduce((s, v) => s + v, 0);

  // ── Formatage dates ───────────────────────────────────────────────────────
  const timeStr = (dt: string) => new Date(dt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = (dt: string) => new Date(dt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  let lastDate = "";

  // ── Initiales avatar ─────────────────────────────────────────────────────
  const initials = (name?: string) => (name ?? "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const avatarColors = [
    "from-coral to-violet",
    "from-lime/90 to-mist/50",
    "from-violet to-coral/80",
    "from-mist/50 to-coral/40",
  ];
  const avatarColor = (id: number) => avatarColors[id % avatarColors.length];

  return (
    <div className="flex h-full gap-0 rounded-2xl overflow-hidden border border-white/[0.08]" style={{ height: "calc(100vh - 7rem)" }}>

      {/* ── Sidebar canaux ─────────────────────────────────────────────── */}
      <div className="w-56 shrink-0 bg-white/[0.02] border-r border-white/[0.07] flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/55">Chat Interne</p>
        </div>

        {/* Canaux publics */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/48">Canaux</p>
          {PUBLIC_CHANNELS.map(ch => (
            <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-all rounded-lg mx-1 ${
                activeChannel === ch.id
                  ? "bg-coral/15 text-coral"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
              }`}>
              <span className="text-base leading-none">{ch.icon}</span>
              <span className="text-sm font-medium truncate"># {ch.label}</span>
            </button>
          ))}

          {/* Messages privés */}
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <div className="flex items-center justify-between px-4 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/48">Privés</p>
              <div className="flex items-center gap-1">
                {totalUnreadDms > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-coral text-[9px] font-bold text-white px-1">
                    {totalUnreadDms}
                  </span>
                )}
                <button onClick={() => setShowUsers(v => !v)}
                  className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-white/10 text-white/40 hover:text-white transition text-sm">
                  +
                </button>
              </div>
            </div>

            {/* Liste agents DM */}
            {agents.filter(a => {
              if (!user) return false;
              const ch = dmChannel(user.id, a.id);
              return activeChannel === ch || unreadDms[ch];
            }).concat(
              showUsers ? agents.filter(a => {
                if (!user) return false;
                const ch = dmChannel(user.id, a.id);
                return activeChannel !== ch && !unreadDms[ch];
              }) : []
            ).map(agent => {
              const ch = dmChannel(user!.id, agent.id);
              const unread = unreadDms[ch] ?? 0;
              return (
                <button key={agent.id} onClick={() => openDm(agent)}
                  className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-left transition-all rounded-lg mx-1 ${
                    activeChannel === ch
                      ? "bg-violet/15 text-violet"
                      : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                  }`}>
                  <div className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br ${avatarColor(agent.id)}`}>
                    {initials(agent.full_name)}
                  </div>
                  <span className="text-xs font-medium truncate flex-1">{agent.full_name}</span>
                  {unread > 0 && (
                    <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral text-[9px] font-bold text-white px-1">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}

            {showUsers && (
              <button onClick={() => setShowUsers(false)}
                className="w-full px-4 py-1.5 text-[10px] text-white/48 hover:text-white/50 transition">
                Masquer ↑
              </button>
            )}
          </div>
        </div>

        {/* Mon profil */}
        <div className="border-t border-white/[0.07] p-3 flex items-center gap-2.5">
          <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br ${avatarColor(user?.id ?? 0)}`}>
            {initials(user?.full_name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
            <p className="text-[10px] text-white/55 truncate">{user?.role}</p>
          </div>
          <div className="ml-auto h-2 w-2 rounded-full bg-lime shrink-0" />
        </div>
      </div>

      {/* ── Zone messages ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-ink">

        {/* Header canal */}
        <div className="border-b border-white/[0.07] px-5 py-3.5 flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              {isDm ? (
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br ${avatarColor(dmAgent?.id ?? 0)}`}>
                  {initials(dmAgent?.full_name)}
                </div>
              ) : (
                <span className="text-lg">{pubChan?.icon}</span>
              )}
              <h2 className="font-display font-bold text-white">
                {isDm ? channelTitle : `# ${channelTitle}`}
              </h2>
            </div>
            {!isDm && pubChan && (
              <p className="text-[11px] text-white/55 mt-0.5">{pubChan.desc}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-lime/10 border border-lime/20 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
              <span className="text-[10px] font-semibold text-lime">{agents.length + 1} en ligne</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <p className="text-4xl">{isDm ? "💬" : (pubChan?.icon ?? "💬")}</p>
              <p className="text-white/55 text-sm">
                {isDm
                  ? `Début de votre conversation avec ${dmAgent?.full_name}`
                  : `Bienvenue dans #${channelTitle} — soyez le premier à écrire !`}
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === user?.id;
              const d = dateStr(msg.created_at);
              const showDate = d !== lastDate;
              lastDate = d;
              const prevMsg = messages[i - 1];
              const grouped = prevMsg && prevMsg.sender_id === msg.sender_id &&
                new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000;

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="text-center py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/48 bg-white/5 rounded-full px-3 py-1">{d}</span>
                    </div>
                  )}
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
                    className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""} ${grouped ? "mt-0.5" : "mt-3"}`}>
                    {!grouped ? (
                      <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br ${avatarColor(msg.sender_id)}`}>
                        {initials(msg.sender_name)}
                      </div>
                    ) : (
                      <div className="w-8 shrink-0" />
                    )}
                    <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                      {!grouped && !isMe && (
                        <p className="text-[10px] text-white/40 font-semibold px-1">{msg.sender_name}</p>
                      )}
                      <div className={`group relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? "rounded-tr-sm bg-coral/90 text-white"
                          : "rounded-tl-sm bg-white/[0.06] border border-white/[0.08] text-white/85"
                      }`}>
                        {msg.content}
                        <span className="absolute -bottom-4 text-[9px] text-white/48 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {timeStr(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} className="h-4" />
        </div>

        {/* Zone saisie */}
        <form onSubmit={send} className="border-t border-white/[0.07] p-4">
          <div className="flex gap-3 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 focus-within:border-coral/40 transition">
            <input ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isDm ? `Message à ${dmAgent?.full_name ?? "…"}` : `Message dans #${channelTitle}`}
              disabled={sending}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
            />
            <button type="submit" disabled={!input.trim() || sending}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl bg-coral text-white hover:brightness-110 transition active:scale-95 disabled:opacity-30">
              {sending ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 translate-x-0.5">
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
