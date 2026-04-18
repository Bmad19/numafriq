import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { leadsApi, usersApi, type Lead, type BureauUser } from "../api";
import { useAuth, hasRole } from "../BureauContext";

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  nouveau:  { label: "Nouveau",   color: "text-lime   bg-lime/10   border-lime/25",   dot: "bg-lime animate-pulse" },
  en_cours: { label: "En cours",  color: "text-coral  bg-coral/10  border-coral/25",  dot: "bg-coral" },
  converti: { label: "Converti",  color: "text-violet bg-violet/10 border-violet/25", dot: "bg-violet" },
  perdu:    { label: "Perdu",     color: "text-white/30 bg-white/5 border-white/10",  dot: "bg-white/20" },
};

const SERVICE_ICONS: Record<string, string> = {
  "site-vitrine": "🌐", ecommerce: "🛒", seo: "📈", branding: "🎨", app: "⚙️", autre: "💬",
};

const card = "rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm";

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.nouveau;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<BureauUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    const [l, a] = await Promise.all([leadsApi.list(), usersApi.list().catch(() => [])]);
    setLeads(l);
    setAgents(a);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openLead(lead: Lead) {
    setSelected(lead);
    setEditForm({ status: lead.status, assigned_to: lead.assigned_to, notes: lead.notes || "" });
  }

  async function saveLead() {
    if (!selected) return;
    setSaving(true);
    try {
      await leadsApi.update(selected.id, editForm);
      showToast("Demande mise à jour ✓");
      await load();
      setSelected(prev => prev ? { ...prev, ...editForm } : null);
    } finally { setSaving(false); }
  }

  async function deleteLead(id: number) {
    if (!confirm("Supprimer cette demande ?")) return;
    await leadsApi.delete(id);
    setSelected(null);
    showToast("Demande supprimée");
    await load();
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const filtered = leads.filter(l => filter === "all" || l.status === filter);
  const stats = {
    nouveau:  leads.filter(l => l.status === "nouveau").length,
    en_cours: leads.filter(l => l.status === "en_cours").length,
    converti: leads.filter(l => l.status === "converti").length,
    total:    leads.length,
  };

  const timeAgo = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `Il y a ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Demandes de projet</h1>
          <p className="mt-1 text-sm text-white/40">Formulaires soumis depuis le site NUMAFRIQ</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50 hover:border-white/25 hover:text-white transition">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Actualiser
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Nouveaux", value: stats.nouveau, color: "text-lime" },
          { label: "En cours", value: stats.en_cours, color: "text-coral" },
          { label: "Convertis", value: stats.converti, color: "text-violet" },
        ].map(k => (
          <div key={k.label} className={`${card} border p-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{k.label}</p>
            <p className={`font-display text-3xl font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["all","Tous"], ["nouveau","Nouveaux"], ["en_cours","En cours"], ["converti","Convertis"], ["perdu","Perdus"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${filter === v ? "bg-coral text-white" : "border border-white/10 text-white/40 hover:text-white"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={`${card} border overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-coral" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-4xl">📭</p>
            <p className="mt-3 text-sm text-white/40">Aucune demande {filter !== "all" ? `"${filter}"` : ""} pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filtered.map((lead, i) => (
              <motion.button
                key={lead.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => openLead(lead)}
                className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-white/[0.03] transition"
              >
                {/* Icon */}
                <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-xl">
                  {SERVICE_ICONS[lead.service ?? ""] ?? "📋"}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{lead.name}</p>
                  <p className="text-xs text-white/40 truncate">{lead.email}{lead.company ? ` · ${lead.company}` : ""}</p>
                </div>
                {/* Budget */}
                <div className="hidden sm:block text-xs text-white/40 shrink-0">
                  {lead.budget || "—"}
                </div>
                {/* Status */}
                <StatusBadge status={lead.status} />
                {/* Time */}
                <p className="hidden md:block text-xs text-white/30 shrink-0 w-20 text-right">{timeAgo(lead.created_at)}</p>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-white/20 shrink-0"><path d="M7 7l6 3-6 3V7z"/></svg>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col overflow-hidden border-l border-white/[0.08] bg-[#0c0d10] shadow-2xl"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{SERVICE_ICONS[selected.service ?? ""] ?? "📋"}</span>
                  <div>
                    <p className="font-semibold text-white">{selected.name}</p>
                    <p className="text-xs text-white/40">{timeAgo(selected.created_at)}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-white/30 hover:text-white hover:bg-white/[0.06] transition">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M15 5L5 15M5 5l10 10"/></svg>
                </button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Contact info */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3">
                  {[
                    ["📧 Email", selected.email, `mailto:${selected.email}`],
                    ["📞 Téléphone", selected.phone || "—", selected.phone ? `tel:${selected.phone}` : null],
                    ["🏢 Entreprise", selected.company || "—", null],
                    ["🛠 Service", selected.service || "—", null],
                    ["💰 Budget", selected.budget || "—", null],
                    ["📅 Délai", selected.timeline || "—", null],
                  ].map(([label, value, href]) => (
                    <div key={String(label)} className="flex items-start gap-3">
                      <span className="text-xs text-white/35 w-28 shrink-0 mt-0.5">{label}</span>
                      {href ? (
                        <a href={String(href)} className="text-sm text-lime hover:underline">{value}</a>
                      ) : (
                        <span className="text-sm text-white/70">{value}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Message */}
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/35">Message</p>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                    {selected.message}
                  </div>
                </div>

                {/* Edit form */}
                <div className="space-y-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/35">Gestion</p>

                  <div>
                    <label className="block text-xs font-semibold text-white/40 mb-2">Statut</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(STATUS_CFG).map(([v, cfg]) => (
                        <button key={v} type="button"
                          onClick={() => setEditForm(f => ({ ...f, status: v as Lead["status"] }))}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${editForm.status === v ? cfg.color : "border-white/10 text-white/30 hover:text-white"}`}>
                          {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasRole(user, "admin") && (
                    <div>
                      <label className="block text-xs font-semibold text-white/40 mb-2">Assigner à</label>
                      <select
                        value={editForm.assigned_to ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, assigned_to: e.target.value ? +e.target.value : undefined }))}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:border-lime/40 focus:outline-none"
                      >
                        <option value="">— Non assigné —</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-white/40 mb-2">Notes internes</label>
                    <textarea
                      value={editForm.notes ?? ""}
                      onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                      rows={3}
                      placeholder="Notes de suivi, compte-rendu d'appel…"
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-lime/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Panel footer */}
              <div className="border-t border-white/[0.06] px-6 py-4 flex items-center justify-between gap-3">
                {hasRole(user, "admin") && (
                  <button onClick={() => deleteLead(selected.id)}
                    className="rounded-xl border border-red-500/20 px-4 py-2.5 text-xs font-semibold text-red-400/70 hover:border-red-500/40 hover:text-red-400 transition">
                    Supprimer
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <a href={`mailto:${selected.email}`}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/50 hover:text-white hover:border-white/25 transition">
                    Envoyer email
                  </a>
                  <button onClick={saveLead} disabled={saving}
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-lime/25 bg-lime/10 px-6 py-3 text-sm font-semibold text-lime backdrop-blur-xl z-[60]">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
