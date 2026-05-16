import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth, hasRole } from "../BureauContext";
import {
  hrApi,
  usersApi,
  type HrRecord,
  type HrStatus,
  type BureauUser,
} from "../api";

// ── Config types ─────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<HrRecord["type"], string> = {
  conge:   "Congé",
  absence: "Absence",
  retard:  "Retard",
  prime:   "Prime",
  note:    "Note RH",
};
const TYPE_ICONS: Record<HrRecord["type"], string> = {
  conge: "🏖️", absence: "❌", retard: "⏰", prime: "💰", note: "📋",
};
const TYPE_COLORS: Record<HrRecord["type"], string> = {
  conge:   "text-lime   bg-lime/10   border-lime/25",
  absence: "text-coral  bg-coral/10  border-coral/25",
  retard:  "text-violet bg-violet/10 border-violet/20",
  prime:   "text-violet bg-violet/12 border-violet/30",
  note:    "text-white/65 bg-white/[0.04] border-white/12",
};

const STATUS_LABELS: Record<HrStatus, string> = {
  en_attente:    "En attente",
  valide_admin:  "Validée (admin)",
  refuse_admin:  "Refusée (admin)",
  approuve:      "Approuvée",
  refuse:        "Refusée",
};
const STATUS_COLORS: Record<HrStatus, string> = {
  en_attente:   "text-coral   bg-coral/12   border-coral/30",
  valide_admin: "text-violet  bg-violet/12  border-violet/30",
  refuse_admin: "text-white/60 bg-white/[0.04] border-white/15",
  approuve:     "text-lime    bg-lime/15    border-lime/35",
  refuse:       "text-white/55 bg-white/[0.03] border-white/12",
};

// Indique l'étape ATTEINTE dans le workflow (0=créée, 1=admin, 2=super_admin)
function workflowStep(r: HrRecord): { admin: "pending" | "valide" | "refuse"; superAdmin: "pending" | "approuve" | "refuse" } {
  return {
    admin: r.admin_decision === "valide" ? "valide" : r.admin_decision === "refuse" ? "refuse" : "pending",
    superAdmin: r.super_admin_decision === "approuve" ? "approuve" : r.super_admin_decision === "refuse" ? "refuse" : "pending",
  };
}

const card = "rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm";
const inp = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/45 focus:border-coral/50 focus:outline-none transition";
const lbl = "block text-[11px] font-bold uppercase tracking-wider text-white/45 mb-1.5";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
  } catch { return iso; }
}
function fmtDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "—";
  if (start && end && start === end) return fmtDate(start);
  if (start && end) return `${fmtDate(start)} → ${fmtDate(end)}`;
  return fmtDate(start || end);
}
function daysBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start), e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

// ── Composants ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HrStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function TypeBadge({ type }: { type: HrRecord["type"] }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${TYPE_COLORS[type]}`}>
      <span>{TYPE_ICONS[type]}</span>
      {TYPE_LABELS[type]}
    </span>
  );
}

function WorkflowSteps({ record }: { record: HrRecord }) {
  const step = workflowStep(record);
  const adminCls =
    step.admin === "valide" ? "bg-lime text-ink border-lime"
    : step.admin === "refuse" ? "bg-coral text-white border-coral"
    : (record.status === "en_attente" ? "bg-white/[0.04] text-white/55 border-white/15 animate-pulse" : "bg-white/[0.03] text-white/35 border-white/10");
  const superCls =
    step.superAdmin === "approuve" ? "bg-lime text-ink border-lime"
    : step.superAdmin === "refuse" ? "bg-coral text-white border-coral"
    : (record.status === "valide_admin" ? "bg-white/[0.04] text-white/55 border-white/15 animate-pulse" : "bg-white/[0.03] text-white/35 border-white/10");
  return (
    <div className="flex items-center gap-1.5">
      <span title="Soumise par l'agent" className="flex h-6 w-6 items-center justify-center rounded-full bg-coral/15 border border-coral/30 text-[10px] font-black text-coral">1</span>
      <span className="h-[2px] w-3 bg-white/15" />
      <span title={step.admin === "pending" ? "En attente décision admin" : step.admin === "valide" ? `Validée par ${record.admin_decision_by_name ?? "admin"}` : `Refusée par ${record.admin_decision_by_name ?? "admin"}`}
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black ${adminCls}`}>
        {step.admin === "valide" ? "✓" : step.admin === "refuse" ? "✕" : "2"}
      </span>
      <span className="h-[2px] w-3 bg-white/15" />
      <span title={step.superAdmin === "pending" ? "En attente décision finale" : step.superAdmin === "approuve" ? `Approuvée par ${record.super_admin_decision_by_name ?? "super admin"}` : `Refusée par ${record.super_admin_decision_by_name ?? "super admin"}`}
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black ${superCls}`}>
        {step.superAdmin === "approuve" ? "✓" : step.superAdmin === "refuse" ? "✕" : "3"}
      </span>
    </div>
  );
}

// ── Modals ───────────────────────────────────────────────────────────────────

type RequestForm = {
  type: "conge" | "absence" | "retard" | "note";
  title: string;
  start_date: string;
  end_date: string;
  description: string;
};
const EMPTY_REQUEST: RequestForm = {
  type: "conge",
  title: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  description: "",
};

function RequestModal({
  open, onClose, onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState<RequestForm>(EMPTY_REQUEST);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setForm(EMPTY_REQUEST); setError(null); }
  }, [open]);

  const nbDays = useMemo(() => daysBetween(form.start_date, form.end_date), [form.start_date, form.end_date]);
  const needsDates = form.type === "conge" || form.type === "absence";

  async function submit() {
    setError(null);
    if (!form.title.trim()) return setError("Le titre est requis (ex. « Congé annuel — semaine 18 »).");
    if (needsDates && (!form.start_date || !form.end_date)) return setError("Date de début et de fin obligatoires pour un congé ou une absence.");
    if (needsDates && new Date(form.start_date) > new Date(form.end_date)) return setError("La date de début doit être antérieure ou égale à la date de fin.");
    setSaving(true);
    try {
      await hrApi.request({
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        start_date: needsDates || form.type === "retard" ? form.start_date : undefined,
        end_date: needsDates ? form.end_date : (form.type === "retard" ? form.start_date : undefined),
      });
      onSubmitted();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
            className="my-8 w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f1012] shadow-2xl overflow-hidden">
            <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-white">Nouvelle demande RH</h3>
                <p className="text-xs text-white/45 mt-0.5">Sera validée par un administrateur puis approuvée définitivement par le super administrateur.</p>
              </div>
              <button onClick={onClose} className="text-white/55 hover:text-white transition text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Type de demande *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["conge", "absence", "retard", "note"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`rounded-xl border px-3 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        form.type === t
                          ? TYPE_COLORS[t]
                          : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <span>{TYPE_ICONS[t]}</span>{TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={lbl}>Objet de la demande *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={inp}
                  placeholder={
                    form.type === "conge" ? "Ex : Congé annuel — semaine 18"
                    : form.type === "absence" ? "Ex : Absence pour rendez-vous médical"
                    : form.type === "retard" ? "Ex : Retard exceptionnel (1h30) — embouteillage"
                    : "Ex : Note RH personnelle"
                  }
                  maxLength={240}
                />
              </div>

              {needsDates && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Date de début *</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({ ...f, start_date: v, end_date: f.end_date && f.end_date < v ? v : f.end_date }));
                      }}
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={lbl}>Date de fin *</label>
                    <input
                      type="date"
                      value={form.end_date}
                      min={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                      className={inp}
                    />
                  </div>
                  {nbDays != null && (
                    <p className="col-span-2 text-xs text-lime/85 font-semibold">
                      → Durée : {nbDays} jour{nbDays > 1 ? "s" : ""} ({fmtDate(form.start_date)} au {fmtDate(form.end_date)})
                    </p>
                  )}
                </div>
              )}

              {form.type === "retard" && (
                <div>
                  <label className={lbl}>Date du retard *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value, end_date: e.target.value }))}
                    className={inp}
                  />
                </div>
              )}

              <div>
                <label className={lbl}>Motif / commentaire <span className="font-normal text-white/35 normal-case">(optionnel mais conseillé)</span></label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={inp + " resize-y min-h-[100px]"}
                  placeholder="Détails utiles pour la validation (motif, contexte, contact d'urgence pendant l'absence, etc.)"
                  maxLength={4000}
                />
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-coral">
                  <span className="font-bold">⚠ Erreur :</span> {error}
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.07] px-6 py-4 flex gap-3">
              <button onClick={onClose} disabled={saving}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/55 hover:text-white transition disabled:opacity-50">
                Annuler
              </button>
              <button onClick={submit} disabled={saving}
                className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {saving ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Envoi de la demande…
                  </>
                ) : "Soumettre la demande"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DecisionModal({
  record, level, onClose, onDecided,
}: {
  record: HrRecord | null;
  level: "admin" | "super_admin";
  onClose: () => void;
  onDecided: () => void;
}) {
  const [decision, setDecision] = useState<"valide" | "refuse" | "approuve" | null>(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setDecision(null);
      setComment("");
      setError(null);
    }
  }, [record]);

  if (!record) return null;

  const opts = level === "admin"
    ? [
        { v: "valide" as const, label: "Valider", cls: "border-lime/35 bg-lime/15 text-lime hover:bg-lime/25", icon: "✓" },
        { v: "refuse" as const, label: "Refuser", cls: "border-coral/35 bg-coral/15 text-coral hover:bg-coral/25", icon: "✕" },
      ]
    : [
        { v: "approuve" as const, label: "Approuver (final)", cls: "border-lime/35 bg-lime/15 text-lime hover:bg-lime/25", icon: "✓" },
        { v: "refuse" as const, label: "Refuser (final)", cls: "border-coral/35 bg-coral/15 text-coral hover:bg-coral/25", icon: "✕" },
      ];

  async function submit() {
    if (!decision) return setError("Choisissez Valider ou Refuser.");
    setSaving(true);
    setError(null);
    try {
      if (!record) return;
      await hrApi.decide(record.id, { level, decision, comment: comment.trim() || undefined });
      onDecided();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
          className="my-8 w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f1012] shadow-2xl overflow-hidden">
          <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                {level === "admin" ? "Validation administrateur" : "Décision finale (super admin)"}
              </h3>
              <p className="text-xs text-white/45 mt-0.5">
                {level === "admin"
                  ? "Votre décision sera ensuite soumise au super administrateur pour validation finale."
                  : "Votre décision est définitive et notifie l'agent."}
              </p>
            </div>
            <button onClick={onClose} className="text-white/55 hover:text-white transition text-xl">×</button>
          </div>

          <div className="p-6 space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TypeBadge type={record.type} />
                <StatusBadge status={record.status} />
              </div>
              <p className="text-sm font-semibold text-white">{record.title}</p>
              <p className="text-xs text-white/65">
                👤 <span className="text-white">{record.employee_name ?? "?"}</span>
                {record.employee_email && <span className="text-white/45"> · {record.employee_email}</span>}
              </p>
              <p className="text-xs text-white/65">📅 {fmtDateRange(record.start_date, record.end_date)}{daysBetween(record.start_date, record.end_date) ? ` (${daysBetween(record.start_date, record.end_date)} j)` : ""}</p>
              {record.description && (
                <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/75 whitespace-pre-wrap">{record.description}</p>
              )}
              {level === "super_admin" && record.admin_decision && (
                <div className={`rounded-lg border px-3 py-2 text-xs ${record.admin_decision === "valide" ? "border-lime/25 bg-lime/[0.06] text-lime/90" : "border-coral/25 bg-coral/[0.06] text-coral/85"}`}>
                  <p className="font-bold">
                    {record.admin_decision === "valide" ? "✓ Validée" : "✕ Refusée"} par {record.admin_decision_by_name ?? "admin"} — {record.admin_decision_at ? timeAgo(record.admin_decision_at) : ""}
                  </p>
                  {record.admin_comment && <p className="mt-1 text-white/70 italic">« {record.admin_comment} »</p>}
                </div>
              )}
            </div>

            <div>
              <label className={lbl}>Votre décision *</label>
              <div className="grid grid-cols-2 gap-2">
                {opts.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setDecision(o.v)}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${
                      decision === o.v ? o.cls : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    <span className="text-lg">{o.icon}</span>{o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={lbl}>Commentaire <span className="font-normal text-white/35 normal-case">(optionnel mais conseillé en cas de refus)</span></label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className={inp + " resize-y"}
                placeholder="Motif de la décision, conditions, instructions à l'agent…"
                maxLength={2000}
              />
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-coral">
                <span className="font-bold">⚠ Erreur :</span> {error}
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.07] px-6 py-4 flex gap-3">
            <button onClick={onClose} disabled={saving}
              className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/55 hover:text-white transition disabled:opacity-50">
              Annuler
            </button>
            <button onClick={submit} disabled={saving || !decision}
              className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {saving ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Enregistrement…
                </>
              ) : "Confirmer la décision"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

type Tab = "mine" | "admin_pending" | "final_pending" | "all";

export function HRPage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");
  const isSuperAdmin = hasRole(user, "super_admin");

  const [records, setRecords] = useState<HrRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mine");
  const [search, setSearch] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<{ record: HrRecord; level: "admin" | "super_admin" } | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function notify(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await hrApi.list();
      setRecords(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // ── Stats personnelles ──────────────────────────────────────────────────────
  const myRecords = useMemo(() => records.filter((r) => r.user_id === user?.id), [records, user?.id]);
  const adminPending = useMemo(() => records.filter((r) => r.status === "en_attente" && r.requires_workflow), [records]);
  const finalPending = useMemo(() => records.filter((r) => r.status === "valide_admin" || r.status === "refuse_admin"), [records]);

  const kpis = useMemo(() => ({
    mineTotal: myRecords.length,
    minePending: myRecords.filter((r) => r.status === "en_attente" || r.status === "valide_admin").length,
    mineApproved: myRecords.filter((r) => r.status === "approuve").length,
    mineRefused: myRecords.filter((r) => r.status === "refuse" || r.status === "refuse_admin").length,
    adminTodo: adminPending.length,
    finalTodo: finalPending.length,
  }), [myRecords, adminPending, finalPending]);

  // ── Données affichées selon le tab ──────────────────────────────────────────
  const visible = useMemo(() => {
    const base = tab === "mine" ? myRecords
      : tab === "admin_pending" ? adminPending
      : tab === "final_pending" ? finalPending
      : records;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => [r.title, r.description, r.employee_name].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [tab, myRecords, adminPending, finalPending, records, search]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Ressources Humaines</h1>
          <p className="mt-0.5 text-sm text-white/45">
            Vos demandes de congés et absences passent par <strong className="text-white/65">2 niveaux de validation</strong> : administrateur, puis super administrateur.
          </p>
        </div>
        <button
          onClick={() => setRequestOpen(true)}
          className="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95 shadow-lg shadow-coral/20"
        >
          + Nouvelle demande
        </button>
      </div>

      {/* KPIs adaptés au rôle */}
      <div className={`grid gap-3 ${isAdmin ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-4"}`}>
        <KPI label="Mes demandes" value={kpis.mineTotal} sub={kpis.minePending > 0 ? `${kpis.minePending} en cours` : "—"} color="text-white" />
        <KPI label="Approuvées" value={kpis.mineApproved} sub="à mon profit" color="text-lime" />
        <KPI label="Refusées" value={kpis.mineRefused} sub="à mon profit" color="text-coral/85" />
        {isAdmin && !isSuperAdmin && (
          <KPI label="À valider (admin)" value={kpis.adminTodo} sub="action requise" color="text-violet" alert={kpis.adminTodo > 0} />
        )}
        {isSuperAdmin && (
          <KPI label="Décision finale" value={kpis.finalTodo} sub={`+ ${kpis.adminTodo} attendent l'admin`} color="text-violet" alert={kpis.finalTodo > 0} />
        )}
      </div>

      {/* Onglets adaptés au rôle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 flex-wrap">
          <TabBtn current={tab} v="mine" l="Mes demandes" n={myRecords.length} onClick={setTab} />
          {isAdmin && <TabBtn current={tab} v="admin_pending" l="À valider (admin)" n={adminPending.length} highlight={adminPending.length > 0} onClick={setTab} />}
          {isSuperAdmin && <TabBtn current={tab} v="final_pending" l="Décision finale" n={finalPending.length} highlight={finalPending.length > 0} onClick={setTab} />}
          {isAdmin && <TabBtn current={tab} v="all" l="Toutes" n={records.length} onClick={setTab} />}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (titre, agent, motif…)"
          className="flex-1 min-w-[180px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-coral/40 focus:outline-none"
        />
        <button onClick={load} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65 hover:text-white hover:bg-white/[0.06] transition" title="Actualiser">
          ↻
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</div>
      )}

      {/* Liste */}
      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-coral" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl">📋</p>
            <p className="mt-3 text-sm text-white/45">
              {tab === "mine" && "Vous n'avez aucune demande pour l'instant. Cliquez sur « + Nouvelle demande » en haut pour en créer une."}
              {tab === "admin_pending" && "Aucune demande en attente de validation administrateur."}
              {tab === "final_pending" && "Aucune demande en attente de décision finale."}
              {tab === "all" && "Aucun enregistrement RH."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {visible.map((r) => (
              <RHCard
                key={r.id}
                record={r}
                showEmployee={tab !== "mine"}
                canAdminDecide={isAdmin && r.status === "en_attente" && r.requires_workflow}
                canSuperAdminDecide={isSuperAdmin && (r.status === "valide_admin" || r.status === "refuse_admin")}
                canDelete={isSuperAdmin}
                onAdminDecide={() => setDecisionTarget({ record: r, level: "admin" })}
                onSuperAdminDecide={() => setDecisionTarget({ record: r, level: "super_admin" })}
                onDelete={async () => {
                  if (!confirm(`Supprimer définitivement la demande « ${r.title} » ?`)) return;
                  try { await hrApi.delete(r.id); notify("ok", "Demande supprimée"); load(); }
                  catch (e: unknown) { notify("err", e instanceof Error ? e.message : "Erreur"); }
                }}
              />
            ))}
          </ul>
        )}
      </div>

      <RequestModal open={requestOpen} onClose={() => setRequestOpen(false)} onSubmitted={() => { notify("ok", "Demande envoyée — en attente de validation administrateur."); load(); }} />
      <DecisionModal
        record={decisionTarget?.record ?? null}
        level={decisionTarget?.level ?? "admin"}
        onClose={() => setDecisionTarget(null)}
        onDecided={() => { notify("ok", "Décision enregistrée"); load(); }}
      />

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur-xl shadow-lg ${
              toast.kind === "ok" ? "border-lime/30 bg-lime/15 text-lime" : "border-coral/30 bg-coral/15 text-coral"
            }`}>
            {toast.kind === "ok" ? "✓ " : "⚠ "}{toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sous-composants UI ───────────────────────────────────────────────────────

function KPI({ label, value, sub, color, alert }: { label: string; value: number | string; sub?: string; color: string; alert?: boolean }) {
  return (
    <div className={`${card} px-4 py-3.5 ${alert ? "ring-1 ring-coral/30" : ""}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      <p className={`mt-1 font-display text-3xl font-extrabold leading-none ${color}`}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-white/45">{sub}</p>}
    </div>
  );
}

function TabBtn({ current, v, l, n, highlight, onClick }: { current: Tab; v: Tab; l: string; n: number; highlight?: boolean; onClick: (v: Tab) => void }) {
  const active = current === v;
  return (
    <button
      onClick={() => onClick(v)}
      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-2 ${
        active ? "bg-coral text-white" : highlight ? "text-coral/90 hover:text-coral" : "text-white/55 hover:text-white"
      }`}
    >
      {l}
      <span className={`rounded-full px-1.5 text-[10px] ${active ? "bg-white/20" : highlight ? "bg-coral/20" : "bg-white/10"}`}>{n}</span>
    </button>
  );
}

function RHCard({
  record, showEmployee, canAdminDecide, canSuperAdminDecide, canDelete,
  onAdminDecide, onSuperAdminDecide, onDelete,
}: {
  record: HrRecord;
  showEmployee: boolean;
  canAdminDecide: boolean;
  canSuperAdminDecide: boolean;
  canDelete: boolean;
  onAdminDecide: () => void;
  onSuperAdminDecide: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const days = daysBetween(record.start_date, record.end_date);
  return (
    <li className="px-4 sm:px-6 py-4 hover:bg-white/[0.02] transition">
      <div className="flex items-start gap-3">
        <div className="hidden sm:flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-lg">
          {TYPE_ICONS[record.type]}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={record.type} />
            <StatusBadge status={record.status} />
            <WorkflowSteps record={record} />
            <span className="ml-auto text-[11px] text-white/45 whitespace-nowrap">{timeAgo(record.created_at)}</span>
          </div>
          <div>
            <p className="font-semibold text-white">{record.title}</p>
            {showEmployee && (
              <p className="text-xs text-white/55 mt-0.5">
                👤 <span className="font-semibold text-white/85">{record.employee_name ?? "?"}</span>
                {record.employee_email && <span className="text-white/40"> · {record.employee_email}</span>}
              </p>
            )}
            <p className="text-xs text-white/55 mt-0.5">
              📅 {fmtDateRange(record.start_date, record.end_date)}{days ? ` · ${days} jour${days > 1 ? "s" : ""}` : ""}
              {record.type === "prime" && record.amount ? ` · 💰 ${record.amount.toLocaleString("fr-FR")} FCFA` : ""}
            </p>
          </div>

          {(record.description || record.admin_comment || record.super_admin_comment) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] font-semibold text-lime/85 hover:text-lime transition"
            >
              {expanded ? "▼ Masquer les détails" : "▶ Voir le détail et l'historique"}
            </button>
          )}

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-2"
              >
                {record.description && (
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/75 whitespace-pre-wrap">
                    <span className="text-white/40 font-bold uppercase text-[10px]">Motif</span>
                    <br />
                    {record.description}
                  </div>
                )}
                {record.admin_decision && (
                  <div className={`rounded-lg border px-3 py-2.5 text-xs ${
                    record.admin_decision === "valide" ? "border-lime/25 bg-lime/[0.06]" : "border-coral/25 bg-coral/[0.06]"
                  }`}>
                    <p className={`font-bold ${record.admin_decision === "valide" ? "text-lime" : "text-coral"}`}>
                      {record.admin_decision === "valide" ? "✓ Validée par admin" : "✕ Refusée par admin"}
                      {" — "}{record.admin_decision_by_name ?? "?"}
                      {record.admin_decision_at && <span className="text-white/45 font-normal"> · {timeAgo(record.admin_decision_at)}</span>}
                    </p>
                    {record.admin_comment && <p className="mt-1 text-white/70 italic">« {record.admin_comment} »</p>}
                  </div>
                )}
                {record.super_admin_decision && (
                  <div className={`rounded-lg border px-3 py-2.5 text-xs ${
                    record.super_admin_decision === "approuve" ? "border-lime/25 bg-lime/[0.06]" : "border-coral/25 bg-coral/[0.06]"
                  }`}>
                    <p className={`font-bold ${record.super_admin_decision === "approuve" ? "text-lime" : "text-coral"}`}>
                      {record.super_admin_decision === "approuve" ? "✓ Approuvée (final)" : "✕ Refusée (final)"}
                      {" — "}{record.super_admin_decision_by_name ?? "?"}
                      {record.super_admin_decision_at && <span className="text-white/45 font-normal"> · {timeAgo(record.super_admin_decision_at)}</span>}
                    </p>
                    {record.super_admin_comment && <p className="mt-1 text-white/70 italic">« {record.super_admin_comment} »</p>}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {(canAdminDecide || canSuperAdminDecide || canDelete) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {canAdminDecide && (
                <button onClick={onAdminDecide}
                  className="rounded-lg border border-violet/35 bg-violet/15 px-3 py-1.5 text-xs font-bold text-violet hover:bg-violet/25 transition">
                  ⚖ Valider / Refuser (admin)
                </button>
              )}
              {canSuperAdminDecide && (
                <button onClick={onSuperAdminDecide}
                  className="rounded-lg border border-coral/35 bg-coral/15 px-3 py-1.5 text-xs font-bold text-coral hover:bg-coral/25 transition">
                  🛡 Décision finale (super admin)
                </button>
              )}
              {canDelete && (
                <button onClick={onDelete}
                  className="ml-auto rounded-lg text-white/45 hover:text-coral text-xs px-2 py-1.5 hover:bg-coral/10 transition" title="Supprimer (super admin)">
                  🗑 Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
