import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  casesApi,
  type CaseDetail,
  type CaseMilestone,
  type CaseEvent,
  type CaseDocument,
} from "../api";
import { useAuth, hasRole } from "../BureauContext";

const PRACTICE_AREAS = [
  { v: "ohada",       l: "Droit OHADA / affaires" },
  { v: "fiscal",      l: "Fiscalité" },
  { v: "social",      l: "Droit social / RH" },
  { v: "penal_aff",   l: "Pénal des affaires" },
  { v: "civil",       l: "Civil / contrats" },
  { v: "commercial",  l: "Commercial / contentieux" },
  { v: "structuration", l: "Structuration / corporate" },
  { v: "autre",       l: "Autre" },
];

const MILESTONE_STATUS_LABELS: Record<CaseMilestone["status"], { l: string; cls: string }> = {
  a_faire:  { l: "À faire",   cls: "border-white/15 bg-white/[0.03] text-white/60" },
  en_cours: { l: "En cours",  cls: "border-coral/30 bg-coral/10 text-coral" },
  termine:  { l: "Terminé",   cls: "border-lime/30 bg-lime/12 text-lime" },
  reporte:  { l: "Reporté",   cls: "border-violet/30 bg-violet/10 text-violet" },
  annule:   { l: "Annulé",    cls: "border-white/10 bg-white/[0.02] text-white/45 line-through" },
};

const EVENT_TYPE_LABELS: Record<CaseEvent["type"], { l: string; icon: string; cls: string }> = {
  audience:     { l: "Audience",       icon: "⚖️", cls: "border-coral/35 bg-coral/12 text-coral" },
  rdv:          { l: "Rendez-vous",    icon: "📅", cls: "border-lime/30 bg-lime/12 text-lime" },
  echeance:     { l: "Échéance",       icon: "⏰", cls: "border-violet/35 bg-violet/12 text-violet" },
  depot_pieces: { l: "Dépôt pièces",   icon: "📂", cls: "border-violet/30 bg-violet/10 text-violet" },
  consultation: { l: "Consultation",   icon: "💬", cls: "border-white/15 bg-white/[0.04] text-white/75" },
  autre:        { l: "Autre",          icon: "📌", cls: "border-white/15 bg-white/[0.03] text-white/60" },
};

const DOC_KIND_LABELS: Record<CaseDocument["kind"], string> = {
  preuve: "Preuve",
  contrat: "Contrat",
  jugement: "Jugement / arrêt",
  conclusions: "Conclusions",
  expertise: "Expertise",
  correspondance: "Correspondance",
  identite: "Pièce d'identité",
  autre: "Autre",
};

const inp = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/45 focus:border-coral/50 focus:outline-none transition";
const lbl = "block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)); } catch { return iso; }
}
function fmtDt(iso?: string | null) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); } catch { return iso; }
}
function fmtSize(b?: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
}
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

type Tab = "overview" | "milestones" | "events" | "documents" | "clients";

export function CaseDetailDrawer({ projectId, onClose, onChange }: {
  projectId: number | null;
  onClose: () => void;
  onChange?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");

  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [savingMeta, setSavingMeta] = useState(false);
  const [meta, setMeta] = useState({ case_number: "", practice_area: "", current_phase: "", next_action: "", next_action_date: "" });

  // Milestone modal
  const [msModal, setMsModal] = useState<{ mode: "create" | "edit"; data: Partial<CaseMilestone> } | null>(null);
  // Event modal
  const [evModal, setEvModal] = useState<{ mode: "create" | "edit"; data: Partial<CaseEvent> } | null>(null);
  // Doc upload modal
  const [docModal, setDocModal] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);

  async function load() {
    if (projectId == null) return;
    setLoading(true); setError(null);
    try {
      const d = await casesApi.get(projectId);
      setData(d);
      setMeta({
        case_number: d.project.case_number ?? "",
        practice_area: d.project.practice_area ?? "",
        current_phase: d.project.current_phase ?? "",
        next_action: d.project.next_action ?? "",
        next_action_date: d.project.next_action_date ?? "",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    } finally { setLoading(false); }
  }
  useEffect(() => { if (projectId != null) { setTab("overview"); load(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  async function saveMeta() {
    if (!projectId) return;
    setSavingMeta(true);
    try {
      await projectsApiUpdateMeta(projectId, meta);
      await load();
      onChange?.();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally { setSavingMeta(false); }
  }

  async function downloadDoc(docId: number, name?: string) {
    setDownloadingDocId(docId);
    try { await casesApi.openDocument(docId, name); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Téléchargement impossible"); }
    finally { setDownloadingDocId(null); }
  }

  return (
    <AnimatePresence>
      {projectId != null && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full lg:max-w-[900px] flex-col overflow-hidden border-l border-white/[0.08] bg-[#0c0d10] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="min-w-0 flex-1">
                {data?.project && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {data.project.case_number && (
                        <span className="rounded-md bg-coral/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-coral">{data.project.case_number}</span>
                      )}
                      {data.project.practice_area && (
                        <span className="rounded-md bg-violet/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet">
                          {PRACTICE_AREAS.find((p) => p.v === data.project.practice_area)?.l ?? data.project.practice_area}
                        </span>
                      )}
                      <span className="text-[10px] text-white/45">Dossier #{data.project.id}</span>
                    </div>
                    <h2 className="mt-1.5 font-display text-lg font-bold text-white truncate">{data.project.name}</h2>
                    {data.project.current_phase && (
                      <p className="text-xs text-white/55 mt-0.5">📍 {data.project.current_phase}</p>
                    )}
                  </>
                )}
                {!data && !error && <p className="text-sm text-white/55">Chargement…</p>}
              </div>
              <button onClick={onClose} className="shrink-0 rounded-lg p-2 text-white/55 hover:text-white hover:bg-white/[0.06]" aria-label="Fermer">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M15 5L5 15M5 5l10 10" /></svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-white/[0.06] px-3 py-2 flex gap-1 overflow-x-auto styled-scrollbar">
              {([
                { v: "overview",   l: "Vue d'ensemble", n: null },
                { v: "milestones", l: "Étapes",         n: data?.milestones.length ?? 0 },
                { v: "events",     l: "Audiences/RDV",  n: data?.events.length ?? 0 },
                { v: "documents",  l: "Documents",      n: data?.documents.length ?? 0 },
                { v: "clients",    l: "Clients",        n: data?.clients.length ?? 0 },
              ] as const).map((t) => (
                <button key={t.v} onClick={() => setTab(t.v as Tab)}
                  className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    tab === t.v ? "bg-coral text-white" : "text-white/55 hover:text-white"
                  }`}>
                  {t.l}{t.n != null && <span className={`rounded-full px-1.5 text-[10px] ${tab === t.v ? "bg-white/20" : "bg-white/10"}`}>{t.n}</span>}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto styled-scrollbar p-5">
              {loading && <p className="text-sm text-white/55 text-center py-10">Chargement…</p>}
              {error && <div className="rounded-xl border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>}

              {data && tab === "overview" && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/45 mb-2">Avancement</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-coral to-lime transition-all" style={{ width: `${data.project.progress ?? 0}%` }} />
                      </div>
                      <span className="text-sm font-bold text-white">{data.project.progress ?? 0}%</span>
                    </div>
                  </div>

                  {data.project.description && (
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/45 mb-1.5">Description</p>
                      <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{data.project.description}</p>
                    </div>
                  )}

                  {/* Méta-données juridiques (édition admin) */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Méta-données juridiques</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Référence dossier</label>
                        <input value={meta.case_number} disabled={!isAdmin} onChange={(e) => setMeta((m) => ({ ...m, case_number: e.target.value }))} placeholder="AFL-2026-042" className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Matière</label>
                        <select value={meta.practice_area} disabled={!isAdmin} onChange={(e) => setMeta((m) => ({ ...m, practice_area: e.target.value }))} className={inp}>
                          <option value="">—</option>
                          {PRACTICE_AREAS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lbl}>Étape actuelle</label>
                        <input value={meta.current_phase} disabled={!isAdmin} onChange={(e) => setMeta((m) => ({ ...m, current_phase: e.target.value }))} placeholder="Mise en état" className={inp} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={lbl}>Prochaine action</label>
                        <input value={meta.next_action} disabled={!isAdmin} onChange={(e) => setMeta((m) => ({ ...m, next_action: e.target.value }))} placeholder="Dépôt des conclusions en réplique" className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>Date prochaine action</label>
                        <input type="date" value={meta.next_action_date} disabled={!isAdmin} onChange={(e) => setMeta((m) => ({ ...m, next_action_date: e.target.value }))} className={inp} />
                      </div>
                    </div>
                    {isAdmin && (
                      <button onClick={saveMeta} disabled={savingMeta} className="w-full sm:w-auto rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-50">
                        {savingMeta ? "Enregistrement…" : "Enregistrer la fiche"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {data && tab === "milestones" && (
                <MilestonesPane data={data} isAdmin={isAdmin} onCreate={() => setMsModal({ mode: "create", data: { order_index: (data.milestones[data.milestones.length - 1]?.order_index ?? 0) + 10, visible_to_client: true, status: "a_faire" } })}
                  onEdit={(m) => setMsModal({ mode: "edit", data: m })} onChanged={load} />
              )}

              {data && tab === "events" && (
                <EventsPane data={data} isAdmin={isAdmin} onCreate={() => setEvModal({ mode: "create", data: { type: "rdv", duration_minutes: 60, visible_to_client: true } })}
                  onEdit={(e) => setEvModal({ mode: "edit", data: e })} onChanged={load} />
              )}

              {data && tab === "documents" && (
                <DocumentsPane data={data} isAdmin={isAdmin} onUpload={() => setDocModal(true)} onChanged={load}
                  onDownload={downloadDoc} downloadingId={downloadingDocId} />
              )}

              {data && tab === "clients" && (
                <ClientsPane data={data} isAdmin={isAdmin} onChanged={load} />
              )}
            </div>
          </motion.div>

          {/* Sub-modals */}
          <MilestoneModal projectId={projectId} state={msModal} onClose={() => setMsModal(null)} onSaved={load} />
          <EventModal projectId={projectId} state={evModal} onClose={() => setEvModal(null)} onSaved={load} />
          <DocumentUploadModal projectId={projectId} open={docModal} onClose={() => setDocModal(false)} onSaved={load} />
        </>
      )}
    </AnimatePresence>
  );
}

// projectsApi.updateMeta wrapper imported lazily to avoid circular reference issues
async function projectsApiUpdateMeta(id: number, meta: Record<string, string | null>) {
  const { projectsApi } = await import("../api");
  // Send empty strings as null
  const cleaned: Record<string, string | null> = {};
  Object.entries(meta).forEach(([k, v]) => { cleaned[k] = v === "" ? null : v; });
  return projectsApi.updateMeta(id, cleaned as Parameters<typeof projectsApi.updateMeta>[1]);
}

// ── Sub-panes ─────────────────────────────────────────────────────────────────

function MilestonesPane({ data, isAdmin, onCreate, onEdit, onChanged }: {
  data: CaseDetail; isAdmin: boolean; onCreate: () => void; onEdit: (m: CaseMilestone) => void; onChanged: () => void;
}) {
  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-white/55">Procédure du dossier — étapes ordonnées, visibles côté client si activé.</p>
          <button onClick={onCreate} className="rounded-xl bg-coral px-4 py-2 text-xs font-bold text-white hover:brightness-110 transition">+ Nouvelle étape</button>
        </div>
      )}
      {data.milestones.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-10 text-center text-sm text-white/45">
          Aucune étape pour l'instant.
        </div>
      ) : (
        <ol className="space-y-2">
          {data.milestones.map((m, i) => {
            const cfg = MILESTONE_STATUS_LABELS[m.status];
            const dueLate = m.due_date && m.status !== "termine" && m.status !== "annule" && new Date(m.due_date) < new Date();
            return (
              <li key={m.id} className={`rounded-2xl border p-4 ${m.status === "termine" ? "border-lime/15 bg-lime/[0.04]" : "border-white/[0.08] bg-white/[0.02]"}`}>
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black ${
                    m.status === "termine" ? "bg-lime text-ink" : "bg-coral/15 text-coral border border-coral/30"
                  }`}>
                    {m.status === "termine" ? "✓" : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-semibold text-white ${m.status === "termine" ? "line-through opacity-70" : ""}`}>{m.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.cls}`}>{cfg.l}</span>
                      {!m.visible_to_client && <span className="text-[10px] text-violet/85 font-bold uppercase">🔒 Interne</span>}
                      {dueLate && <span className="text-[10px] text-coral font-bold uppercase">⚠ En retard</span>}
                    </div>
                    {m.description && <p className="text-xs text-white/65 mt-1 whitespace-pre-wrap">{m.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-white/45">
                      {m.due_date && <span>📅 Échéance : {fmt(m.due_date)}</span>}
                      {m.completed_at && <span className="text-lime/85">✓ Terminée le {fmt(m.completed_at)}{m.completed_by_name ? ` par ${m.completed_by_name}` : ""}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="shrink-0 flex gap-1">
                      {m.status !== "termine" && (
                        <button onClick={async () => { try { await casesApi.milestoneUpdate(m.id, { status: "termine" }); onChanged(); } catch (e) { alert(String((e as Error).message)); } }}
                          className="rounded-lg border border-lime/30 bg-lime/10 px-2.5 py-1 text-[10px] font-bold text-lime hover:bg-lime/20 transition" title="Marquer terminé">✓</button>
                      )}
                      <button onClick={() => onEdit(m)} className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/60 hover:text-white">✎</button>
                      <button onClick={async () => { if (confirm("Supprimer cette étape ?")) { await casesApi.milestoneDelete(m.id); onChanged(); } }}
                        className="rounded-lg text-white/45 hover:text-coral text-[10px] px-2 py-1 hover:bg-coral/10 transition">🗑</button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function EventsPane({ data, isAdmin, onCreate, onEdit, onChanged }: {
  data: CaseDetail; isAdmin: boolean; onCreate: () => void; onEdit: (e: CaseEvent) => void; onChanged: () => void;
}) {
  const upcoming = useMemo(() => data.events.filter((e) => !e.completed_at), [data.events]);
  const past = useMemo(() => data.events.filter((e) => !!e.completed_at), [data.events]);
  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-white/55">Audiences, rendez-vous, échéances. Notifications WhatsApp envoyées automatiquement.</p>
          <button onClick={onCreate} className="rounded-xl bg-coral px-4 py-2 text-xs font-bold text-white hover:brightness-110 transition">+ Nouvel événement</button>
        </div>
      )}
      {upcoming.length === 0 && past.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-10 text-center text-sm text-white/45">Aucun événement programmé.</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">À venir ({upcoming.length})</p>
              {upcoming.map((e) => <EventCard key={e.id} event={e} isAdmin={isAdmin} onEdit={onEdit} onChanged={onChanged} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Passés ({past.length})</p>
              {past.map((e) => <EventCard key={e.id} event={e} isAdmin={isAdmin} onEdit={onEdit} onChanged={onChanged} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event, isAdmin, onEdit, onChanged }: { event: CaseEvent; isAdmin: boolean; onEdit: (e: CaseEvent) => void; onChanged: () => void }) {
  const cfg = EVENT_TYPE_LABELS[event.type];
  const isPast = !!event.completed_at;
  return (
    <div className={`rounded-2xl border p-4 ${isPast ? "border-white/[0.08] bg-white/[0.02] opacity-75" : "border-white/[0.08] bg-white/[0.03]"}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 text-2xl">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.cls}`}>{cfg.l}</span>
            <p className="font-semibold text-white">{event.title}</p>
            {!event.visible_to_client && <span className="text-[10px] text-violet/85 font-bold uppercase">🔒 Interne</span>}
          </div>
          <p className="mt-1 text-xs text-white/70">📅 {fmtDt(event.scheduled_at)}{event.duration_minutes ? ` · ${event.duration_minutes} min` : ""}</p>
          {event.location && <p className="text-xs text-white/55">📍 {event.location}</p>}
          {event.notes_client_facing && (
            <p className="mt-2 text-xs text-white/75 italic border-l-2 border-lime/40 pl-3">Client : « {event.notes_client_facing} »</p>
          )}
          {event.notes_internal && (
            <p className="mt-1 text-xs text-violet/75 italic border-l-2 border-violet/40 pl-3">Interne : « {event.notes_internal} »</p>
          )}
          {event.outcome && (
            <p className="mt-2 rounded-lg bg-lime/[0.06] border border-lime/20 px-3 py-2 text-xs text-lime/90"><strong>Compte-rendu :</strong> {event.outcome}</p>
          )}
        </div>
        {isAdmin && (
          <div className="shrink-0 flex gap-1">
            <button onClick={() => onEdit(event)} className="rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/60 hover:text-white">✎</button>
            <button onClick={async () => { if (confirm("Supprimer cet événement ?")) { await casesApi.eventDelete(event.id); onChanged(); } }}
              className="rounded-lg text-white/45 hover:text-coral text-[10px] px-2 py-1 hover:bg-coral/10 transition">🗑</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsPane({ data, isAdmin, onUpload, onChanged, onDownload, downloadingId }: {
  data: CaseDetail; isAdmin: boolean; onUpload: () => void; onChanged: () => void;
  onDownload: (id: number, name?: string) => void; downloadingId: number | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-white/55">Pièces du dossier (cabinet ↔ client). Marquez « visible client » pour partager.</p>
        {isAdmin && <button onClick={onUpload} className="rounded-xl bg-coral px-4 py-2 text-xs font-bold text-white hover:brightness-110 transition">+ Téléverser</button>}
      </div>
      {data.documents.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-10 text-center text-sm text-white/45">Aucune pièce dans ce dossier.</div>
      ) : (
        <ul className="space-y-2">
          {data.documents.map((d) => (
            <li key={d.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-violet/15 flex items-center justify-center text-lg">📄</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white truncate">{d.title}</p>
                    <span className="rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 text-[10px] font-bold text-violet uppercase">{DOC_KIND_LABELS[d.kind]}</span>
                    {d.confidential && <span className="rounded-full border border-coral/35 bg-coral/10 px-2 py-0.5 text-[10px] font-bold text-coral uppercase">🔒 Confidentiel</span>}
                    {!d.visible_to_client && !d.confidential && <span className="text-[10px] text-violet/85 font-bold uppercase">🔒 Interne</span>}
                    {d.uploaded_by_kind === "client" && <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-bold text-lime uppercase">↑ par client</span>}
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {d.filename ?? "—"} · {d.mime} · {fmtSize(d.size_bytes)}
                    {d.uploaded_by_name && ` · par ${d.uploaded_by_name}`} · {fmt(d.created_at)}
                  </p>
                  {d.description && <p className="mt-1 text-xs text-white/60">{d.description}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button onClick={() => onDownload(d.id, d.filename ?? d.title)} disabled={downloadingId === d.id}
                    className="rounded-lg border border-violet/30 bg-violet/15 px-3 py-1.5 text-xs font-bold text-violet hover:bg-violet/25 transition disabled:opacity-50">
                    {downloadingId === d.id ? "…" : "↓ Ouvrir"}
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={async () => { try { await casesApi.documentUpdate(d.id, { visible_to_client: !d.visible_to_client }); onChanged(); } catch (e) { alert(String((e as Error).message)); } }}
                        className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition ${d.visible_to_client ? "border-lime/30 bg-lime/10 text-lime hover:bg-lime/20" : "border-white/15 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]"}`}
                        title={d.visible_to_client ? "Visible client — cliquer pour rendre interne" : "Interne — cliquer pour rendre visible client"}>
                        {d.visible_to_client ? "👁 Client" : "🔒 Interne"}
                      </button>
                      <button onClick={async () => { if (confirm("Supprimer ce document ?")) { await casesApi.documentDelete(d.id); onChanged(); } }}
                        className="rounded-lg text-white/45 hover:text-coral text-[10px] px-2 py-1.5 hover:bg-coral/10 transition">🗑</button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientsPane({ data, isAdmin, onChanged }: { data: CaseDetail; isAdmin: boolean; onChanged: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-white/55">Clients liés à ce dossier (multi possible : associés, représentants, etc.).</p>
      {data.clients.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-10 text-center text-sm text-white/45">
          Aucun client lié à ce dossier. Liez-le depuis la page « Messages clients » ou créez le compte client puis rattachez-le ici.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.clients.map((c) => (
            <li key={c.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-center gap-3">
              <div className="shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-lime/30 to-violet/30 flex items-center justify-center text-sm font-bold text-white">{c.name?.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{c.name}</p>
                <p className="text-[11px] text-white/50">{c.email}{c.company ? ` · ${c.company}` : ""}{c.phone ? ` · ${c.phone}` : ""}</p>
                <p className="text-[10px] text-white/45 mt-0.5">Rôle : <span className="font-semibold text-white/65">{c.role}</span> · Lié le {fmt(c.added_at)}</p>
              </div>
              {isAdmin && (
                <button onClick={async () => {
                  if (!confirm(`Délier « ${c.name} » de ce dossier ? (le compte client n'est pas supprimé)`)) return;
                  try { await casesApi.detachClient(data.project.id, c.id); onChanged(); } catch (e) { alert(String((e as Error).message)); }
                }} className="shrink-0 rounded-lg border border-coral/25 px-3 py-1.5 text-xs text-coral hover:bg-coral/10 transition">Délier</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Sub-modals ───────────────────────────────────────────────────────────────

function MilestoneModal({ projectId, state, onClose, onSaved }: {
  projectId: number | null; state: { mode: "create" | "edit"; data: Partial<CaseMilestone> } | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<CaseMilestone>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (state) { setForm(state.data); setErr(null); } }, [state]);
  if (!state) return null;
  async function save() {
    if (!projectId || !state) return;
    if (!form.title?.trim()) return setErr("Titre requis");
    setSaving(true);
    try {
      if (state.mode === "create") await casesApi.milestoneCreate(projectId, form);
      else if (form.id) await casesApi.milestoneUpdate(form.id, form);
      onSaved(); onClose();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="my-8 w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1012] p-6 space-y-4 shadow-2xl">
        <h3 className="font-display text-lg font-bold text-white">{state.mode === "create" ? "Nouvelle étape" : "Modifier l'étape"}</h3>
        <div>
          <label className={lbl}>Titre *</label>
          <input value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inp} placeholder="Mise en état" />
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inp + " resize-none"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Échéance</label>
            <input type="date" value={form.due_date ?? ""} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Statut</label>
            <select value={form.status ?? "a_faire"} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CaseMilestone["status"] }))} className={inp}>
              {Object.entries(MILESTONE_STATUS_LABELS).map(([v, c]) => <option key={v} value={v}>{c.l}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={form.visible_to_client !== false} onChange={(e) => setForm((f) => ({ ...f, visible_to_client: e.target.checked }))} className="h-4 w-4 rounded border-white/20" />
          Visible côté client
        </label>
        {err && <div className="rounded-xl border border-coral/35 bg-coral/10 px-3 py-2 text-xs text-coral">{err}</div>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/55 hover:text-white">Annuler</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-coral py-2.5 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-50">
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EventModal({ projectId, state, onClose, onSaved }: {
  projectId: number | null; state: { mode: "create" | "edit"; data: Partial<CaseEvent> } | null; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<CaseEvent>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (state) { setForm(state.data); setErr(null); } }, [state]);
  if (!state) return null;
  async function save() {
    if (!projectId || !state) return;
    if (!form.title?.trim()) return setErr("Titre requis");
    if (!form.scheduled_at) return setErr("Date/heure requise");
    setSaving(true);
    try {
      if (state.mode === "create") await casesApi.eventCreate(projectId, form);
      else if (form.id) await casesApi.eventUpdate(form.id, form);
      onSaved(); onClose();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  }
  // Convertit ISO → format datetime-local (YYYY-MM-DDTHH:mm)
  const dtVal = form.scheduled_at ? new Date(form.scheduled_at).toISOString().slice(0, 16) : "";
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="my-8 w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1012] p-6 space-y-4 shadow-2xl">
        <h3 className="font-display text-lg font-bold text-white">{state.mode === "create" ? "Nouvel événement" : "Modifier l'événement"}</h3>
        <div>
          <label className={lbl}>Type</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(EVENT_TYPE_LABELS).map(([v, c]) => (
              <button key={v} type="button" onClick={() => setForm((f) => ({ ...f, type: v as CaseEvent["type"] }))}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${form.type === v ? c.cls : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25"}`}>
                {c.icon} {c.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={lbl}>Titre *</label>
          <input value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inp} placeholder="Plaidoirie 1ère chambre civile" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Date & heure *</label>
            <input type="datetime-local" value={dtVal} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: new Date(e.target.value).toISOString() }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Durée (min)</label>
            <input type="number" value={form.duration_minutes ?? 60} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: +e.target.value }))} className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Lieu</label>
          <input value={form.location ?? ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className={inp} placeholder="TGI Ouagadougou — salle 3" />
        </div>
        <div>
          <label className={lbl}>Notes pour le client</label>
          <textarea rows={2} value={form.notes_client_facing ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes_client_facing: e.target.value }))} className={inp + " resize-none"} placeholder="Veuillez prévoir vos pièces d'identité." />
        </div>
        <div>
          <label className={lbl}>Notes internes (équipe)</label>
          <textarea rows={2} value={form.notes_internal ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes_internal: e.target.value }))} className={inp + " resize-none"} placeholder="Préparer notes plaidoirie + jurisprudence Cass. com. 2024" />
        </div>
        {form.completed_at && (
          <div>
            <label className={lbl}>Compte-rendu (post-événement)</label>
            <textarea rows={2} value={form.outcome ?? ""} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} className={inp + " resize-none"} />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={form.visible_to_client !== false} onChange={(e) => setForm((f) => ({ ...f, visible_to_client: e.target.checked }))} className="h-4 w-4 rounded border-white/20" />
          Visible côté client
        </label>
        {err && <div className="rounded-xl border border-coral/35 bg-coral/10 px-3 py-2 text-xs text-coral">{err}</div>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/55 hover:text-white">Annuler</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-coral py-2.5 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-50">
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DocumentUploadModal({ projectId, open, onClose, onSaved }: { projectId: number | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", kind: "autre" as CaseDocument["kind"], description: "", visible_to_client: true, confidential: false });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setForm({ title: "", kind: "autre", description: "", visible_to_client: true, confidential: false }); setFile(null); setErr(null); } }, [open]);
  if (!open) return null;
  async function save() {
    if (!projectId) return;
    if (!file) return setErr("Sélectionner un fichier");
    if (!form.title.trim()) return setErr("Titre requis");
    setSaving(true);
    try {
      const payload = await fileToB64(file);
      await casesApi.documentUpload(projectId, {
        title: form.title.trim(), kind: form.kind, description: form.description.trim() || undefined,
        filename: payload.filename, mime: payload.mime, data_base64: payload.data_base64,
        visible_to_client: form.visible_to_client, confidential: form.confidential,
      });
      onSaved(); onClose();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setSaving(false); }
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="my-8 w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1012] p-6 space-y-4 shadow-2xl">
        <h3 className="font-display text-lg font-bold text-white">Téléverser un document</h3>
        <div>
          <label className={lbl}>Fichier *</label>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt" onChange={(e) => {
            const f = e.target.files?.[0];
            setFile(f ?? null);
            if (f && !form.title) setForm((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, "") }));
          }} className="block w-full text-xs text-white/65 file:mr-3 file:rounded-lg file:border file:border-white/15 file:bg-white/[0.04] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white file:hover:bg-white/[0.08]" />
          {file && <p className="mt-1 text-[11px] text-white/45">{file.name} · {fmtSize(file.size)}</p>}
        </div>
        <div>
          <label className={lbl}>Titre *</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Catégorie</label>
          <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as CaseDocument["kind"] }))} className={inp}>
            {Object.entries(DOC_KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inp + " resize-none"} />
        </div>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={form.visible_to_client} onChange={(e) => setForm((f) => ({ ...f, visible_to_client: e.target.checked }))} className="h-4 w-4 rounded border-white/20" />
            Visible côté client
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={form.confidential} onChange={(e) => setForm((f) => ({ ...f, confidential: e.target.checked }))} className="h-4 w-4 rounded border-white/20" />
            Confidentiel (jamais visible client, même si « visible » coché)
          </label>
        </div>
        {err && <div className="rounded-xl border border-coral/35 bg-coral/10 px-3 py-2 text-xs text-coral">{err}</div>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/55 hover:text-white">Annuler</button>
          <button onClick={save} disabled={saving || !file} className="flex-1 rounded-xl bg-coral py-2.5 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-50">
            {saving ? "Téléversement…" : "Téléverser"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
