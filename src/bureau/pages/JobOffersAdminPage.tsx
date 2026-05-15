import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth, hasRole } from "../BureauContext";
import { jobOffersApi, type JobOfferAdmin, type JobOfferInput } from "../api";
import { CAREERS_POSITION_KEYS } from "../../config/careersPositions";

const POSITION_LABELS: Record<string, string> = {
  hr_talent_management: "RH & gestion talents",
  lawyer_associate:     "Avocat associé",
  legal_counsel:        "Juriste d'entreprise",
  paralegal:            "Assistant juridique",
  tax_accounting:       "Fiscalité & comptabilité",
  trainee_internship:   "Stage / alternance",
  office_operations:    "Opérations bureau",
  communication:        "Communication",
  spontaneous:          "Candidature spontanée",
};

const CONTRACT_OPTIONS = [
  { value: "cdi",         label: "CDI" },
  { value: "cdd",         label: "CDD" },
  { value: "freelance",   label: "Freelance" },
  { value: "internship",  label: "Stage" },
  { value: "discuss",     label: "À discuter" },
];

const inp = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/45 focus:border-coral/50 focus:outline-none transition";
const lbl = "block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5";

const EMPTY_FORM: JobOfferInput = {
  position_key: "paralegal",
  title_fr: "",
  title_en: "",
  summary_fr: "",
  summary_en: "",
  meta_fr: "",
  meta_en: "",
  content_fr: "",
  content_en: "",
  contract_type: "cdd",
  location: "",
  is_new: true,
  is_published: false,
  sort_order: 0,
};

export function JobOffersAdminPage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");

  const [offers, setOffers] = useState<JobOfferAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<JobOfferAdmin | null>(null);
  const [form, setForm] = useState<JobOfferInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  function load() {
    setLoading(true);
    setError(null);
    jobOffersApi.list()
      .then(setOffers)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total:     offers.length,
    published: offers.filter((o) => o.is_published).length,
    drafts:    offers.filter((o) => !o.is_published).length,
    isNew:     offers.filter((o) => o.is_new && o.is_published).length,
  }), [offers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter((o) =>
      [o.title_fr, o.title_en, o.summary_fr, o.location, o.position_key, o.slug]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [offers, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal(true);
  }

  function openEdit(o: JobOfferAdmin) {
    setEditing(o);
    setForm({
      position_key:  o.position_key ?? "paralegal",
      title_fr:      o.title_fr,
      title_en:      o.title_en ?? "",
      summary_fr:    o.summary_fr,
      summary_en:    o.summary_en ?? "",
      meta_fr:       o.meta_fr ?? "",
      meta_en:       o.meta_en ?? "",
      content_fr:    o.content_fr ?? "",
      content_en:    o.content_en ?? "",
      contract_type: o.contract_type ?? "cdd",
      location:      o.location ?? "",
      is_new:        o.is_new,
      is_published:  o.is_published,
      sort_order:    o.sort_order ?? 0,
      slug:          o.slug,
    });
    setModal(true);
  }

  async function save() {
    if (!form.title_fr?.trim() || !form.summary_fr?.trim()) {
      alert("Le titre (FR) et le résumé (FR) sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      if (editing) await jobOffersApi.update(editing.id, form);
      else         await jobOffersApi.create(form);
      setModal(false);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(o: JobOfferAdmin) {
    try {
      await jobOffersApi.update(o.id, {
        ...o,
        is_published: !o.is_published,
      });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function remove(o: JobOfferAdmin) {
    if (!confirm(`Supprimer définitivement l'offre « ${o.title_fr} » ?`)) return;
    try {
      await jobOffersApi.delete(o.id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-coral/20 bg-coral/5 p-6">
        <p className="text-sm text-coral">
          Accès réservé aux administrateurs et super-administrateurs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Offres d'emploi</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Publiez de nouvelles offres — elles apparaissent automatiquement sur la page <strong>/recrutement</strong> à côté des offres existantes.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95"
        >
          + Nouvelle offre
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",     value: stats.total,     color: "text-white",  icon: "📋" },
          { label: "Publiées",  value: stats.published, color: "text-lime",   icon: "✅" },
          { label: "Brouillons",value: stats.drafts,    color: "text-violet",icon: "📝" },
          { label: "Marquées Nouveau", value: stats.isNew, color: "text-coral", icon: "🆕" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{k.icon}</span>
              <p className="text-[11px] text-white/40 uppercase tracking-wider font-bold">{k.label}</p>
            </div>
            <p className={`text-2xl font-display font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (titre, lieu, slug…)"
          className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-white/50 focus:border-coral/40 focus:outline-none transition"
        />
        <span className="text-xs text-white/55">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-white/48 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-white/48 text-sm">
            {offers.length === 0
              ? "Aucune offre — cliquez sur « Nouvelle offre » pour commencer."
              : "Aucun résultat pour cette recherche."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                <tr>
                  {["Titre", "Type", "Lieu", "Statut", "Ordre", "Publiée le", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/35 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.02] transition group">
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="flex items-start gap-2">
                        {o.is_new && (
                          <span className="mt-0.5 rounded-full bg-lime/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-lime">Nouveau</span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{o.title_fr}</p>
                          <p className="text-[11px] text-white/35 truncate">{o.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-white/60 text-xs uppercase">{o.contract_type ?? "—"}</td>
                    <td className="px-5 py-3.5 text-white/60 text-xs">{o.location ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => togglePublish(o)}
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase transition ${
                          o.is_published
                            ? "border-lime/25 bg-lime/10 text-lime hover:bg-lime/20"
                            : "border-white/15 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]"
                        }`}
                      >
                        {o.is_published ? "Publiée" : "Brouillon"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-white/55 text-xs">{o.sort_order}</td>
                    <td className="px-5 py-3.5 text-white/45 text-xs whitespace-nowrap">
                      {o.published_at
                        ? new Date(o.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition">
                        <button
                          onClick={() => openEdit(o)}
                          className="rounded-lg bg-white/[0.05] border border-white/10 text-white/70 text-xs px-2.5 py-1 hover:bg-white/[0.1] transition font-bold"
                        >
                          Éditer
                        </button>
                        <button
                          onClick={() => remove(o)}
                          className="rounded-lg text-white/48 hover:text-coral text-xs px-1.5 py-1 hover:bg-coral/10 transition"
                          title="Supprimer"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96 }}
              className="my-8 w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0f1012] shadow-2xl overflow-hidden"
            >
              <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  {editing ? "Modifier l'offre" : "Nouvelle offre"}
                </h3>
                <button onClick={() => setModal(false)} className="text-white/55 hover:text-white transition text-xl">×</button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Titre (FR) *</label>
                    <input value={form.title_fr ?? ""} onChange={(e) => setForm((f) => ({ ...f, title_fr: e.target.value }))} className={inp} placeholder="Ex : Juriste d'entreprise" />
                  </div>
                  <div>
                    <label className={lbl}>Title (EN)</label>
                    <input value={form.title_en ?? ""} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} className={inp} placeholder="Corporate legal counsel" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Résumé (FR) *</label>
                    <textarea rows={3} value={form.summary_fr ?? ""} onChange={(e) => setForm((f) => ({ ...f, summary_fr: e.target.value }))} className={inp + " resize-none"} placeholder="2–3 phrases qui apparaîtront sur la carte" />
                  </div>
                  <div>
                    <label className={lbl}>Summary (EN)</label>
                    <textarea rows={3} value={form.summary_en ?? ""} onChange={(e) => setForm((f) => ({ ...f, summary_en: e.target.value }))} className={inp + " resize-none"} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Meta (FR)</label>
                    <input value={form.meta_fr ?? ""} onChange={(e) => setForm((f) => ({ ...f, meta_fr: e.target.value }))} className={inp} placeholder="CDD · Ouagadougou · démarrage immédiat" />
                  </div>
                  <div>
                    <label className={lbl}>Meta (EN)</label>
                    <input value={form.meta_en ?? ""} onChange={(e) => setForm((f) => ({ ...f, meta_en: e.target.value }))} className={inp} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Description longue (FR)</label>
                    <textarea rows={6} value={form.content_fr ?? ""} onChange={(e) => setForm((f) => ({ ...f, content_fr: e.target.value }))} className={inp + " resize-y min-h-[120px]"} placeholder="Détails du poste — visible quand l'utilisateur clique « Tout lire »" />
                  </div>
                  <div>
                    <label className={lbl}>Description longue (EN)</label>
                    <textarea rows={6} value={form.content_en ?? ""} onChange={(e) => setForm((f) => ({ ...f, content_en: e.target.value }))} className={inp + " resize-y min-h-[120px]"} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Type de contrat</label>
                    <select value={form.contract_type ?? "cdd"} onChange={(e) => setForm((f) => ({ ...f, contract_type: e.target.value }))} className={inp}>
                      {CONTRACT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Lieu</label>
                    <input value={form.location ?? ""} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className={inp} placeholder="Ouagadougou" />
                  </div>
                  <div>
                    <label className={lbl}>Métier (formulaire candidature)</label>
                    <select value={form.position_key ?? ""} onChange={(e) => setForm((f) => ({ ...f, position_key: e.target.value }))} className={inp}>
                      <option value="">— Aucun —</option>
                      {CAREERS_POSITION_KEYS.map((k) => (
                        <option key={k} value={k}>{POSITION_LABELS[k] ?? k}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Slug (URL)</label>
                    <input value={form.slug ?? ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className={inp} placeholder="laisser vide pour auto" />
                  </div>
                  <div>
                    <label className={lbl}>Ordre d'affichage</label>
                    <input type="number" value={String(form.sort_order ?? 0)} onChange={(e) => setForm((f) => ({ ...f, sort_order: +e.target.value }))} className={inp} />
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 text-sm text-white/80">
                      <input type="checkbox" checked={!!form.is_new} onChange={(e) => setForm((f) => ({ ...f, is_new: e.target.checked }))} className="h-4 w-4 rounded border-white/20" />
                      Pastille « Nouveau »
                    </label>
                    <label className="flex items-center gap-2 text-sm text-white/80">
                      <input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))} className="h-4 w-4 rounded border-white/20" />
                      Publier
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.07] px-6 py-4 flex gap-3">
                <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">
                  Annuler
                </button>
                <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-40">
                  {saving ? "Enregistrement…" : (editing ? "Enregistrer" : "Créer l'offre")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
