import { useEffect, useMemo, useRef, useState } from "react";
import { useClient } from "./ClientContext";
import {
  clientAuthApi,
  clientCasesApi,
  clientMessagesApi,
  type ClientCaseDetail,
  type ClientCaseSummary,
  type ClientMessage,
  type ClientCaseInvoice,
  type ClientCasePayment,
  type ClientEventRequest,
  type ClientSignature,
} from "./api";
import { motion, AnimatePresence } from "framer-motion";

const PRACTICE_LABELS: Record<string, string> = {
  ohada: "Droit OHADA",
  fiscal: "Fiscalité",
  social: "Droit social",
  penal_aff: "Pénal des affaires",
  civil: "Civil",
  commercial: "Commercial",
  structuration: "Structuration",
  autre: "Autre",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  en_cours: { label: "En cours", color: "from-lime to-lime/60" },
  termine:  { label: "Clôturé",  color: "from-violet to-violet/60" },
  en_pause: { label: "En pause", color: "from-violet/80 to-violet/40" },
  annule:   { label: "Annulé",   color: "from-coral/80 to-coral/50" },
};

const MILESTONE_STATUS: Record<string, { label: string; cls: string }> = {
  a_faire:  { label: "À faire",  cls: "border-white/15 bg-white/[0.03] text-white/60" },
  en_cours: { label: "En cours", cls: "border-coral/30 bg-coral/10 text-coral" },
  termine:  { label: "Terminé",  cls: "border-lime/30 bg-lime/12 text-lime" },
  reporte:  { label: "Reporté",  cls: "border-violet/30 bg-violet/10 text-violet" },
  annule:   { label: "Annulé",   cls: "border-white/10 bg-white/[0.02] text-white/45" },
};

const EVENT_TYPE: Record<string, { label: string; icon: string }> = {
  audience:     { label: "Audience",      icon: "⚖️" },
  rdv:          { label: "Rendez-vous",   icon: "📅" },
  echeance:     { label: "Échéance",      icon: "⏰" },
  depot_pieces: { label: "Dépôt pièces",  icon: "📂" },
  consultation: { label: "Consultation",  icon: "💬" },
  autre:        { label: "Événement",     icon: "📌" },
};

const DOC_KIND: Record<string, string> = {
  preuve: "Preuve",
  contrat: "Contrat",
  jugement: "Jugement / arrêt",
  conclusions: "Conclusions",
  expertise: "Expertise",
  correspondance: "Correspondance",
  identite: "Pièce d'identité",
  autre: "Document",
};

const DOC_MIME_ICON = (mime: string) => {
  if (mime.includes("pdf")) return "📕";
  if (mime.includes("word") || mime.includes("document")) return "📘";
  if (mime.includes("sheet") || mime.includes("excel")) return "📗";
  if (mime.startsWith("image/")) return "🖼️";
  return "📄";
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(iso)); } catch { return iso; }
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); } catch { return iso; }
}
function fmtSize(b?: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
}
function timeStr(dt: string) { return new Date(dt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
function fileToB64(file: File): Promise<{ data_base64: string; mime: string; filename: string }> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      const i = s.indexOf(",");
      if (i === -1) return rej(new Error("Lecture impossible"));
      res({ data_base64: s.slice(i + 1), mime: file.type || "application/octet-stream", filename: file.name });
    };
    r.onerror = () => rej(new Error("Lecture échouée"));
    r.readAsDataURL(file);
  });
}

type Tab = "messages" | "cases" | "signatures" | "settings";

export function ClientDashboard() {
  const { client, logout, refresh } = useClient();
  const [tab, setTab] = useState<Tab>("cases");
  const [cases, setCases] = useState<ClientCaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [openCaseId, setOpenCaseId] = useState<number | null>(null);

  // Messages
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // Signatures
  const [pendingSignatures, setPendingSignatures] = useState(0);

  // Settings
  const [form, setForm] = useState({ name: client?.name ?? "", company: client?.company ?? "", phone: client?.phone ?? "" });
  const [pwForm, setPwForm] = useState({ old: "", new: "", confirm: "" });
  const [msg, setMsg] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  async function loadCases() {
    setCasesLoading(true);
    try { const r = await clientCasesApi.list(); setCases(r.cases); }
    catch { setCases([]); }
    finally { setCasesLoading(false); }
  }
  useEffect(() => { loadCases(); }, []);

  async function loadPendingSignaturesCount() {
    try { const r = await clientCasesApi.signaturesPending(); setPendingSignatures(r.length); }
    catch { /* ignore */ }
  }
  useEffect(() => { loadPendingSignaturesCount(); const t = setInterval(loadPendingSignaturesCount, 30000); return () => clearInterval(t); }, []);

  async function loadMsgs(initial = false) {
    const since = initial ? undefined : lastIdRef.current;
    const msgs = await clientMessagesApi.list(since);
    if (initial) setMessages(msgs);
    else if (msgs.length) {
      setMessages((prev) => [...prev, ...msgs]);
      const newFromAgent = msgs.filter((m) => m.sender_type === "agent");
      if (newFromAgent.length && tab !== "messages") setUnread((n) => n + newFromAgent.length);
    }
    if (msgs.length) lastIdRef.current = msgs[msgs.length - 1].id;
  }

  useEffect(() => {
    loadMsgs(true).catch(() => {});
    pollRef.current = setInterval(() => loadMsgs().catch(() => {}), 4000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim(); setInput("");
    try {
      const res = await clientMessagesApi.send(text);
      setMessages((prev) => [...prev, res.message]);
      lastIdRef.current = res.message.id;
    } catch { setInput(text); }
    finally { setSending(false); }
  }

  const NAV: { tab: Tab; label: string; icon: string; badge?: number }[] = useMemo(() => [
    { tab: "cases",      label: "Mes dossiers", icon: "📁" },
    { tab: "signatures", label: "À signer",     icon: "✍️", badge: pendingSignatures > 0 ? pendingSignatures : undefined },
    { tab: "messages",   label: "Messages",     icon: "💬", badge: unread > 0 ? unread : undefined },
    { tab: "settings",   label: "Profil",       icon: "⚙️" },
  ], [unread, pendingSignatures]);

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 h-[400px] w-[400px] rounded-full bg-lime/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet/8 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink/90 backdrop-blur-xl px-4 sm:px-6">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lime/30 to-lime/10 text-sm font-black text-lime border border-lime/20">
              {client?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-none truncate">{client?.name}</p>
              <p className="text-[10px] text-white/35 mt-0.5 truncate">{client?.company || "Espace client Afrilex Conseil"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-lime/20 bg-lime/5 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
              <span className="text-[10px] font-semibold text-lime/80">En ligne</span>
            </div>
            <a href="/" className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white hover:border-white/25 transition" title="Retour au site" aria-label="Retour au site">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1h-4v-4H8v4H4a1 1 0 01-1-1z" /></svg>
            </a>
            <button onClick={logout} className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white hover:border-white/25 transition" aria-label="Se déconnecter">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path d="M9 2H5a1 1 0 00-1 1v14a1 1 0 001 1h4M13 6l4 4-4 4M17 10H7" /></svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 flex flex-col gap-5">
        <div className="flex gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1">
          {NAV.map((n) => (
            <button key={n.tab} onClick={() => { setTab(n.tab); if (n.tab === "messages") setUnread(0); }}
              className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
                tab === n.tab ? "bg-lime text-ink shadow-md" : "text-white/45 hover:text-white"
              }`}>
              <span className="text-base sm:text-sm">{n.icon}</span>
              <span className="hidden sm:inline">{n.label}</span>
              {n.badge != null && <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral text-[9px] font-black text-white px-1">{n.badge}</span>}
            </button>
          ))}
        </div>

        {tab === "cases" && (
          openCaseId != null
            ? <CaseDetailView caseId={openCaseId} onBack={() => setOpenCaseId(null)} />
            : <CasesList cases={cases} loading={casesLoading} onOpen={setOpenCaseId} onMessage={() => setTab("messages")} />
        )}

        {tab === "signatures" && (
          <ClientSignaturesPane onCountChange={setPendingSignatures} />
        )}

        {tab === "messages" && (
          <MessagesPane messages={messages} input={input} setInput={setInput} sending={sending} sendMessage={sendMessage}
            clientName={client?.name ?? ""} bottomRef={bottomRef} />
        )}

        {tab === "settings" && (
          <SettingsPane msg={msg} form={form} setForm={setForm} pwForm={pwForm} setPwForm={setPwForm} savingPw={savingPw}
            onSaveProfile={async () => { try { await clientAuthApi.updateProfile(form); setMsg("Profil mis à jour !"); refresh(); setTimeout(() => setMsg(""), 3000); } catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Erreur"); } }}
            onChangePw={async () => {
              if (pwForm.new !== pwForm.confirm) { setMsg("Les mots de passe ne correspondent pas"); return; }
              if (pwForm.new.length < 6) { setMsg("Minimum 6 caractères"); return; }
              setSavingPw(true);
              try {
                await clientAuthApi.changePassword(pwForm.old, pwForm.new);
                setMsg("Mot de passe modifié !"); setPwForm({ old: "", new: "", confirm: "" });
                setTimeout(() => setMsg(""), 3000);
              } catch (e: unknown) { setMsg(e instanceof Error ? e.message : "Erreur"); }
              finally { setSavingPw(false); }
            }}
            onLogout={logout}
          />
        )}
      </div>
    </div>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function CasesList({ cases, loading, onOpen, onMessage }: { cases: ClientCaseSummary[]; loading: boolean; onOpen: (id: number) => void; onMessage: () => void }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-16 text-center">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-white/10 border-t-lime" />
        <p className="mt-3 text-sm text-white/50">Chargement de vos dossiers…</p>
      </div>
    );
  }
  if (cases.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10 text-center">
        <p className="text-4xl mb-3">📁</p>
        <p className="font-semibold text-white">Aucun dossier en cours</p>
        <p className="text-sm text-white/45 mt-2">Notre équipe associera votre dossier à votre compte dès son ouverture officielle.</p>
        <button onClick={onMessage} className="mt-5 rounded-xl bg-lime/15 border border-lime/25 px-5 py-2.5 text-sm font-semibold text-lime hover:bg-lime/25 transition">
          💬 Contacter l'équipe
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-bold text-white">Mes dossiers</h2>
        <p className="text-xs text-white/45 mt-0.5">{cases.length} dossier{cases.length > 1 ? "s" : ""} suivi{cases.length > 1 ? "s" : ""} par le cabinet Afrilex Conseil.</p>
      </div>
      <div className="space-y-3">
        {cases.map((c) => {
          const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.en_cours;
          const nextDateLate = c.next_action_date && new Date(c.next_action_date) < new Date();
          return (
            <button key={c.id} onClick={() => onOpen(c.id)}
              className="w-full text-left rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {c.case_number && <span className="rounded-md bg-coral/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-coral">{c.case_number}</span>}
                    {c.practice_area && <span className="rounded-md bg-violet/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet">{PRACTICE_LABELS[c.practice_area] ?? c.practice_area}</span>}
                  </div>
                  <h3 className="font-semibold text-white">{c.name}</h3>
                  {c.current_phase && <p className="text-xs text-white/55 mt-0.5">📍 {c.current_phase}</p>}
                  {c.agent_name && <p className="text-[11px] text-white/40 mt-0.5">Référent : <span className="font-semibold text-white/65">{c.agent_name}</span></p>}
                </div>
                <span className="shrink-0 rounded-full border border-lime/25 bg-lime/8 px-3 py-1 text-xs font-bold uppercase text-lime">{st.label}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/45">Avancement</span>
                  <span className="font-bold text-white">{c.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${st.color} transition-all`} style={{ width: `${c.progress}%` }} />
                </div>
              </div>
              {(c.next_action || c.next_action_date) && (
                <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${nextDateLate ? "border-coral/35 bg-coral/10 text-coral" : "border-white/[0.08] bg-white/[0.03] text-white/70"}`}>
                  <span className="shrink-0">⏭</span>
                  <span className="truncate"><strong>Prochaine étape :</strong> {c.next_action ?? "—"}{c.next_action_date && ` · ${fmtDate(c.next_action_date)}`}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CaseDetailView({ caseId, onBack }: { caseId: number; onBack: () => void }) {
  const [data, setData] = useState<ClientCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<"timeline" | "events" | "documents" | "invoices">("timeline");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [invoices, setInvoices] = useState<ClientCaseInvoice[]>([]);
  const [payments, setPayments] = useState<ClientCasePayment[]>([]);
  const [myRequests, setMyRequests] = useState<ClientEventRequest[]>([]);

  async function loadInvoices() {
    try { const r = await clientCasesApi.invoices(caseId); setInvoices(r.invoices); setPayments(r.payments); } catch { /* ignore */ }
  }
  async function loadRequests() {
    try { setMyRequests(await clientCasesApi.myEventRequests(caseId)); } catch { /* ignore */ }
  }

  async function load() {
    setLoading(true);
    try {
      const d = await clientCasesApi.get(caseId);
      setData(d);
      setErr(null);
      // Charge en parallèle
      loadInvoices();
      loadRequests();
    }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [caseId]);

  async function downloadDoc(id: number, name?: string) {
    setDownloadingId(id);
    try { await clientCasesApi.openDocument(id, name); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Téléchargement impossible"); }
    finally { setDownloadingId(null); }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-16 text-center">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-white/10 border-t-lime" />
        <p className="mt-3 text-sm text-white/50">Chargement du dossier…</p>
      </div>
    );
  }
  if (err || !data) {
    return (
      <div className="rounded-2xl border border-coral/30 bg-coral/10 p-6 text-center">
        <p className="text-coral font-semibold">{err || "Erreur"}</p>
        <button onClick={onBack} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm text-white">← Retour à mes dossiers</button>
      </div>
    );
  }

  const p = data.project;
  const st = STATUS_LABELS[p.status] ?? STATUS_LABELS.en_cours;
  const upcomingEvents = data.events.filter((e) => !e.completed_at);
  const pastEvents = data.events.filter((e) => !!e.completed_at);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-lime/85 hover:text-lime">
        ← Retour à mes dossiers
      </button>

      {/* Header dossier */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {p.case_number && <span className="rounded-md bg-coral/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-coral">{p.case_number}</span>}
              {p.practice_area && <span className="rounded-md bg-violet/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet">{PRACTICE_LABELS[p.practice_area] ?? p.practice_area}</span>}
            </div>
            <h2 className="font-display text-xl font-bold text-white">{p.name}</h2>
            {p.current_phase && <p className="text-sm text-white/65 mt-1">📍 Étape actuelle : <span className="font-semibold text-white">{p.current_phase}</span></p>}
            {p.agent_name && <p className="text-xs text-white/45 mt-0.5">Référent cabinet : <span className="text-white/75 font-semibold">{p.agent_name}</span></p>}
          </div>
          <span className="shrink-0 rounded-full border border-lime/25 bg-lime/8 px-3 py-1 text-xs font-bold uppercase text-lime">{st.label}</span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-white/45">Avancement global</span>
            <span className="font-bold text-white">{p.progress}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-white/8 overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r ${st.color} transition-all`} style={{ width: `${p.progress}%` }} />
          </div>
        </div>
        {(p.next_action || p.next_action_date) && (
          <div className="mt-4 rounded-xl border border-coral/25 bg-coral/[0.06] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-coral mb-1">⏭ Prochaine étape</p>
            <p className="text-sm text-white/85">{p.next_action ?? "—"}</p>
            {p.next_action_date && <p className="text-xs text-coral/85 mt-0.5">📅 {fmtDate(p.next_action_date)}</p>}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 overflow-x-auto">
        {([
          { v: "timeline", l: "Suivi", n: data.milestones.length },
          { v: "events",   l: "Agenda", n: data.events.length },
          { v: "documents",l: "Documents", n: data.documents.length },
          { v: "invoices", l: "Honoraires", n: invoices.length },
        ] as const).map((t) => (
          <button key={t.v} onClick={() => setInnerTab(t.v as typeof innerTab)}
            className={`shrink-0 flex-1 rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              innerTab === t.v ? "bg-lime text-ink" : "text-white/55 hover:text-white"
            }`}>
            {t.l}<span className={`rounded-full px-1.5 text-[10px] ${innerTab === t.v ? "bg-ink/15 text-ink" : "bg-white/10"}`}>{t.n}</span>
          </button>
        ))}
      </div>

      {innerTab === "timeline" && (
        <div className="space-y-3">
          {data.milestones.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-10 text-center text-sm text-white/45">
              Aucune étape publiée — les jalons de votre dossier apparaîtront ici dès qu'ils seront définis.
            </div>
          ) : (
            <ol className="space-y-2">
              {data.milestones.map((m, i) => {
                const cfg = MILESTONE_STATUS[m.status];
                const dueLate = m.due_date && m.status !== "termine" && m.status !== "annule" && new Date(m.due_date) < new Date();
                return (
                  <li key={m.id} className={`rounded-2xl border p-4 ${m.status === "termine" ? "border-lime/15 bg-lime/[0.04]" : "border-white/[0.08] bg-white/[0.02]"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black ${m.status === "termine" ? "bg-lime text-ink" : "bg-coral/15 text-coral border border-coral/30"}`}>
                        {m.status === "termine" ? "✓" : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`font-semibold text-white ${m.status === "termine" ? "line-through opacity-70" : ""}`}>{m.title}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.cls}`}>{cfg.label}</span>
                          {dueLate && <span className="text-[10px] text-coral font-bold uppercase">⚠ Retard</span>}
                        </div>
                        {m.description && <p className="text-xs text-white/65 mt-1 whitespace-pre-wrap leading-relaxed">{m.description}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-white/45">
                          {m.due_date && <span>📅 Échéance : {fmtDate(m.due_date)}</span>}
                          {m.completed_at && <span className="text-lime/85">✓ Terminée le {fmtDate(m.completed_at)}</span>}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {innerTab === "events" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-white/55">Vos audiences, rendez-vous et échéances. Vous pouvez demander un nouveau RDV.</p>
            <button onClick={() => setRequestOpen(true)} className="rounded-xl bg-lime/15 border border-lime/25 px-4 py-2 text-xs font-bold text-lime hover:bg-lime/25 transition">
              + Demander un RDV
            </button>
          </div>
          {myRequests.filter((r) => r.status === "pending").length > 0 && (
            <div className="rounded-2xl border border-coral/25 bg-coral/[0.06] p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-coral">Vos demandes en attente</p>
              {myRequests.filter((r) => r.status === "pending").map((r) => (
                <div key={r.id} className="rounded-lg bg-white/[0.03] p-2 text-xs">
                  <p className="font-semibold text-white">{r.title}</p>
                  <p className="text-white/55">🕒 Proposé : {fmtDateTime(r.proposed_date)}</p>
                  <p className="text-white/45 italic">En attente de validation par le cabinet.</p>
                </div>
              ))}
            </div>
          )}
          {myRequests.filter((r) => r.status !== "pending" && r.status !== "accepted" && r.status !== "rescheduled").length > 0 && (
            <details className="rounded-xl bg-white/[0.02] p-2">
              <summary className="cursor-pointer text-xs text-white/55 hover:text-white">Mes demandes traitées ({myRequests.filter((r) => r.status !== "pending" && r.status !== "accepted" && r.status !== "rescheduled").length})</summary>
              <ul className="mt-2 space-y-1.5">
                {myRequests.filter((r) => r.status === "refused" || r.status === "cancelled").map((r) => (
                  <li key={r.id} className="rounded bg-white/[0.02] px-2 py-1.5 text-[11px]">
                    <p className="text-white/65">{r.title} — <span className="text-coral">refusée</span></p>
                    {r.decided_message && <p className="text-white/45 italic">« {r.decided_message} »</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {data.events.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-10 text-center text-sm text-white/45">
              Aucune audience ou rendez-vous programmé pour l'instant.
            </div>
          ) : (
            <>
              {upcomingEvents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">À venir ({upcomingEvents.length})</p>
                  {upcomingEvents.map((e) => <ClientEventCard key={e.id} event={e} />)}
                </div>
              )}
              {pastEvents.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Passés ({pastEvents.length})</p>
                  {pastEvents.map((e) => <ClientEventCard key={e.id} event={e} />)}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {innerTab === "invoices" && (
        <ClientInvoicesPane invoices={invoices} payments={payments} />
      )}

      {innerTab === "documents" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-white/55">Pièces partagées avec vous (téléchargeables) et celles que vous nous transmettez.</p>
            <button onClick={() => setUploadOpen(true)} className="rounded-xl bg-lime/15 border border-lime/25 px-4 py-2 text-xs font-bold text-lime hover:bg-lime/25 transition">
              ↑ Envoyer une pièce
            </button>
          </div>
          {data.documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-white/45">
              Aucun document partagé pour ce dossier.
            </div>
          ) : (
            <ul className="space-y-2">
              {data.documents.map((d) => (
                <li key={d.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 h-10 w-10 rounded-lg bg-white/[0.05] flex items-center justify-center text-lg">{DOC_MIME_ICON(d.mime)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white truncate">{d.title}</p>
                        <span className="rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 text-[10px] font-bold text-violet uppercase">{DOC_KIND[d.kind] ?? d.kind}</span>
                        {d.uploaded_by_kind === "client" && <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-bold text-lime uppercase">Vous</span>}
                      </div>
                      <p className="text-[11px] text-white/50 mt-0.5">
                        {fmtSize(d.size_bytes)} · {fmtDate(d.created_at)}
                        {d.uploaded_by_name && d.uploaded_by_kind === "cabinet" && ` · par ${d.uploaded_by_name}`}
                      </p>
                      {d.description && <p className="mt-1 text-xs text-white/55">{d.description}</p>}
                    </div>
                    <button onClick={() => downloadDoc(d.id, d.filename ?? d.title)} disabled={downloadingId === d.id}
                      className="shrink-0 rounded-lg bg-lime/15 border border-lime/25 px-3 py-1.5 text-xs font-bold text-lime hover:bg-lime/25 transition disabled:opacity-50">
                      {downloadingId === d.id ? "…" : "↓ Ouvrir"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ClientUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} caseId={caseId} onUploaded={load} />
      <ClientRequestEventModal open={requestOpen} onClose={() => setRequestOpen(false)} caseId={caseId} onSubmitted={() => { setRequestOpen(false); loadRequests(); }} />
    </div>
  );
}

function ClientInvoicesPane({ invoices, payments }: { invoices: ClientCaseInvoice[]; payments: ClientCasePayment[] }) {
  const totalDue = invoices.filter((i) => i.status !== "annulee").reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount || 0)), 0);
  const totalPaid = invoices.filter((i) => i.status !== "annulee").reduce((s, i) => s + Number(i.paid_amount || 0), 0);
  const fmtMoney = (n: number, c = "XOF") => `${Math.round(n).toLocaleString("fr-FR")} ${c === "XOF" ? "FCFA" : c}`;
  const STATUS_CFG: Record<string, { l: string; cls: string }> = {
    envoyee: { l: "Envoyée", cls: "border-coral/30 bg-coral/12 text-coral" },
    partiellement_payee: { l: "Partiel.", cls: "border-violet/30 bg-violet/12 text-violet" },
    payee: { l: "Payée", cls: "border-lime/30 bg-lime/15 text-lime" },
    annulee: { l: "Annulée", cls: "border-white/10 bg-white/[0.02] text-white/40 line-through" },
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-lime/20 bg-lime/[0.04] p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-lime/85">Réglé</p>
          <p className="font-display text-lg font-extrabold text-lime">{fmtMoney(totalPaid)}</p>
        </div>
        <div className={`rounded-xl border p-3 ${totalDue > 0 ? "border-coral/30 bg-coral/[0.06]" : "border-white/[0.08] bg-white/[0.02]"}`}>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${totalDue > 0 ? "text-coral" : "text-white/45"}`}>Solde dû</p>
          <p className={`font-display text-lg font-extrabold ${totalDue > 0 ? "text-coral" : "text-white"}`}>{fmtMoney(totalDue)}</p>
        </div>
      </div>
      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-10 text-center text-sm text-white/45">
          Aucune facture émise.
        </div>
      ) : (
        <ul className="space-y-2">
          {invoices.map((inv) => {
            const cfg = STATUS_CFG[inv.status] ?? STATUS_CFG.envoyee;
            const due = Number(inv.amount) - Number(inv.paid_amount || 0);
            const overdue = inv.due_date && inv.status !== "payee" && inv.status !== "annulee" && new Date(inv.due_date) < new Date();
            const invPays = payments.filter((p) => p.invoice_id === inv.id);
            return (
              <li key={inv.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {inv.invoice_number && <span className="rounded-md bg-violet/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-violet">{inv.invoice_number}</span>}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.cls}`}>{cfg.l}</span>
                      {overdue && <span className="text-[10px] text-coral font-bold uppercase">⚠ Échue</span>}
                    </div>
                    <p className="font-semibold text-white">{inv.title}</p>
                    {inv.description && <p className="text-xs text-white/55 mt-0.5">{inv.description}</p>}
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-white/55">
                      <span>💰 <strong className="text-white">{fmtMoney(Number(inv.amount), inv.currency)}</strong></span>
                      {inv.paid_amount > 0 && <span className="text-lime/85">✓ Payé : {fmtMoney(Number(inv.paid_amount), inv.currency)}</span>}
                      {due > 0 && <span className="text-coral/85">Reste : {fmtMoney(due, inv.currency)}</span>}
                      {inv.due_date && <span>📅 Échéance : {fmtDate(inv.due_date)}</span>}
                    </div>
                    {inv.notes_client && <p className="mt-2 text-xs text-white/65 italic border-l-2 border-lime/30 pl-3">« {inv.notes_client} »</p>}
                  </div>
                  <div className="shrink-0">
                    <button
                      onClick={() => clientCasesApi.downloadInvoicePdf(inv.id, `facture-${inv.invoice_number ?? inv.id}.pdf`).catch((e) => alert(String(e)))}
                      title="Télécharger la facture en PDF"
                      className="rounded-lg border border-coral/30 bg-coral/10 px-3 py-1.5 text-xs font-bold text-coral hover:bg-coral/20"
                    >
                      ↓ PDF
                    </button>
                  </div>
                </div>
                {invPays.length > 0 && (
                  <details className="mt-2 text-[11px] text-white/55">
                    <summary className="cursor-pointer text-lime/75 hover:text-lime">▸ Historique paiements</summary>
                    <ul className="mt-2 space-y-1">
                      {invPays.map((p) => <li key={p.id} className="rounded bg-white/[0.03] px-2 py-1">{fmtDate(p.paid_at)} — {fmtMoney(Number(p.amount), inv.currency)} ({p.method}{p.reference ? ` · ${p.reference}` : ""})</li>)}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ClientRequestEventModal({ open, onClose, caseId, onSubmitted }: { open: boolean; onClose: () => void; caseId: number; onSubmitted: () => void }) {
  const [type, setType] = useState<"rdv" | "consultation" | "autre">("rdv");
  const [title, setTitle] = useState("");
  const [proposedDate, setProposedDate] = useState("");
  const [altDate, setAltDate] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setType("rdv"); setTitle(""); setMessage(""); setAltDate(""); setErr(null);
      const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(10, 0, 0, 0);
      setProposedDate(d.toISOString().slice(0, 16));
    }
  }, [open]);
  if (!open) return null;
  async function send() {
    if (!title.trim()) return setErr("Indiquez l'objet du rendez-vous");
    if (!proposedDate) return setErr("Choisissez une date");
    setSaving(true);
    try {
      await clientCasesApi.requestEvent(caseId, {
        type, title: title.trim(),
        proposed_date: new Date(proposedDate).toISOString(),
        alternative_date: altDate ? new Date(altDate).toISOString() : undefined,
        message: message.trim() || undefined,
      });
      onSubmitted();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Échec d'envoi"); }
    finally { setSaving(false); }
  }
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="my-8 w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1012] p-6 space-y-3 shadow-2xl">
          <h3 className="font-display text-lg font-bold text-white">Demander un rendez-vous</h3>
          <p className="text-xs text-white/55">Le cabinet examinera votre demande et confirmera (ou proposera une autre date).</p>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([["rdv", "Rendez-vous"], ["consultation", "Consultation"], ["autre", "Autre"]] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setType(v)}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${type === v ? "border-lime/35 bg-lime/15 text-lime" : "border-white/10 bg-white/[0.02] text-white/55"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Objet *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:border-lime/40 focus:outline-none" placeholder="Ex : Point d'avancement, signature contrat" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Date proposée *</label>
              <input type="datetime-local" value={proposedDate} onChange={(e) => setProposedDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Alternative</label>
              <input type="datetime-local" value={altDate} onChange={(e) => setAltDate(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Message (optionnel)</label>
            <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:outline-none" placeholder="Précisez le motif, contraintes horaires…" />
          </div>
          {err && <div className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral">{err}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/55 hover:text-white">Annuler</button>
            <button onClick={send} disabled={saving} className="flex-1 rounded-xl bg-lime py-2.5 text-sm font-bold text-ink hover:brightness-110 disabled:opacity-50">{saving ? "Envoi…" : "Envoyer la demande"}</button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ClientEventCard({ event }: { event: ClientCaseDetail["events"][number] }) {
  const cfg = EVENT_TYPE[event.type] ?? EVENT_TYPE.autre;
  const isPast = !!event.completed_at;
  return (
    <div className={`rounded-2xl border p-4 ${isPast ? "border-white/[0.08] bg-white/[0.02] opacity-80" : "border-white/[0.08] bg-white/[0.03]"}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 text-2xl">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 text-[10px] font-bold text-violet uppercase">{cfg.label}</span>
            <p className="font-semibold text-white">{event.title}</p>
          </div>
          <p className="mt-1 text-xs text-white/70">📅 {fmtDateTime(event.scheduled_at)}{event.duration_minutes ? ` · ${event.duration_minutes} min` : ""}</p>
          {event.location && <p className="text-xs text-white/55">📍 {event.location}</p>}
          {event.notes_client_facing && <p className="mt-2 text-xs text-white/75 italic border-l-2 border-lime/40 pl-3">« {event.notes_client_facing} »</p>}
          {event.outcome && <p className="mt-2 rounded-lg bg-lime/[0.06] border border-lime/20 px-3 py-2 text-xs text-lime/90"><strong>Compte-rendu :</strong> {event.outcome}</p>}
        </div>
      </div>
    </div>
  );
}

function ClientUploadModal({ open, onClose, caseId, onUploaded }: { open: boolean; onClose: () => void; caseId: number; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("autre");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setFile(null); setTitle(""); setKind("autre"); setDescription(""); setErr(null); } }, [open]);
  if (!open) return null;
  async function send() {
    if (!file) return setErr("Sélectionner un fichier");
    if (!title.trim()) return setErr("Titre requis");
    setSaving(true);
    try {
      const payload = await fileToB64(file);
      await clientCasesApi.uploadDocument(caseId, {
        title: title.trim(), kind, description: description.trim() || undefined,
        filename: payload.filename, mime: payload.mime, data_base64: payload.data_base64,
      });
      onUploaded(); onClose();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Échec d'envoi"); }
    finally { setSaving(false); }
  }
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="my-8 w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1012] p-6 space-y-4 shadow-2xl">
          <h3 className="font-display text-lg font-bold text-white">Envoyer une pièce au cabinet</h3>
          <p className="text-xs text-white/55">PDF, Word, Excel, JPG, PNG, WEBP, TXT — 10 Mo maximum.</p>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Fichier *</label>
            <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt" onChange={(e) => {
              const f = e.target.files?.[0]; setFile(f ?? null);
              if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
            }} className="block w-full text-xs text-white/65 file:mr-3 file:rounded-lg file:border file:border-white/15 file:bg-white/[0.04] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white file:hover:bg-white/[0.08]" />
            {file && <p className="mt-1 text-[11px] text-white/45">{file.name} · {fmtSize(file.size)}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Titre *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:border-lime/40 focus:outline-none" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Catégorie</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:outline-none">
              {Object.entries(DOC_KIND).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5">Note (optionnel)</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:outline-none" />
          </div>
          {err && <div className="rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 text-xs text-coral">{err}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/55 hover:text-white">Annuler</button>
            <button onClick={send} disabled={saving || !file} className="flex-1 rounded-xl bg-lime py-2.5 text-sm font-bold text-ink hover:brightness-110 disabled:opacity-50">
              {saving ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function MessagesPane({ messages, input, setInput, sending, sendMessage, clientName, bottomRef }: {
  messages: ClientMessage[]; input: string; setInput: (s: string) => void; sending: boolean;
  sendMessage: (e: React.FormEvent) => void; clientName: string; bottomRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-coral/40 to-violet/40 text-xs font-black text-white">A</div>
        <div>
          <p className="text-sm font-semibold text-white">Équipe Afrilex Conseil</p>
          <p className="text-xs text-lime/70">● Disponible · Réponse sous 24h ouvrées</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] flex flex-col" style={{ height: "55vh" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {messages.map((m) => {
              const isMe = m.sender_type === "client";
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className={`shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-xs font-bold ${isMe ? "bg-gradient-to-br from-lime/60 to-lime/30 text-ink" : "bg-gradient-to-br from-coral/60 to-violet/40 text-white"}`}>
                    {isMe ? clientName.charAt(0).toUpperCase() : "A"}
                  </div>
                  <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"} gap-0.5`}>
                    <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? "rounded-tr-sm bg-lime text-ink font-medium" : "rounded-tl-sm border border-white/10 bg-white/[0.05] text-white/85"}`}>
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
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Écrivez à l'équipe Afrilex Conseil…"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/45 focus:border-lime/40 focus:outline-none transition" disabled={sending} />
          <button type="submit" disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime text-ink hover:brightness-110 transition active:scale-95 disabled:opacity-30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4 translate-x-0.5"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function SettingsPane(props: {
  msg: string;
  form: { name: string; company: string; phone: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; company: string; phone: string }>>;
  pwForm: { old: string; new: string; confirm: string };
  setPwForm: React.Dispatch<React.SetStateAction<{ old: string; new: string; confirm: string }>>;
  savingPw: boolean;
  onSaveProfile: () => void;
  onChangePw: () => void;
  onLogout: () => void;
}) {
  const { msg, form, setForm, pwForm, setPwForm, savingPw, onSaveProfile, onChangePw, onLogout } = props;
  return (
    <div className="space-y-5">
      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${msg.includes("incorrect") || msg.includes("correspondent") ? "border-coral/25 bg-coral/10 text-coral" : "border-lime/20 bg-lime/8 text-lime"}`}>{msg}</div>
      )}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
        <h3 className="font-bold text-white">Mes informations</h3>
        {([["name", "Nom complet", "text"], ["company", "Entreprise", "text"], ["phone", "Téléphone", "tel"]] as const).map(([k, l, t]) => (
          <div key={k}>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1.5">{l}</label>
            <input type={t} value={(form as Record<string, string>)[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-lime/50 focus:outline-none transition" />
          </div>
        ))}
        <button onClick={onSaveProfile} className="w-full rounded-xl bg-lime py-3 text-sm font-bold text-ink hover:brightness-110 transition">Sauvegarder</button>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
        <h3 className="font-bold text-white">Changer le mot de passe</h3>
        {([["old", "Mot de passe actuel"], ["new", "Nouveau mot de passe"], ["confirm", "Confirmer le nouveau"]] as const).map(([k, l]) => (
          <div key={k}>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1.5">{l}</label>
            <input type="password" value={(pwForm as Record<string, string>)[k]} onChange={(e) => setPwForm((f) => ({ ...f, [k]: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-violet/50 focus:outline-none transition" />
          </div>
        ))}
        <button disabled={savingPw} onClick={onChangePw} className="w-full rounded-xl bg-violet py-3 text-sm font-bold text-ink hover:brightness-110 transition disabled:opacity-40">
          {savingPw ? "Modification…" : "Modifier le mot de passe"}
        </button>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-coral/10 border border-coral/25 text-coral">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M9 2H5a1 1 0 00-1 1v14a1 1 0 001 1h4M13 6l4 4-4 4M17 10H7" /></svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Se déconnecter</p>
          <p className="text-xs text-white/40">Vous serez redirigé vers la page de connexion</p>
        </div>
        <button onClick={onLogout} className="rounded-xl border border-coral/25 bg-coral/10 px-4 py-2 text-sm font-semibold text-coral hover:bg-coral/20 transition">
          Déconnexion
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Signatures électroniques (Client)
// ─────────────────────────────────────────────────────────────────────────────
function ClientSignaturesPane({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [pending, setPending] = useState<ClientSignature[]>([]);
  const [history, setHistory] = useState<ClientSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ClientSignature | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        clientCasesApi.signaturesPending(),
        clientCasesApi.signaturesHistory(),
      ]);
      setPending(p); setHistory(h);
      onCountChange(p.length);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">À signer ({pending.length})</h2>
        {loading && <p className="text-sm text-white/45 mt-2">Chargement…</p>}
        {!loading && pending.length === 0 && (
          <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] py-8 text-center text-sm text-white/55">
            ✓ Aucun document n'attend votre signature.
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {pending.map((s) => (
            <li key={s.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200">En attente</span>
                    {s.case_number && <span className="text-[10px] text-white/55">📁 {s.case_number}</span>}
                  </div>
                  <p className="font-semibold text-white">{s.title}</p>
                  {s.case_name && <p className="text-xs text-white/55 mt-0.5">Dossier : {s.case_name}</p>}
                  {s.expires_at && <p className="text-[11px] text-amber-200/85 mt-1">⏰ Expire le {fmtDate(s.expires_at)}</p>}
                </div>
                <button onClick={() => setActive(s)} className="shrink-0 rounded-xl bg-lime px-4 py-2 text-xs font-bold text-ink hover:brightness-110">
                  Lire & signer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white">Historique</h2>
          <ul className="mt-3 space-y-1.5">
            {history.map((s) => {
              const cls = s.status === "signed" ? "border-lime/30 bg-lime/[0.05] text-lime" : "border-coral/30 bg-coral/[0.05] text-coral";
              return (
                <li key={s.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                    <p className="text-[11px] text-white/50">{s.case_name ?? ""} · {s.signed_at ? `signé le ${fmtDate(s.signed_at)}` : `créé le ${fmtDate(s.created_at)}`}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{s.status === "signed" ? "Signé" : s.status === "refused" ? "Refusé" : "Clos"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {active && <SignatureModal signature={active} onClose={() => setActive(null)} onDone={() => { setActive(null); load(); }} />}
    </div>
  );
}

function SignatureModal({ signature, onClose, onDone }: { signature: ClientSignature; onClose: () => void; onDone: () => void }) {
  const [fullName, setFullName] = useState("");
  const [accept, setAccept] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showRefuse, setShowRefuse] = useState(false);
  const [reason, setReason] = useState("");

  async function sign() {
    if (!accept) { setErr("Cochez la case d'acceptation."); return; }
    if (fullName.trim().length < 4) { setErr("Veuillez taper votre nom complet (4 caractères min)."); return; }
    setSaving(true); setErr(null);
    try {
      await clientCasesApi.sign(signature.id, { full_name: fullName.trim(), accept: true });
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }
  async function refuse() {
    setSaving(true); setErr(null);
    try { await clientCasesApi.refuse(signature.id, reason || undefined); onDone(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(false); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="my-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f1012] p-6 space-y-4 shadow-2xl">
        <div>
          <h3 className="font-display text-xl font-bold text-white">{signature.title}</h3>
          {signature.case_name && <p className="text-xs text-white/55 mt-1">Dossier : {signature.case_name} {signature.case_number && `· ${signature.case_number}`}</p>}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 max-h-72 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm text-white/85">{signature.content_text}</pre>
        </div>

        {!showRefuse ? (
          <>
            <div className="space-y-3 rounded-xl border border-lime/20 bg-lime/[0.04] p-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-white/55 mb-1.5">Votre nom complet (= votre signature)</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-lime/50 focus:outline-none"
                  placeholder="Ex. Jean Dupont" />
              </div>
              <label className="flex items-start gap-2.5 text-sm text-white/85 cursor-pointer">
                <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-white/30" />
                <span>Je déclare avoir lu et accepté le contenu ci-dessus. Je comprends que ma signature électronique a la même valeur juridique qu'une signature manuscrite (preuve : horodatage + IP + nom typé + hash SHA-256).</span>
              </label>
            </div>
            {err && <div className="rounded-xl border border-coral/35 bg-coral/10 px-3 py-2 text-xs text-coral">{err}</div>}
            <div className="flex flex-wrap gap-2">
              <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/55 hover:text-white">Fermer</button>
              <button onClick={() => setShowRefuse(true)} disabled={saving} className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-2.5 text-sm font-bold text-coral hover:bg-coral/20">Refuser</button>
              <button onClick={sign} disabled={saving || !accept || fullName.trim().length < 4}
                className="flex-1 rounded-xl bg-lime py-2.5 text-sm font-bold text-ink hover:brightness-110 disabled:opacity-40">
                {saving ? "Signature…" : "✍ Signer maintenant"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 rounded-xl border border-coral/30 bg-coral/[0.06] p-4">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-coral mb-1.5">Motif du refus (optionnel)</label>
              <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-coral/50 focus:outline-none resize-none"
                placeholder="Expliquez brièvement pourquoi vous ne pouvez pas signer ce document…" />
            </div>
            {err && <div className="rounded-xl border border-coral/35 bg-coral/10 px-3 py-2 text-xs text-coral">{err}</div>}
            <div className="flex gap-2">
              <button onClick={() => setShowRefuse(false)} disabled={saving} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/55 hover:text-white">← Retour</button>
              <button onClick={refuse} disabled={saving} className="flex-1 rounded-xl bg-coral py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-40">
                {saving ? "…" : "Confirmer le refus"}
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
