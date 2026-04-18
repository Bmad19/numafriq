import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────
type Role = "user" | "assistant";
interface Message {
  id: string;
  role: Role;
  content: string;
  ts: Date;
  quickReplies?: string[];
}

const API = import.meta.env.VITE_CHAT_API_URL ?? "/api/chat.php";

const QUICK_STARTERS = [
  "Quels sont vos services ?",
  "Combien coûte un site web ?",
  "Délai de réalisation ?",
  "Voir vos réalisations",
];

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  ts: new Date(),
  content: `Bonjour ! 👋 Je suis **NUMA**, l'assistant IA de NUMAFRIQ.\n\nJe peux répondre à toutes vos questions sur nos services, tarifs, délais et projets. Comment puis-je vous aider ?`,
  quickReplies: QUICK_STARTERS,
};

// ── Rendu Markdown léger ──────────────────────────────────────────────────────
function Markdown({ text }: { text: string }) {
  return (
    <span className="block space-y-1 leading-relaxed">
      {text.split("\n").map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j} className="font-semibold text-mist">{part.slice(2, -2)}</strong>
            : <span key={j}>{part}</span>
        );
        return <span key={i} className="block">{parts}</span>;
      })}
    </span>
  );
}

// ── Bubble de message ─────────────────────────────────────────────────────────
function Bubble({ msg, onQuickReply }: { msg: Message; onQuickReply: (v: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} items-end`}
    >
      {!isUser && (
        <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-coral to-violet text-[10px] font-black text-white shadow-md">
          N
        </div>
      )}
      <div className={`max-w-[80%] flex flex-col ${isUser ? "items-end" : "items-start"} gap-1.5`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
            isUser
              ? "rounded-br-sm bg-coral text-white"
              : "rounded-bl-sm border border-white/10 bg-white/[0.06] text-mist/90 backdrop-blur-sm"
          }`}
        >
          {isUser ? msg.content : <Markdown text={msg.content} />}
        </div>

        {msg.quickReplies && msg.quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.quickReplies.map((qr) => (
              <button
                key={qr}
                onClick={() => onQuickReply(qr)}
                className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-mist/70 transition hover:border-lime/40 hover:bg-lime/10 hover:text-lime active:scale-95"
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        <span className="px-1 text-[10px] text-mist/25">
          {msg.ts.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}

// ── Indicateur de frappe ──────────────────────────────────────────────────────
function Typing() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-coral to-violet text-[10px] font-black text-white">
        N
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-mist/40 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Widget principal ──────────────────────────────────────────────────────────
export function ChatWidget() {
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState<Message[]>([WELCOME]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(1);
  const [pulsed, setPulsed]   = useState(false);
  const [error, setError]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPulsed(true), 7000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 200); }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setError(false);

    const userMsg: Message = {
      id: `${Date.now()}`,
      role: "user",
      content: text.trim(),
      ts: new Date(),
    };

    const history = [...msgs, userMsg];
    setMsgs(history);
    setInput("");
    setLoading(true);

    // Formatage de l'historique pour l'API
    const apiMessages = history
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res  = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();

      if (!res.ok || !data.message) throw new Error(data.error ?? "Erreur");

      const aiMsg: Message = {
        id: `${Date.now()}-ai`,
        role: "assistant",
        content: data.message,
        ts: new Date(),
        quickReplies: extractSuggestions(data.message),
      };
      setMsgs((m) => [...m, aiMsg]);
      if (!open) setUnread((n) => n + 1);
    } catch {
      setError(true);
      setMsgs((m) => [
        ...m,
        {
          id: `${Date.now()}-err`,
          role: "assistant",
          content: "Une erreur s'est produite. Réessayez ou contactez-nous à **info@numafriq.com**.",
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  return (
    <>
      {/* ── Bouton flottant ──────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-none">
        <AnimatePresence>
          {!open && pulsed && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="pointer-events-auto max-w-[200px] rounded-2xl border border-white/10 bg-ink/90 px-4 py-2.5 text-xs text-mist/80 backdrop-blur-xl shadow-xl"
            >
              Besoin d'aide ? Je suis là 👋
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le chat" : "Ouvrir NUMA - Assistant IA NUMAFRIQ"}
          className={`pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${
            open
              ? "bg-white/10 border border-white/20"
              : "bg-gradient-to-br from-coral to-violet hover:shadow-coral/30 hover:shadow-[0_0_30px]"
          } ${pulsed && !open ? "ring-4 ring-coral/30 ring-offset-2 ring-offset-ink" : ""}`}
        >
          {!open && unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-lime text-[10px] font-black text-ink">
              {unread}
            </span>
          )}
          <AnimatePresence mode="wait">
            {open ? (
              <motion.svg key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-mist">
                <path d="M18 6 6 18M6 6l12 12" />
              </motion.svg>
            ) : (
              <motion.svg key="chat" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.2 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-white">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ── Panneau chat ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="fixed bottom-24 right-2 sm:right-6 z-50 flex w-[340px] max-w-[calc(100vw-1rem)] sm:w-[360px] flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-ink/95 shadow-2xl backdrop-blur-xl"
            style={{ height: "min(540px, calc(100vh - 120px))" }}
            role="dialog"
            aria-label="Chat NUMA — NUMAFRIQ"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative h-9 w-9 shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-coral to-violet text-sm font-black text-white shadow-md">
                    N
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-lime border-2 border-ink" />
                </div>
                <div>
                  <p className="text-sm font-bold text-mist">NUMA</p>
                  <p className="flex items-center gap-1.5 text-[10px] text-lime/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse inline-block" />
                    Assistant IA · Réponse instantanée
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setMsgs([WELCOME]); setError(false); }}
                  title="Nouvelle conversation"
                  aria-label="Réinitialiser"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-mist/35 transition hover:bg-white/10 hover:text-mist/70"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
                  </svg>
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-mist/35 transition hover:bg-white/10 hover:text-mist/70"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
              {msgs.map((m) => (
                <Bubble key={m.id} msg={m} onQuickReply={send} />
              ))}
              {loading && <Typing />}
              {error && !loading && (
                <div className="flex items-center gap-2 rounded-xl border border-coral/20 bg-coral/5 px-3 py-2 text-xs text-coral/70">
                  <span>⚠️</span> Connexion perdue. Vérifiez votre réseau.
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/10 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Posez votre question…"
                  rows={1}
                  disabled={loading}
                  className="flex-1 resize-none overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm text-mist placeholder:text-mist/25 focus:border-lime/30 focus:outline-none focus:ring-1 focus:ring-lime/20 transition disabled:opacity-40"
                  style={{ minHeight: 40, maxHeight: 120 }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 120) + "px";
                  }}
                  maxLength={1000}
                />
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim() || loading}
                  aria-label="Envoyer"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-coral to-violet text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 translate-x-0.5">
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-mist/20">
                NUMA · Propulsé par Llama 3.3 70B · NUMAFRIQ
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Suggestions contextuelles (extraites de la réponse IA) ───────────────────
function extractSuggestions(text: string): string[] | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("service") || lower.includes("offre"))
    return ["Voir les tarifs", "Démarrer un projet", "Nos réalisations"];
  if (lower.includes("tarif") || lower.includes("prix") || lower.includes("fcfa") || lower.includes("€"))
    return ["Demander un devis", "Voir les services", "Contact"];
  if (lower.includes("délai") || lower.includes("semaine") || lower.includes("livraison"))
    return ["Voir les tarifs", "Comment vous travaillez ?", "Contact"];
  if (lower.includes("contact") || lower.includes("email") || lower.includes("info@"))
    return ["Démarrer un projet", "Voir les services", "Tarifs"];
  if (lower.includes("réalisation") || lower.includes("portfolio") || lower.includes("projet"))
    return ["Voir les tarifs", "Démarrer un projet", "Nos services"];
  return ["Nos services", "Tarifs", "Démarrer un projet"];
}
