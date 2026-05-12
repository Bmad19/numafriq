import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  careersOffersApi,
  type BureauCareerOffer,
} from "../api";
import { useAuth, hasRole } from "../BureauContext";

const card =
  "rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm";

export function CareersOffersPage() {
  const { user } = useAuth();
  const canDelete = hasRole(user, "admin");

  const [offers, setOffers] = useState<BureauCareerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const emptyDraft = useMemo(
    (): Partial<BureauCareerOffer> & {
      position_key: string;
      title_fr: string;
      title_en: string;
    } => ({
      position_key: "",
      title_fr: "",
      title_en: "",
      meta_fr: "",
      meta_en: "",
      summary_fr: "",
      summary_en: "",
      detail_fr: "<p></p>",
      detail_en: "<p></p>",
      sort_order: 0,
      published: false,
    }),
    []
  );

  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const list = await careersOffersApi.list();
      setOffers(list);
    } catch {
      setToast(
        "Impossible de charger les offres — vérifiez l’API et le fichier careers-offers.json.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function startNew() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  function startEdit(o: BureauCareerOffer) {
    setEditingId(o.id);
    setDraft({
      position_key: o.position_key,
      title_fr: o.title_fr,
      title_en: o.title_en,
      meta_fr: o.meta_fr ?? "",
      meta_en: o.meta_en ?? "",
      summary_fr: o.summary_fr ?? "",
      summary_en: o.summary_en ?? "",
      detail_fr: o.detail_fr ?? "",
      detail_en: o.detail_en ?? "",
      sort_order: o.sort_order ?? 0,
      published: o.published,
      published_at: o.published_at ?? undefined,
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const pk = String(draft.position_key ?? "")
        .trim()
        .toLowerCase();
      if (editingId) {
        await careersOffersApi.update(editingId, {
          position_key: pk,
          title_fr: draft.title_fr?.trim(),
          title_en: draft.title_en?.trim(),
          meta_fr: draft.meta_fr?.trim(),
          meta_en: draft.meta_en?.trim(),
          summary_fr: draft.summary_fr?.trim(),
          summary_en: draft.summary_en?.trim(),
          detail_fr: draft.detail_fr,
          detail_en: draft.detail_en,
          sort_order: draft.sort_order ?? 0,
          published: !!draft.published,
          published_at: draft.published ? draft.published_at ?? undefined : null,
        });
        showToast("Offre enregistrée ✓");
      } else {
        await careersOffersApi.create({
          position_key: pk,
          title_fr: draft.title_fr?.trim() ?? "",
          title_en: draft.title_en?.trim() ?? "",
          meta_fr: draft.meta_fr?.trim(),
          meta_en: draft.meta_en?.trim(),
          summary_fr: draft.summary_fr?.trim(),
          summary_en: draft.summary_en?.trim(),
          detail_fr: draft.detail_fr,
          detail_en: draft.detail_en,
          sort_order: draft.sort_order ?? 0,
          published: !!draft.published,
        });
        showToast("Offre créée ✓");
        startNew();
      }
      await load();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erreur lors de l’enregistrement.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette offre ?")) return;
    try {
      await careersOffersApi.delete(id);
      showToast("Offre supprimée");
      if (editingId === id) startNew();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Offres carrières (site public+formulaire)
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/40">
            Contenus dans{" "}
            <span className="text-white/55">data/careers-offers.json</span> sur le
            serveur API (variable <span className="text-white/55">CAREERS_OFFERS_PATH</span>
            ). Une offre <strong className="text-mist/80">publiée</strong> apparaît sur la
            page « Carrières », est proposée dans le menu « Poste visé » et les
            candidatures sont enregistrées dans Supabase (table&nbsp;
            <code className="text-lime/80">job_applications</code>).
          </p>
          <p className="mt-2 text-xs text-white/30">
            <strong>Clé poste</strong> : identifiant technique unique (ex.{" "}
            <code className="text-white/50">juriste_senior_2026</code>), lettres
            minuscules, chiffres et underscore — ne doit pas être identique aux postes
            génériques (développeur, etc.).
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-xl bg-lime px-5 py-2.5 text-sm font-semibold text-black hover:bg-lime/90"
        >
          Nouvelle offre
        </button>
      </div>

      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-mist"
        >
          {toast}
        </motion.div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className={`${card} lg:col-span-2 p-4 max-h-[70vh] overflow-y-auto styled-scrollbar`}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/35">
            Liste ({offers.length})
          </h2>
          {loading ? (
            <p className="text-sm text-white/35">Chargement…</p>
          ) : offers.length === 0 ? (
            <p className="text-sm text-white/35">Aucune offre.</p>
          ) : (
            <ul className="space-y-2">
              {offers.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => startEdit(o)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                      editingId === o.id
                        ? "border-lime/40 bg-lime/[0.07]"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                    }`}
                  >
                    <span className="font-semibold text-mist line-clamp-2">
                      {o.title_fr}
                    </span>
                    <span className="mt-1 block text-xs text-white/35">
                      <code className="text-white/45">{o.position_key}</code>
                      {o.published ? (
                        <span className="ml-2 text-lime/80">● publiée</span>
                      ) : (
                        <span className="ml-2 text-coral/80">● brouillon</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className={`${card} lg:col-span-3 p-5 space-y-4 max-h-[70vh] overflow-y-auto styled-scrollbar`}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/35">
            {editingId ? "Modifier l’offre" : "Créer une offre"}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/40">
              Clé poste *
              <input
                value={draft.position_key ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, position_key: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white"
                placeholder="ex. charge_projet_2026"
                required
                disabled={!!editingId}
                title="Non modifiable après création (évite les candidatures orphelines)."
              />
            </label>
            <label className="block text-xs text-white/40">
              Ordre d’affichage
              <input
                type="number"
                min={0}
                max={9999}
                value={draft.sort_order ?? 0}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    sort_order: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/40">
              Titre (FR) *
              <input
                value={draft.title_fr ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title_fr: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white"
                required
              />
            </label>
            <label className="block text-xs text-white/40">
              Titre (EN) *
              <input
                value={draft.title_en ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title_en: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white"
                required
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/40">
              Meta / sous-titre (FR)
              <input
                value={draft.meta_fr ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, meta_fr: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-white/40">
              Meta / sous-titre (EN)
              <input
                value={draft.meta_en ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, meta_en: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/40">
              Résumé court (FR)
              <textarea
                value={draft.summary_fr ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, summary_fr: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white min-h-[72px]"
                rows={3}
              />
            </label>
            <label className="block text-xs text-white/40">
              Résumé court (EN)
              <textarea
                value={draft.summary_en ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, summary_en: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white min-h-[72px]"
                rows={3}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/40">
              Détail HTML (FR)
              <textarea
                value={draft.detail_fr ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, detail_fr: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white font-mono text-xs min-h-[120px]"
                rows={6}
              />
            </label>
            <label className="block text-xs text-white/40">
              Détail HTML (EN)
              <textarea
                value={draft.detail_en ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, detail_en: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white font-mono text-xs min-h-[120px]"
                rows={6}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={!!draft.published}
              onChange={(e) =>
                setDraft((d) => ({ ...d, published: e.target.checked }))
              }
              className="rounded border-white/20"
            />
            Publier sur le site (page carrières + formulaire)
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-coral px-6 py-2.5 text-sm font-bold text-black disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            {editingId && canDelete ? (
              <button
                type="button"
                onClick={() => remove(editingId)}
                className="rounded-xl border border-red-500/30 px-6 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
              >
                Supprimer
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
