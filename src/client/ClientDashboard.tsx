import { useEffect, useRef, useState } from "react";
import { useClient } from "./ClientContext";
import { clientAuthApi, clientMessagesApi, type ClientMessage } from "./api";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_LABELS: Record<string, { label: string; color: string; pct: number }> = {
  en_cours: { label: "En cours", color: "from-lime to-lime/60", pct: 0 },
  termine:  { label: "Terminé",  color: "from-violet to-violet/60", pct: 100 },
  en_pause: { label: "En pause", color: "from-violet to-violet/50", pct: 0 },
  annule:   { label: "Annulé",   color: "from-coral/80 to-coral/50", pct: 0 },
};

type Tab = "messages" | "project" | "documents" | "settings";

export function ClientDashboard() {
  const { client, logout, refresh } = useClient();
  const [tab, setTab] = useState<Tab>("messages");
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: client?.name ?? "", company: client?.company ?? "", phone: client?.phone ?? "" });
  const [pwForm, setPwForm] = useState({ old: "", new: "", confirm: "" });
  const [msg, setMsg] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  async function loadMsgs(initial = false) {
    const since = initial ? undefined : lastIdRef.current;
    const msgs  = await clientMessagesApi.list(since);
    if (initial) { setMessages(msgs); }
    else if (msgs.length) {
      setMessages(prev => [...prev, ...msgs]);
      // Nouveau message de l'équipe → badge si pas sur l'onglet messages
      const newFromAgent = msgs.filter(m => m.sender_type === "agent");
      if (newFromAgent.length && tab !== "messages") setUnread(n => n + newFromAgent.length);
    }
    if (msgs.length) lastIdRef.current = msgs[msgs.length - 1].id;
  }

  // Calcule les non-lus initiaux
  useEffect(() => {
    const agentMsgs = messages.filter(m => m.sender_type === "agent" && !m.is_read);
    setUnread(agentMsgs.length);
  }, []);

  useEffect(() => {
    loadMsgs(true).catch(() => {});
    pollRef.current = setInterval(() => loadMsgs().catch(() => {}), 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim(); setInput("");
    try {
      const res = await clientMessagesApi.send(text);
      setMessages(prev => [...prev, res.message]);
      lastIdRef.current = res.message.id;
    } catch { setInput(text); }
    finally { setSending(false); }
  }

  const timeStr = (dt: string) => new Date(dt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const NAV: { tab: Tab; label: string; icon: string }[] = [
    { tab: "messages",  label: "Messages",   icon: "💬" },
    { tab: "project",   label: "Mon projet", icon: "📁" },
    { tab: "documents", label: "Documents",  icon: "📄" },
    { tab: "settings",  label: "Profil",     icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      {/* Fixed blobs */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 h-[400px] w-[400px] rounded-full bg-lime/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet/8 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink/90 backdrop-blur-xl px-4 sm:px-6">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lime/30 to-lime/10 text-sm font-black text-lime border border-lime/20">
              {client?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">{client?.name}</p>
              <p className="text-[10px] text-white/35 mt-0.5">{client?.company || "Espace client Afrilex Conseil"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-lime/20 bg-lime/5 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
              <span className="text-[10px] font-semibold text-lime/80">En ligne</span>
            </div>
            <a href="/" className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white hover:border-white/25 transition" title="Retour au site">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1h-4v-4H8v4H4a1 1 0 01-1-1z"/>
              </svg>
            </a>
            <button onClick={logout} className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white hover:border-white/25 transition">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M9 2H5a1 1 0 00-1 1v14a1 1 0 001 1h4M13 6l4 4-4 4M17 10H7"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-6 flex flex-col gap-5">

        {/* Nav tabs */}
        <div className="flex gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1">
          {NAV.map(n => (
            <button key={n.tab}
              onClick={() => { setTab(n.tab); if (n.tab === "messages") setUnread(0); }}
              className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
                tab === n.tab ? "bg-lime text-ink shadow-md" : "text-white/40 hover:text-white"
              }`}>
              <span className="text-base sm:text-sm">{n.icon}</span>
              <span className="hidden sm:inline">{n.label}</span>
              {n.tab === "messages" && unread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral text-[9px] font-black text-white px-1">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Messages tab */}
        {tab === "messages" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-coral/40 to-violet/40 text-xs font-black text-white">N</div>
              <div>
                <p className="text-sm font-semibold text-white">Équipe Afrilex Conseil</p>
                <p className="text-xs text-lime/70">● Disponible · Réponse sous 24h</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] flex flex-col" style={{ height: "50vh" }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence>
                  {messages.map(m => {
                    const isMe = m.sender_type === "client";
                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                        <div className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold text-white ${
                          isMe ? "bg-gradient-to-br from-lime/60 to-lime/30 text-ink" : "bg-gradient-to-br from-coral/60 to-violet/40"
                        }`}>
                          {isMe ? client?.name?.charAt(0).toUpperCase() : "N"}
                        </div>
                        <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"} gap-0.5`}>
                          <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                            isMe ? "rounded-tr-sm bg-lime text-ink font-medium" : "rounded-tl-sm border border-white/10 bg-white/[0.05] text-white/85"
                          }`}>
                            {m.content}
                          </div>
                          <span className="text-[10px] text-white/48 px-1">{timeStr(m.created_at)}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendMessage} className="border-t border-white/[0.06] p-3 flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Écrivez votre message à l'équipe Afrilex Conseil…"
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/45 focus:border-lime/40 focus:outline-none transition"
                  disabled={sending} />
                <button type="submit" disabled={!input.trim() || sending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime text-ink hover:brightness-110 transition active:scale-95 disabled:opacity-30">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 translate-x-0.5">
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Project tab */}
        {tab === "project" && (
          <div className="space-y-4">
            {client?.project ? (
              <>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-1">Votre projet</p>
                      <h2 className="font-display text-xl font-bold text-white">{client.project.name}</h2>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                      STATUS_LABELS[client.project.status]?.label ? "border-lime/25 text-lime bg-lime/8" : "border-white/10 text-white/50"
                    }`}>
                      {STATUS_LABELS[client.project.status]?.label ?? client.project.status}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-white/40">Avancement</span>
                      <span className="font-bold text-white">{client.project.progress}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${STATUS_LABELS[client.project.status]?.color ?? "from-lime to-lime/60"} transition-all`}
                        style={{ width: `${client.project.progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {client.project.deadline && (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Deadline</p>
                        <p className="mt-1 text-sm font-semibold text-white">{new Date(client.project.deadline).toLocaleDateString("fr-FR", { day:"numeric",month:"long",year:"numeric" })}</p>
                      </div>
                    )}
                    {client.project.budget && (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">Budget</p>
                        <p className="mt-1 text-sm font-semibold text-white">{client.project.budget.toLocaleString("fr-FR")} FCFA</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-center">
                  <p className="text-sm text-white/50">Une question sur votre projet ?</p>
                  <button onClick={() => setTab("messages")} className="mt-3 rounded-xl bg-lime/15 border border-lime/25 px-5 py-2.5 text-sm font-semibold text-lime hover:bg-lime/25 transition">
                    💬 Écrire à l'équipe
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center">
                <p className="text-4xl mb-3">📁</p>
                <p className="font-semibold text-white">Aucun projet associé</p>
                <p className="text-sm text-white/40 mt-2">Notre équipe va associer votre projet à votre compte très prochainement.</p>
                <button onClick={() => setTab("messages")} className="mt-5 rounded-xl bg-lime/15 border border-lime/25 px-5 py-2.5 text-sm font-semibold text-lime hover:bg-lime/25 transition">
                  Contacter l'équipe
                </button>
              </div>
            )}
          </div>
        )}

        {/* Documents tab */}
        {tab === "documents" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/15 border border-violet/20 text-xl">📄</div>
                <div>
                  <h3 className="font-bold text-white">Documents & Livrables</h3>
                  <p className="text-xs text-white/40">Fichiers partagés par l'équipe Afrilex Conseil</p>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
                <p className="text-3xl mb-3">📂</p>
                <p className="font-semibold text-white/70">Aucun document disponible</p>
                <p className="text-xs text-white/55 mt-2 max-w-xs mx-auto">
                  Vos livrables, maquettes et fichiers partagés par l'équipe apparaîtront ici.
                </p>
                <button onClick={() => setTab("messages")}
                  className="mt-5 rounded-xl bg-violet/15 border border-violet/25 px-5 py-2.5 text-sm font-semibold text-violet hover:bg-violet/25 transition">
                  Demander un document
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings tab */}
        {tab === "settings" && (
          <div className="space-y-5">
            {msg && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${
                msg.includes("incorrect") || msg.includes("correspondent")
                  ? "border-coral/25 bg-coral/10 text-coral"
                  : "border-lime/20 bg-lime/8 text-lime"
              }`}>{msg}</div>
            )}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
              <h3 className="font-bold text-white">Mes informations</h3>
              {([["name","Nom complet","text"],["company","Entreprise","text"],["phone","Téléphone","tel"]] as const).map(([k,l,t]) => (
                <div key={k}>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1.5">{l}</label>
                  <input type={t} value={(form as Record<string,string>)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-lime/50 focus:outline-none transition" />
                </div>
              ))}
              <button onClick={async () => {
                try { await clientAuthApi.updateProfile(form); setMsg("Profil mis à jour !"); refresh(); setTimeout(() => setMsg(""), 3000); }
                catch(e: unknown) { setMsg(e instanceof Error ? e.message : "Erreur"); }
              }} className="w-full rounded-xl bg-lime py-3 text-sm font-bold text-ink hover:brightness-110 transition">
                Sauvegarder
              </button>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
              <h3 className="font-bold text-white">Changer le mot de passe</h3>
              {([["old","Mot de passe actuel"],["new","Nouveau mot de passe"],["confirm","Confirmer le nouveau"]] as const).map(([k,l]) => (
                <div key={k}>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1.5">{l}</label>
                  <input type="password" value={(pwForm as Record<string,string>)[k]} onChange={e => setPwForm(f => ({...f,[k]:e.target.value}))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-violet/50 focus:outline-none transition" />
                </div>
              ))}
              <button disabled={savingPw} onClick={async () => {
                if (pwForm.new !== pwForm.confirm) { setMsg("Les mots de passe ne correspondent pas"); return; }
                if (pwForm.new.length < 6) { setMsg("Minimum 6 caractères"); return; }
                setSavingPw(true);
                try {
                  await clientAuthApi.changePassword(pwForm.old, pwForm.new);
                  setMsg("Mot de passe modifié !"); setPwForm({ old:"",new:"",confirm:"" });
                  setTimeout(() => setMsg(""), 3000);
                } catch(e: unknown) { setMsg(e instanceof Error ? e.message : "Erreur"); }
                finally { setSavingPw(false); }
              }} className="w-full rounded-xl bg-violet py-3 text-sm font-bold text-ink hover:brightness-110 transition disabled:opacity-40">
                {savingPw ? "Modification…" : "Modifier le mot de passe"}
              </button>
            </div>

            {/* Infos compte */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-coral/10 border border-coral/25 text-coral">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path d="M9 2H5a1 1 0 00-1 1v14a1 1 0 001 1h4M13 6l4 4-4 4M17 10H7"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Se déconnecter</p>
                <p className="text-xs text-white/40">Vous serez redirigé vers la page de connexion</p>
              </div>
              <button onClick={logout} className="rounded-xl border border-coral/25 bg-coral/10 px-4 py-2 text-sm font-semibold text-coral hover:bg-coral/20 transition">
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
