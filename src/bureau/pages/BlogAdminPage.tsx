import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth, hasRole } from "../BureauContext";
import {
  blogArticlesApi,
  type BlogArticleAdmin,
  type BlogArticleInput,
} from "../api";
import { blogCommentsApiOrigin } from "../../lib/blogApiOrigin";

const inp = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/45 focus:border-coral/50 focus:outline-none transition";
const lbl = "block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE = "image/jpeg, image/png, image/webp, image/gif";

function fullImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) {
    const origin = blogCommentsApiOrigin();
    return origin ? `${origin}${path}` : path;
  }
  return path;
}

const EMPTY_FORM: BlogArticleInput = {
  title_fr: "",
  title_en: "",
  excerpt_fr: "",
  excerpt_en: "",
  content_html_fr: "",
  content_html_en: "",
  cover_image_url: "",
  categories: "",
  is_published: false,
  author_name: "",
};

function fileToBase64(file: File): Promise<{ data_base64: string; mime: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const idx = result.indexOf(",");
      if (idx === -1) return reject(new Error("Lecture image impossible"));
      resolve({
        data_base64: result.slice(idx + 1),
        mime: file.type || "application/octet-stream",
        filename: file.name,
      });
    };
    reader.onerror = () => reject(new Error("Lecture image échouée"));
    reader.readAsDataURL(file);
  });
}

export function BlogAdminPage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");

  const [articles, setArticles] = useState<BlogArticleAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<BlogArticleAdmin | null>(null);
  const [form, setForm] = useState<BlogArticleInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    setError(null);
    blogArticlesApi.list()
      .then(setArticles)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total:     articles.length,
    published: articles.filter((a) => a.is_published).length,
    drafts:    articles.filter((a) => !a.is_published).length,
  }), [articles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      [a.title_fr, a.title_en, a.excerpt_fr, a.author_name, a.slug, a.categories]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [articles, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, author_name: user?.full_name ?? "" });
    setModal(true);
  }

  function openEdit(a: BlogArticleAdmin) {
    setEditing(a);
    setForm({
      title_fr: a.title_fr,
      title_en: a.title_en ?? "",
      excerpt_fr: a.excerpt_fr ?? "",
      excerpt_en: a.excerpt_en ?? "",
      content_html_fr: a.content_html_fr,
      content_html_en: a.content_html_en ?? "",
      cover_image_url: a.cover_image_url ?? "",
      categories: a.categories ?? "",
      is_published: a.is_published,
      author_name: a.author_name ?? user?.full_name ?? "",
      slug: a.slug,
    });
    setModal(true);
  }

  async function save(): Promise<BlogArticleAdmin | null> {
    if (!form.title_fr?.trim() || !form.content_html_fr?.trim()) {
      alert("Le titre (FR) et le contenu (FR) sont obligatoires.");
      return null;
    }
    setSaving(true);
    try {
      let saved: BlogArticleAdmin;
      if (editing) {
        const r = await blogArticlesApi.update(editing.id, form);
        saved = r.article;
      } else {
        const r = await blogArticlesApi.create(form);
        saved = r.article;
      }
      load();
      setEditing(saved);
      return saved;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur d'enregistrement");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndClose() {
    const r = await save();
    if (r) setModal(false);
  }

  async function uploadCoverImage(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      alert("Image trop lourde (max 5 Mo).");
      return;
    }
    let articleId = editing?.id;
    if (!articleId) {
      const saved = await save();
      if (!saved) return;
      articleId = saved.id;
    }
    setUploading(true);
    try {
      const payload = await fileToBase64(file);
      const r = await blogArticlesApi.uploadImage(articleId!, { ...payload, set_as_cover: true });
      setForm((f) => ({ ...f, cover_image_url: r.url }));
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function togglePublish(a: BlogArticleAdmin) {
    try {
      await blogArticlesApi.update(a.id, {
        title_fr: a.title_fr,
        title_en: a.title_en ?? "",
        excerpt_fr: a.excerpt_fr ?? "",
        excerpt_en: a.excerpt_en ?? "",
        content_html_fr: a.content_html_fr,
        content_html_en: a.content_html_en ?? "",
        cover_image_url: a.cover_image_url ?? "",
        categories: a.categories ?? "",
        author_name: a.author_name ?? "",
        slug: a.slug,
        is_published: !a.is_published,
      });
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function remove(a: BlogArticleAdmin) {
    if (!confirm(`Supprimer définitivement l'article « ${a.title_fr} » ?`)) return;
    try {
      await blogArticlesApi.delete(a.id);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-coral/20 bg-coral/5 p-6">
        <p className="text-sm text-coral">Accès réservé aux administrateurs et super-administrateurs.</p>
      </div>
    );
  }

  const coverPreview = fullImageUrl(form.cover_image_url ?? "");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Blog</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Publiez de nouveaux articles avec image de couverture — ils apparaissent automatiquement sur <strong>/blog</strong> avec la possibilité de commentaires.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95"
        >
          + Nouvel article
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Total",      value: stats.total,     color: "text-white",  icon: "📚" },
          { label: "Publiés",    value: stats.published, color: "text-lime",   icon: "✅" },
          { label: "Brouillons", value: stats.drafts,    color: "text-violet",icon: "📝" },
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
          placeholder="Rechercher (titre, auteur, slug…)"
          className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-white/50 focus:border-coral/40 focus:outline-none transition"
        />
        <span className="text-xs text-white/55">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="rounded-xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="col-span-full py-16 text-center text-white/48 text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-white/[0.08] bg-white/[0.02] py-16 text-center text-white/48 text-sm">
            {articles.length === 0
              ? "Aucun article — cliquez sur « Nouvel article » pour commencer."
              : "Aucun résultat pour cette recherche."}
          </div>
        ) : (
          filtered.map((a) => {
            const cover = fullImageUrl(a.cover_image_url);
            return (
              <article key={a.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden flex flex-col">
                <div className="relative aspect-[16/9] bg-white/5">
                  {cover ? (
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">Pas d'image</div>
                  )}
                  <button
                    onClick={() => togglePublish(a)}
                    className={`absolute top-3 right-3 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase transition ${
                      a.is_published
                        ? "border-lime/25 bg-lime/15 text-lime hover:bg-lime/25"
                        : "border-white/15 bg-ink/70 text-white/70 hover:bg-ink/90"
                    }`}
                  >
                    {a.is_published ? "Publié" : "Brouillon"}
                  </button>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-display text-base font-bold text-white leading-tight">{a.title_fr}</h3>
                  <p className="mt-1 text-[11px] text-white/35 truncate">/{a.slug}</p>
                  {a.excerpt_fr && (
                    <p className="mt-2 text-xs text-white/55 line-clamp-2">{a.excerpt_fr}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-white/45">
                    {a.author_name && <span>✍️ {a.author_name}</span>}
                    {a.published_at && (
                      <span>📅 {new Date(a.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                    {a.categories && (
                      <span className="truncate">🏷 {a.categories}</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <button onClick={() => openEdit(a)} className="rounded-lg bg-coral/15 border border-coral/25 text-coral text-xs px-3 py-1.5 hover:bg-coral/25 transition font-bold">
                      Éditer
                    </button>
                    <button onClick={() => remove(a)} className="rounded-lg text-white/48 hover:text-coral text-xs px-2 py-1.5 hover:bg-coral/10 transition" title="Supprimer">
                      🗑
                    </button>
                  </div>
                </div>
              </article>
            );
          })
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
              className="my-8 w-full max-w-4xl rounded-3xl border border-white/10 bg-[#0f1012] shadow-2xl overflow-hidden"
            >
              <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  {editing ? `Éditer : ${editing.title_fr}` : "Nouvel article"}
                </h3>
                <button onClick={() => setModal(false)} className="text-white/55 hover:text-white transition text-xl">×</button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Titre (FR) *</label>
                    <input value={form.title_fr ?? ""} onChange={(e) => setForm((f) => ({ ...f, title_fr: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Title (EN)</label>
                    <input value={form.title_en ?? ""} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} className={inp} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Extrait / chapeau (FR)</label>
                    <textarea rows={2} value={form.excerpt_fr ?? ""} onChange={(e) => setForm((f) => ({ ...f, excerpt_fr: e.target.value }))} className={inp + " resize-none"} placeholder="Résumé de 1–3 phrases (apparaît sur la carte)" />
                  </div>
                  <div>
                    <label className={lbl}>Excerpt (EN)</label>
                    <textarea rows={2} value={form.excerpt_en ?? ""} onChange={(e) => setForm((f) => ({ ...f, excerpt_en: e.target.value }))} className={inp + " resize-none"} />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Image de couverture</label>
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
                    <div className="aspect-[16/10] rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden flex items-center justify-center">
                      {coverPreview ? (
                        <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-white/40">Aucune image</span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={fileRef}
                          type="file"
                          accept={ACCEPTED_IMAGE}
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadCoverImage(f);
                          }}
                        />
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => fileRef.current?.click()}
                          className="rounded-xl bg-coral/15 border border-coral/30 px-4 py-2 text-xs font-bold text-coral hover:bg-coral/25 transition disabled:opacity-50"
                        >
                          {uploading ? "Envoi…" : "Téléverser une image"}
                        </button>
                        {form.cover_image_url ? (
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, cover_image_url: "" }))}
                            className="text-xs text-white/45 hover:text-coral transition"
                          >
                            Retirer
                          </button>
                        ) : null}
                      </div>
                      <input
                        value={form.cover_image_url ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))}
                        className={inp}
                        placeholder="URL externe de l'image (https://…) ou utiliser le bouton ci-dessus"
                      />
                      <p className="text-[11px] text-white/40">JPEG/PNG/WEBP/GIF, max 5 Mo. L'upload nécessite que l'article soit déjà créé (sera enregistré automatiquement).</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={lbl}>Contenu (FR) — HTML accepté *</label>
                  <textarea
                    rows={12}
                    value={form.content_html_fr ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, content_html_fr: e.target.value }))}
                    className={inp + " resize-y min-h-[260px] font-mono text-xs"}
                    placeholder={'<p>Premier paragraphe…</p>\n<h2>Sous-titre</h2>\n<p>Suite…</p>\n<ul><li>Point 1</li></ul>'}
                  />
                  <p className="mt-1 text-[11px] text-white/40">
                    Balises supportées : <code>&lt;p&gt;</code>, <code>&lt;h2&gt;</code>, <code>&lt;h3&gt;</code>, <code>&lt;ul&gt;</code>, <code>&lt;ol&gt;</code>, <code>&lt;li&gt;</code>, <code>&lt;a&gt;</code>, <code>&lt;strong&gt;</code>, <code>&lt;em&gt;</code>, <code>&lt;img&gt;</code>, <code>&lt;blockquote&gt;</code>. Sans balise, les sauts de ligne sont conservés.
                  </p>
                </div>

                <div>
                  <label className={lbl}>Content (EN)</label>
                  <textarea
                    rows={6}
                    value={form.content_html_en ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, content_html_en: e.target.value }))}
                    className={inp + " resize-y min-h-[140px] font-mono text-xs"}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Auteur affiché</label>
                    <input value={form.author_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Catégories (CSV)</label>
                    <input value={form.categories ?? ""} onChange={(e) => setForm((f) => ({ ...f, categories: e.target.value }))} className={inp} placeholder="Droit OHADA, Fiscalité" />
                  </div>
                  <div>
                    <label className={lbl}>Slug (URL)</label>
                    <input value={form.slug ?? ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} className={inp} placeholder="laisser vide pour auto" />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={!!form.is_published}
                    onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  Publier (visible immédiatement sur /blog)
                </label>
              </div>

              <div className="border-t border-white/[0.07] px-6 py-4 flex gap-3">
                <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">
                  Fermer
                </button>
                <button onClick={() => save()} disabled={saving} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white/85 hover:bg-white/[0.08] transition disabled:opacity-40">
                  {saving ? "…" : "Enregistrer"}
                </button>
                <button onClick={saveAndClose} disabled={saving} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-40">
                  {saving ? "Enregistrement…" : "Enregistrer & fermer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
