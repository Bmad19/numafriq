import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { casesApi, type CaseTemplate } from "../api";
import { useAuth } from "../BureauContext";

export function TemplatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === "super_admin";
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<CaseTemplate | null>(null);
  const [applying, setApplying] = useState<CaseTemplate | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setLoading(true); setError(null);
    casesApi.templatesList()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  function handleApplied(msg: string) {
    setApplying(null);
    notify(msg);
    // Navigation auto vers Projets pour voir le nouveau dossier
    setTimeout(() => navigate("/bureau/projets"), 900);
  }

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete(t: CaseTemplate) {
    if (!confirm(`Supprimer le modèle "${t.name}" ?`)) return;
    try {
      await casesApi.templateDelete(t.id);
      notify("Modèle supprimé");
      load();
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display text-white">Modèles de dossier</h1>
          <p className="text-sm text-white/55">Créez un dossier en un clic à partir d'un modèle pré-rempli (étapes types).</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowCreate(true)} className="rounded-lg bg-coral px-3.5 py-2 text-sm font-semibold text-white hover:bg-coral/90">
            + Nouveau modèle
          </button>
        )}
      </header>

      {toast && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{toast}</div>}
      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}
      {loading && <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">Chargement…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map((t) => (
          <article key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{t.name}</h3>
                {t.practice_area && (
                  <div className="mt-1 inline-block rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase text-white/70">{t.practice_area}</div>
                )}
              </div>
            </div>
            {t.description && <p className="mt-2 text-sm text-white/65 line-clamp-3">{t.description}</p>}
            <div className="mt-3 text-xs text-white/60">
              📋 {t.milestones_json?.length ?? 0} étape{(t.milestones_json?.length ?? 0) > 1 ? "s" : ""}
              {t.events_json?.length ? ` · 📅 ${t.events_json.length} évènement(s)` : ""}
            </div>
            <details className="mt-2 group">
              <summary className="cursor-pointer text-xs text-white/55 hover:text-white">Voir le détail des étapes</summary>
              <ol className="mt-2 space-y-1 text-xs text-white/70 list-decimal pl-5">
                {(t.milestones_json ?? []).map((m, i) => (
                  <li key={i}>
                    <strong>{m.title}</strong>
                    <span className="text-white/50"> · J+{m.due_offset_days}j</span>
                    {m.description && <div className="text-white/55">{m.description}</div>}
                  </li>
                ))}
              </ol>
            </details>
            <div className="mt-auto pt-3 flex flex-wrap gap-2">
              <button onClick={() => setApplying(t)} className="flex-1 rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-white hover:bg-coral/90">
                ➔ Créer un dossier
              </button>
              {isSuperAdmin && (
                <>
                  <button onClick={() => setEditing(t)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5">✎ Modifier</button>
                  <button onClick={() => handleDelete(t)} className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">🗑</button>
                </>
              )}
            </div>
          </article>
        ))}
        {!loading && templates.length === 0 && (
          <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/55">
            Aucun modèle. {isSuperAdmin && "Créez-en un avec « + Nouveau modèle »."}
          </div>
        )}
      </div>

      {applying && <ApplyModal tpl={applying} onClose={() => setApplying(null)} onSuccess={handleApplied} />}
      {(showCreate || editing) && (
        <TemplateEditModal
          tpl={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSuccess={() => { setShowCreate(false); setEditing(null); load(); notify("Modèle enregistré"); }}
        />
      )}
    </div>
  );
}

function ApplyModal({ tpl, onClose, onSuccess }: { tpl: CaseTemplate; onClose: () => void; onSuccess: (msg: string) => void }) {
  const [form, setForm] = useState({
    name: tpl.name,
    client: "",
    description: tpl.description ?? "",
    case_number: "",
    start_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.client.trim()) { setErr("Nom du dossier et client requis."); return; }
    setSaving(true); setErr(null);
    try {
      const r = await casesApi.templateApply(tpl.id, form);
      const warn = r.warnings ? ` (Attention : ${r.warnings.hint ?? ""})` : "";
      onSuccess(`✓ Dossier créé : ${r.milestones_count} étape(s), ${r.events_count} évènement(s).${warn}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold text-white">Créer un dossier depuis « {tpl.name} »</h2>
      <p className="mt-1 text-sm text-white/55">Le dossier sera créé avec {tpl.milestones_json?.length ?? 0} étape(s) pré-remplie(s).</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <Field label="Nom du dossier *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldCls} /></Field>
        <Field label="Client (nom, à renseigner avant ouverture)*"><input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} className={fieldCls} placeholder="Ex. SARL Kibanon" /></Field>
        <Field label="N° de dossier interne"><input value={form.case_number} onChange={(e) => setForm({ ...form, case_number: e.target.value })} className={fieldCls} /></Field>
        <Field label="Date de référence (J0)"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={fieldCls} /></Field>
        <Field label="Description"><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldCls} /></Field>
        {err && <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5">Annuler</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-coral px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-coral/90 disabled:opacity-50">
            {saving ? "Création…" : "Créer le dossier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TemplateEditModal({ tpl, onClose, onSuccess }: { tpl: CaseTemplate | null; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<Partial<CaseTemplate>>({
    name: tpl?.name ?? "",
    description: tpl?.description ?? "",
    practice_area: tpl?.practice_area ?? "",
    default_status: tpl?.default_status ?? "en_cours",
    default_priority: tpl?.default_priority ?? "normale",
    milestones_json: tpl?.milestones_json ?? [],
    is_active: tpl?.is_active ?? true,
  });
  const [milestones, setMilestones] = useState(tpl?.milestones_json ?? [{ title: "", description: "", due_offset_days: 0, order_index: 10, visible_to_client: true }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) { setErr("Le nom du modèle est requis."); return; }
    const validMs = milestones.filter((m) => m.title?.trim());
    if (validMs.length === 0) { setErr("Ajoutez au moins une étape avec un titre."); return; }
    setSaving(true); setErr(null);
    // Normalise les étapes : titre obligatoire, due_offset_days et order_index typés
    const cleanMs = validMs.map((m, i) => ({
      title: String(m.title).trim(),
      description: m.description ? String(m.description).trim() : undefined,
      due_offset_days: Number(m.due_offset_days) || 0,
      order_index: Number(m.order_index) || (i + 1) * 10,
      visible_to_client: m.visible_to_client !== false,
    }));
    const payload = { ...form, milestones_json: cleanMs };
    try {
      if (tpl) await casesApi.templateUpdate(tpl.id, payload);
      else await casesApi.templateCreate(payload);
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setSaving(false); }
  }

  return (
    <Modal onClose={onClose} wide>
      <h2 className="text-lg font-semibold text-white">{tpl ? "Modifier le modèle" : "Nouveau modèle"}</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nom *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldCls} /></Field>
          <Field label="Domaine">
            <select value={form.practice_area ?? ""} onChange={(e) => setForm({ ...form, practice_area: e.target.value })} className={fieldCls}>
              <option value="">— Aucun —</option>
              <option value="ohada">OHADA</option>
              <option value="civil">Civil</option>
              <option value="commercial">Commercial</option>
              <option value="fiscal">Fiscal</option>
              <option value="social">Social / Travail</option>
              <option value="penal">Pénal des affaires</option>
              <option value="immobilier">Immobilier</option>
              <option value="autre">Autre</option>
            </select>
          </Field>
        </div>
        <Field label="Description"><textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldCls} /></Field>

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-2">Étapes ({milestones.length})</label>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {milestones.map((m, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.04] p-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Titre étape"
                    value={m.title ?? ""}
                    onChange={(e) => { const cp = [...milestones]; cp[i] = { ...cp[i], title: e.target.value }; setMilestones(cp); }}
                    className={fieldCls + " flex-1"}
                  />
                  <input
                    type="number" placeholder="J+"
                    value={m.due_offset_days ?? 0}
                    onChange={(e) => { const cp = [...milestones]; cp[i] = { ...cp[i], due_offset_days: +e.target.value }; setMilestones(cp); }}
                    className={fieldCls + " w-20"}
                    title="Décalage en jours depuis la date de référence"
                  />
                  <button type="button" onClick={() => setMilestones(milestones.filter((_, k) => k !== i))}
                    className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10">×</button>
                </div>
                <input
                  placeholder="Description (optionnel)"
                  value={m.description ?? ""}
                  onChange={(e) => { const cp = [...milestones]; cp[i] = { ...cp[i], description: e.target.value }; setMilestones(cp); }}
                  className={fieldCls + " text-xs"}
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setMilestones([...milestones, { title: "", description: "", due_offset_days: (milestones.at(-1)?.due_offset_days ?? 0) + 7, order_index: (milestones.length + 1) * 10, visible_to_client: true }])}
            className="mt-2 rounded-lg border border-white/15 px-3 py-1 text-xs text-white/80 hover:bg-white/5">+ Ajouter une étape</button>
        </div>

        {err && <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5">Annuler</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-coral px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-coral/90 disabled:opacity-50">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`rounded-2xl bg-ink border border-white/10 p-5 w-full max-h-[90vh] overflow-y-auto ${wide ? "max-w-2xl" : "max-w-md"}`}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-white/70">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
const fieldCls = "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-coral focus:outline-none";
