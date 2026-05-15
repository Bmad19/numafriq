import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  leadsApi,
  applicationsApi,
  usersApi,
  type Lead,
  type JobApplication,
  type BureauUser,
} from "../api";
import { useAuth, hasRole } from "../BureauContext";

// ── Statuts (config commune avec libellés et couleurs uniformes) ─────────────
const LEAD_STATUS: Record<Lead["status"], { label: string; cls: string; dot: string }> = {
  nouveau:  { label: "Nouveau",  cls: "text-lime   bg-lime/10   border-lime/25",       dot: "bg-lime animate-pulse" },
  en_cours: { label: "En cours", cls: "text-coral  bg-coral/10  border-coral/25",      dot: "bg-coral" },
  converti: { label: "Converti", cls: "text-violet bg-violet/10 border-violet/25",     dot: "bg-violet" },
  perdu:    { label: "Perdu",    cls: "text-white/60 bg-white/5 border-white/10",      dot: "bg-white/25" },
  archive:  { label: "Archivé",  cls: "text-white/50 bg-white/[0.03] border-white/10", dot: "bg-white/15" },
};

const APP_STATUS: Record<JobApplication["status"], { label: string; cls: string; dot: string }> = {
  nouveau:   { label: "Nouveau",        cls: "text-lime   bg-lime/10   border-lime/25",       dot: "bg-lime animate-pulse" },
  examine:   { label: "Examiné",        cls: "text-coral  bg-coral/10  border-coral/25",      dot: "bg-coral" },
  entretien: { label: "Entretien",      cls: "text-violet bg-violet/10 border-violet/25",     dot: "bg-violet" },
  embauche:  { label: "Embauché",       cls: "text-lime   bg-lime/12   border-lime/35",       dot: "bg-lime" },
  refuse:    { label: "Refusé",         cls: "text-white/60 bg-white/5 border-white/10",      dot: "bg-white/25" },
  archive:   { label: "Archivé",        cls: "text-white/50 bg-white/[0.03] border-white/10", dot: "bg-white/15" },
};

const SERVICE_ICONS: Record<string, string> = {
  "site-vitrine": "🌐", ecommerce: "🛒", seo: "📈", branding: "🎨", app: "⚙️", autre: "💬",
  "conseil-juridique": "⚖️", fiscalite: "🧾", comptabilite: "📊", structuration: "🏗", investissement: "💼",
};

const POSITION_LABELS: Record<string, string> = {
  hr_talent_management: "RH & gestion talents",
  lawyer_associate: "Avocat associé",
  legal_counsel: "Juriste d'entreprise",
  paralegal: "Assistant juridique",
  tax_accounting: "Fiscalité & comptabilité",
  trainee_internship: "Stage / alternance",
  office_operations: "Opérations bureau",
  communication: "Communication",
  spontaneous: "Candidature spontanée",
};

// ── Item unifié dans le feed ──────────────────────────────────────────────────
type InboxItem =
  | { kind: "lead"; lead: Lead; date: string; sortKey: string; status: string }
  | { kind: "application"; app: JobApplication; date: string; sortKey: string; status: string };

type Tab = "all" | "leads" | "applications";

function StatusBadge({ kind, status }: { kind: "lead" | "application"; status: string }) {
  const cfg = (kind === "lead" ? LEAD_STATUS : APP_STATUS)[status as never] ?? null;
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.cls} whitespace-nowrap`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}

function fmtSize(b?: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
}

const card = "rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm";

export function InboxPage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [agents, setAgents] = useState<BureauUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [downloadingCv, setDownloadingCv] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function showToast(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    setError(null);
    const [l, a, u] = await Promise.allSettled([
      leadsApi.list(),
      applicationsApi.list(),
      usersApi.list(),
    ]);
    if (l.status === "fulfilled") setLeads(l.value); else setLeads([]);
    if (a.status === "fulfilled") setApplications(a.value); else setApplications([]);
    if (u.status === "fulfilled") setAgents(u.value); else setAgents([]);
    if (l.status === "rejected" && a.status === "rejected") {
      setError("Impossible de charger la boîte de réception. Vérifiez votre connexion.");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Construction du feed unifié ─────────────────────────────────────────────
  const items = useMemo<InboxItem[]>(() => {
    const fromLeads: InboxItem[] = leads.map((lead) => ({
      kind: "lead",
      lead,
      date: lead.created_at,
      sortKey: lead.created_at,
      status: lead.status,
    }));
    const fromApps: InboxItem[] = applications.map((app) => ({
      kind: "application",
      app,
      date: app.created_at,
      sortKey: app.created_at,
      status: app.status,
    }));
    return [...fromLeads, ...fromApps].sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));
  }, [leads, applications]);

  const filtered = useMemo<InboxItem[]>(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (tab === "leads" && it.kind !== "lead") return false;
      if (tab === "applications" && it.kind !== "application") return false;
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (!q) return true;
      const hay = it.kind === "lead"
        ? [it.lead.name, it.lead.email, it.lead.company, it.lead.message, it.lead.service]
        : [it.app.first_name, it.app.last_name, it.app.email, it.app.position_applied, it.app.motivation, it.app.job_offer_ref];
      return hay.filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, tab, statusFilter, search]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const newLeads = leads.filter((l) => l.status === "nouveau").length;
    const newApps = applications.filter((a) => a.status === "nouveau").length;
    return {
      totalLeads: leads.length,
      newLeads,
      totalApps: applications.length,
      newApps,
      total: leads.length + applications.length,
      newTotal: newLeads + newApps,
    };
  }, [leads, applications]);

  const statusOptions = useMemo(() => {
    if (tab === "leads") return Object.entries(LEAD_STATUS).map(([v, c]) => ({ v, l: c.label }));
    if (tab === "applications") return Object.entries(APP_STATUS).map(([v, c]) => ({ v, l: c.label }));
    // En vue unifiée → unifier les statuts communs
    return [
      { v: "nouveau", l: "Nouveau" },
      { v: "en_cours", l: "En cours (lead)" },
      { v: "examine", l: "Examiné (cand.)" },
      { v: "entretien", l: "Entretien" },
      { v: "converti", l: "Converti" },
      { v: "embauche", l: "Embauché" },
      { v: "refuse", l: "Refusé" },
      { v: "perdu", l: "Perdu" },
      { v: "archive", l: "Archivé" },
    ];
  }, [tab]);

  // ── Sélection / formulaire d'édition ────────────────────────────────────────
  function openItem(it: InboxItem) {
    setSelected(it);
    if (it.kind === "lead") {
      setEditForm({ status: it.lead.status, assigned_to: it.lead.assigned_to ?? null, notes: it.lead.notes ?? "" });
    } else {
      setEditForm({ status: it.app.status, assigned_to: it.app.assigned_to ?? null, notes: it.app.notes ?? "" });
    }
  }

  async function saveSelected() {
    if (!selected) return;
    setSaving(true);
    try {
      if (selected.kind === "lead") {
        await leadsApi.update(selected.lead.id, editForm as Partial<Lead>);
      } else {
        await applicationsApi.update(selected.app.id, editForm as Parameters<typeof applicationsApi.update>[1]);
      }
      showToast("ok", "Modifications enregistrées");
      await load();
      // Conserver la sélection avec les nouvelles valeurs
      setSelected((prev) => {
        if (!prev) return null;
        if (prev.kind === "lead") return { ...prev, lead: { ...prev.lead, ...(editForm as Partial<Lead>) } as Lead };
        return { ...prev, app: { ...prev.app, ...(editForm as Partial<JobApplication>) } as JobApplication };
      });
    } catch (e: unknown) {
      showToast("err", e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!confirm("Supprimer définitivement cet élément ? Cette action est irréversible.")) return;
    try {
      if (selected.kind === "lead") await leadsApi.delete(selected.lead.id);
      else await applicationsApi.delete(selected.app.id);
      showToast("ok", "Supprimé");
      setSelected(null);
      load();
    } catch (e: unknown) {
      showToast("err", e instanceof Error ? e.message : "Erreur");
    }
  }

  async function downloadCv() {
    if (!selected || selected.kind !== "application") return;
    setDownloadingCv(true);
    try {
      await applicationsApi.openCv(selected.app.id, selected.app.cv_original_name ?? `cv-${selected.app.id}`);
    } catch (e: unknown) {
      showToast("err", e instanceof Error ? e.message : "Téléchargement impossible");
    } finally {
      setDownloadingCv(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Boîte de réception</h1>
          <p className="mt-0.5 text-sm text-white/45">
            Demandes du site et candidatures aux offres d'emploi — centralisées, filtrables, exploitables.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/65 hover:border-white/25 hover:text-white transition">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: kpis.total, sub: `${kpis.newTotal} nouveaux`, color: "text-white", subColor: "text-lime" },
          { label: "Demandes (leads)", value: kpis.totalLeads, sub: `${kpis.newLeads} non traitées`, color: "text-coral", subColor: "text-coral/75" },
          { label: "Candidatures", value: kpis.totalApps, sub: `${kpis.newApps} en attente`, color: "text-violet", subColor: "text-violet/75" },
          { label: "Affichées", value: filtered.length, sub: tab === "all" ? "tous types" : (tab === "leads" ? "leads" : "candidatures"), color: "text-white/85", subColor: "text-white/35" },
        ].map((k) => (
          <div key={k.label} className={`${card} px-4 py-3.5`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{k.label}</p>
            <p className={`mt-1 font-display text-3xl font-extrabold leading-none ${k.color}`}>{k.value}</p>
            <p className={`mt-1.5 text-[11px] font-semibold ${k.subColor}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar : tabs type + filtre statut + recherche */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {([
            { v: "all", l: "Tout", c: items.length },
            { v: "leads", l: "Demandes", c: leads.length },
            { v: "applications", l: "Candidatures", c: applications.length },
          ] as Array<{ v: Tab; l: string; c: number }>).map((t) => (
            <button
              key={t.v}
              onClick={() => { setTab(t.v); setStatusFilter("all"); }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === t.v ? "bg-coral text-white" : "text-white/55 hover:text-white"
              }`}
            >
              {t.l} <span className={tab === t.v ? "text-white/85" : "text-white/35"}>· {t.c}</span>
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/85 focus:border-coral/40 focus:outline-none"
        >
          <option value="all">Tous statuts</option>
          {statusOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, email, sujet, poste…)"
          className="flex-1 min-w-[200px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-coral/40 focus:outline-none transition"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      )}

      {/* Liste */}
      <div className={`${card} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-coral" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl">📭</p>
            <p className="mt-3 text-sm text-white/45">
              {items.length === 0
                ? "Aucun élément pour le moment — la boîte se remplira dès qu'un visiteur enverra le formulaire de contact ou postulera à une offre."
                : "Aucun élément ne correspond à ces filtres."}
            </p>
            {items.length > 0 && (
              <button onClick={() => { setSearch(""); setStatusFilter("all"); }}
                className="mt-4 text-xs font-semibold text-lime hover:underline">
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {filtered.map((it, i) => {
              if (it.kind === "lead") {
                const l = it.lead;
                const icon = SERVICE_ICONS[l.service ?? ""] ?? SERVICE_ICONS[l.domain ?? ""] ?? "📩";
                return (
                  <motion.li key={`lead-${l.id}`}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.02 }}>
                    <button onClick={() => openItem(it)} className="w-full text-left px-4 py-3.5 sm:px-6 hover:bg-white/[0.03] transition flex items-center gap-3">
                      <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-coral/15 text-lg" title="Demande de projet">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-coral/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-coral">Lead</span>
                          <p className="truncate font-semibold text-white">{l.name}</p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-white/50">
                          {l.email}{l.company ? ` · ${l.company}` : ""}{l.service ? ` · ${l.service}` : ""}
                        </p>
                      </div>
                      <div className="hidden lg:block max-w-[200px] truncate text-xs text-white/50 italic">
                        {l.message?.slice(0, 80)}
                      </div>
                      <StatusBadge kind="lead" status={l.status} />
                      <span className="hidden md:block text-[11px] text-white/45 w-12 text-right">{timeAgo(l.created_at)}</span>
                    </button>
                  </motion.li>
                );
              }
              const a = it.app;
              return (
                <motion.li key={`app-${a.id}`}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.02 }}>
                  <button onClick={() => openItem(it)} className="w-full text-left px-4 py-3.5 sm:px-6 hover:bg-white/[0.03] transition flex items-center gap-3">
                    <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-violet/15 text-lg" title="Candidature">
                      🎯
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-violet/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet">Cand.</span>
                        <p className="truncate font-semibold text-white">{a.first_name} {a.last_name}</p>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-white/50">
                        {a.email} · {POSITION_LABELS[a.position_applied] ?? a.position_applied}
                      </p>
                    </div>
                    <div className="hidden lg:flex items-center gap-1 max-w-[200px] truncate text-xs text-white/50">
                      <span>📎</span>
                      <span className="truncate">{a.cv_original_name ?? "CV"}</span>
                      <span className="text-white/30">({fmtSize(a.cv_size_bytes)})</span>
                    </div>
                    <StatusBadge kind="application" status={a.status} />
                    <span className="hidden md:block text-[11px] text-white/45 w-12 text-right">{timeAgo(a.created_at)}</span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Drawer détail */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelected(null)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex w-full sm:max-w-md flex-col overflow-hidden border-l border-white/[0.08] bg-[#0c0d10] shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  {selected.kind === "lead" ? (
                    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-coral/15 text-lg">
                      {SERVICE_ICONS[selected.lead.service ?? ""] ?? SERVICE_ICONS[selected.lead.domain ?? ""] ?? "📩"}
                    </div>
                  ) : (
                    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-violet/15 text-lg">🎯</div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {selected.kind === "lead" ? selected.lead.name : `${selected.app.first_name} ${selected.app.last_name}`}
                    </p>
                    <p className="text-[11px] text-white/45">
                      <span className={`font-bold uppercase ${selected.kind === "lead" ? "text-coral" : "text-violet"}`}>
                        {selected.kind === "lead" ? "Lead" : "Candidature"}
                      </span>
                      {" · "}
                      {timeAgo(selected.date)}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)}
                  className="shrink-0 rounded-lg p-2 text-white/55 hover:text-white hover:bg-white/[0.06] transition"
                  aria-label="Fermer">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path d="M15 5L5 15M5 5l10 10" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto styled-scrollbar px-5 py-5 space-y-5">
                {/* Coordonnées */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-2.5">
                  <DetailRow label="📧 Email" value={selected.kind === "lead" ? selected.lead.email : selected.app.email}
                    href={`mailto:${selected.kind === "lead" ? selected.lead.email : selected.app.email}`} />
                  {selected.kind === "lead" ? (
                    <>
                      <DetailRow label="📞 Téléphone" value={selected.lead.phone} href={selected.lead.phone ? `tel:${selected.lead.phone}` : undefined} />
                      <DetailRow label="🏢 Entreprise" value={selected.lead.company} />
                      <DetailRow label="🛠 Service" value={selected.lead.service} />
                      <DetailRow label="🎯 Domaine" value={selected.lead.domain} />
                      <DetailRow label="💰 Budget" value={selected.lead.budget} />
                      <DetailRow label="📅 Délai" value={selected.lead.timeline} />
                    </>
                  ) : (
                    <>
                      <DetailRow label="📞 Téléphone" value={selected.app.phone} href={selected.app.phone ? `tel:${selected.app.phone}` : undefined} />
                      <DetailRow label="📍 Localisation" value={selected.app.city_country} />
                      <DetailRow label="🔗 LinkedIn" value={selected.app.linkedin_url} href={selected.app.linkedin_url ?? undefined} external />
                      <DetailRow label="🛠 Poste visé" value={POSITION_LABELS[selected.app.position_applied] ?? selected.app.position_applied} />
                      <DetailRow label="📂 Mode" value={
                        selected.app.application_mode === "offer" ? "Sur offre" :
                        selected.app.application_mode === "profile_pool" ? "Profil ouvert" :
                        selected.app.application_mode === "spontaneous" ? "Candidature spontanée" : "—"
                      } />
                      {selected.app.job_offer_ref && <DetailRow label="🔖 Réf. offre" value={selected.app.job_offer_ref} />}
                      {selected.app.sought_role_title && <DetailRow label="🎯 Recherche" value={selected.app.sought_role_title} />}
                      <DetailRow label="📑 Contrat souhaité" value={selected.app.contract_type} />
                      <DetailRow label="📅 Disponibilité" value={selected.app.availability} />
                      <DetailRow label="⏳ Expérience" value={selected.app.experience_years} />
                      <DetailRow label="🎓 Formation" value={selected.app.education_level} />
                      <DetailRow label="🌐 Langues" value={selected.app.languages} />
                    </>
                  )}
                </div>

                {/* CV download (candidatures) */}
                {selected.kind === "application" && (
                  <div className="rounded-2xl border border-violet/25 bg-violet/[0.06] p-4">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-violet/85">Curriculum vitæ</p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet/15 text-lg">📎</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{selected.app.cv_original_name ?? `cv-${selected.app.id}`}</p>
                        <p className="text-[11px] text-white/55">
                          {selected.app.cv_mime ?? "—"} · {fmtSize(selected.app.cv_size_bytes)}
                        </p>
                      </div>
                      <button onClick={downloadCv} disabled={downloadingCv}
                        className="shrink-0 rounded-xl bg-violet px-3.5 py-2 text-xs font-bold text-ink hover:brightness-110 transition disabled:opacity-50">
                        {downloadingCv ? "…" : "↓ Ouvrir"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Message / motivation */}
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/45">
                    {selected.kind === "lead" ? "Message" : "Motivation"}
                  </p>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/80 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto styled-scrollbar">
                    {selected.kind === "lead" ? selected.lead.message : selected.app.motivation}
                  </div>
                </div>

                {/* Édition statut + assignation + notes */}
                <div className="space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Gestion</p>

                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-2">Statut</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(selected.kind === "lead" ? Object.entries(LEAD_STATUS) : Object.entries(APP_STATUS)).map(([v, cfg]) => (
                        <button key={v} type="button"
                          onClick={() => setEditForm((f) => ({ ...f, status: v }))}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                            editForm.status === v ? cfg.cls : "border-white/10 bg-white/[0.02] text-white/55 hover:text-white hover:bg-white/[0.05]"
                          }`}>
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasRole(user, "agent") && (
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-2">Assigner à</label>
                      <select
                        value={(editForm.assigned_to as number | null) ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, assigned_to: e.target.value ? +e.target.value : null }))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-lime/40 focus:outline-none"
                      >
                        <option value="">— Non assigné —</option>
                        {agents.filter((a) => a.active).map((a) => (
                          <option key={a.id} value={a.id}>{a.full_name} ({a.role})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-white/50 mb-2">Notes internes</label>
                    <textarea
                      value={(editForm.notes as string) ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={4}
                      placeholder="Suivi, compte-rendu d'appel, prochaine étape…"
                      className="w-full resize-y min-h-[100px] rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-white placeholder:text-white/40 focus:border-lime/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-white/[0.06] px-5 py-4 flex items-center justify-between gap-2">
                {isAdmin && (
                  <button onClick={deleteSelected}
                    className="rounded-xl border border-coral/25 px-3.5 py-2.5 text-xs font-bold text-coral/80 hover:border-coral/50 hover:text-coral transition">
                    Supprimer
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <a href={`mailto:${selected.kind === "lead" ? selected.lead.email : selected.app.email}`}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/[0.08] transition">
                    Envoyer email
                  </a>
                  <button onClick={saveSelected} disabled={saving}
                    className="rounded-xl bg-coral px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 transition disabled:opacity-50">
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur-xl z-[60] ${
              toast.kind === "ok"
                ? "border-lime/30 bg-lime/15 text-lime"
                : "border-coral/30 bg-coral/15 text-coral"
            }`}>
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sous-composant : ligne de détail ─────────────────────────────────────────
function DetailRow({
  label, value, href, external,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
  external?: boolean;
}) {
  if (!value) {
    return (
      <div className="flex items-start gap-3">
        <span className="w-32 shrink-0 text-[11px] text-white/35 mt-0.5">{label}</span>
        <span className="text-sm text-white/35 italic">—</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <span className="w-32 shrink-0 text-[11px] text-white/35 mt-0.5">{label}</span>
      {href ? (
        <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}
          className="text-sm text-lime hover:underline break-all">
          {value}
        </a>
      ) : (
        <span className="text-sm text-white/80 break-words">{value}</span>
      )}
    </div>
  );
}
