import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  usersApi,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type BureauUser,
  type PermissionKey,
} from "../api";
import { useAuth } from "../BureauContext";

const ROLE_LABELS = { super_admin: "Super Admin", admin: "Admin", agent: "Agent" };
const ROLE_COLORS = { super_admin: "text-coral border-coral/30 bg-coral/10", admin: "text-lime border-lime/30 bg-lime/10", agent: "text-violet border-violet/30 bg-violet/10" };

type FormState = Partial<BureauUser> & { password?: string; permsAll: boolean; permsSet: Set<PermissionKey> };

const ROLE_DEFAULT_PERMS: Record<BureauUser["role"], PermissionKey[]> = {
  agent: ["leads", "assistant", "projects", "missions", "clients", "chat"],
  admin: ["leads", "assistant", "projects", "missions", "clients", "chat", "hr", "accounting", "feedback", "job_offers", "blog"],
  super_admin: [...PERMISSION_KEYS],
};

function permsToSet(csv: string | null | undefined): { all: boolean; set: Set<PermissionKey> } {
  const raw = (csv ?? "").trim();
  if (!raw || raw === "*") return { all: true, set: new Set() };
  const allowed = new Set<PermissionKey>(PERMISSION_KEYS);
  const set = new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s): s is PermissionKey => allowed.has(s as PermissionKey)),
  );
  return { all: set.has("*" as never), set };
}

function setToCsv(all: boolean, set: Set<PermissionKey>): string | null {
  if (all) return null;
  const arr = Array.from(set).sort();
  return arr.length ? arr.join(",") : null;
}

const emptyForm = (): FormState => ({
  username: "",
  full_name: "",
  email: "",
  role: "agent",
  password: "",
  permsAll: true,
  permsSet: new Set<PermissionKey>(),
});

export function EquipePage() {
  const { user: me } = useAuth();
  const [users, setUsers]   = useState<BureauUser[]>([]);
  const [modal, setModal]   = useState<"create"|"edit"|"reset"|null>(null);
  const [form, setForm]     = useState<FormState>(emptyForm());
  const [msg, setMsg]       = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => usersApi.list().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  function validateLocal(): string | null {
    const fullName = (form.full_name ?? "").trim();
    const username = (form.username ?? "").trim();
    if (!fullName) return "Le nom complet est requis.";
    if (!username) return "L'identifiant est requis.";
    if (!/^[a-zA-Z0-9._-]{2,64}$/.test(username)) {
      return "Identifiant invalide : 2 à 64 caractères, lettres, chiffres, point, tiret ou underscore uniquement.";
    }
    if (modal === "create") {
      const pwd = form.password ?? "";
      if (!pwd) return "Le mot de passe initial est requis.";
      if (pwd.length < 6) return "Le mot de passe doit faire au moins 6 caractères.";
    }
    const email = (form.email ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Adresse email invalide.";
    }
    return null;
  }

  async function saveUser() {
    if (saving) return;
    setFormError(null);
    const localErr = validateLocal();
    if (localErr) { setFormError(localErr); return; }

    const role = form.role ?? "agent";
    // Garde-fou : si « Accès complet » décoché sans aucun module coché,
    // l'API stocke null (= accès complet), ce qui est trompeur. On confirme.
    if (role !== "super_admin" && !form.permsAll && form.permsSet.size === 0) {
      const ok = confirm(
        "Aucun module n'est coché.\n\n" +
        "→ « OK » : enregistrer en remettant l'agent en accès complet (selon son rôle).\n" +
        "→ « Annuler » : revenir au formulaire pour cocher au moins un module.",
      );
      if (!ok) return;
    }
    const permissionsCsv = role === "super_admin" ? null : setToCsv(form.permsAll, form.permsSet);
    const fullName = (form.full_name ?? "").trim();
    const username = (form.username ?? "").trim();
    const email = (form.email ?? "").trim() || null;
    const payload = {
      username,
      full_name: fullName,
      email,
      role,
      active: form.active ?? true,
      practice_domains: form.practice_domains ?? null,
      permissions: permissionsCsv,
    };

    setSaving(true);
    try {
      if (modal === "create") {
        await usersApi.create({ ...payload, password: form.password as string } as Parameters<typeof usersApi.create>[0]);
        setMsg(`Agent « ${fullName} » créé avec succès.`);
      } else if (form.id) {
        await usersApi.update(form.id, payload);
        setMsg(`Agent « ${fullName} » mis à jour.`);
      }
      setModal(null);
      setFormError(null);
      load();
      setTimeout(() => setMsg(""), 4000);
    } catch (e: unknown) {
      // Affiche l'erreur DANS le modal (pas d'alert qui ferme et qu'on perd)
      const m = e instanceof Error ? e.message : "Erreur inconnue";
      setFormError(m);
    } finally {
      setSaving(false);
    }
  }

  async function resetPw() {
    if (!form.id || !form.password) {
      setFormError("Saisir un nouveau mot de passe.");
      return;
    }
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      await usersApi.resetPassword(form.id, form.password);
      setMsg("Mot de passe réinitialisé.");
      setModal(null);
      setTimeout(() => setMsg(""), 4000);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(u: BureauUser) {
    if (u.id === me?.id) return alert("Vous ne pouvez pas désactiver votre propre compte.");
    await usersApi.update(u.id, { ...u, active: u.active ? 0 : 1 }); load();
  }

  function openCreate() {
    const f = emptyForm();
    f.permsAll = true;
    setForm(f);
    setFormError(null);
    setModal("create");
  }

  function openEdit(u: BureauUser) {
    const { all, set } = permsToSet(u.permissions);
    setForm({
      ...u,
      password: "",
      permsAll: u.role === "super_admin" ? true : all,
      permsSet: set,
    });
    setFormError(null);
    setModal("edit");
  }

  function togglePerm(p: PermissionKey) {
    setForm((f) => {
      const next = new Set(f.permsSet);
      if (next.has(p)) next.delete(p); else next.add(p);
      return { ...f, permsSet: next, permsAll: false };
    });
  }

  function applyRoleDefaults(role: BureauUser["role"]) {
    setForm((f) => ({
      ...f,
      role,
      permsAll: false,
      permsSet: new Set(ROLE_DEFAULT_PERMS[role]),
    }));
  }

  const grouped = useMemo(() => {
    const g: Record<"agent" | "admin" | "super_admin", PermissionKey[]> = { agent: [], admin: [], super_admin: [] };
    PERMISSION_KEYS.forEach((p) => g[PERMISSION_LABELS[p].group].push(p));
    return g;
  }, []);

  const isSuperAdminForm = form.role === "super_admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Équipe</h1>
          <p className="text-sm text-white/40 mt-0.5">{users.length} membre{users.length > 1 ? "s" : ""} — vous (super admin) décidez des modules accessibles à chaque agent.</p>
        </div>
        <button onClick={openCreate}
          className="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95">
          + Ajouter un agent
        </button>
      </div>


      {loading ? <p className="text-white/55 text-center py-20">Chargement…</p> : (
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto styled-scrollbar">
          <table className="w-full text-sm min-w-[920px]">
            <thead className="bg-white/[0.03] border-b border-white/[0.06]">
              <tr>
                {["Agent", "Rôle", "Permissions", "Email", "Dernière connexion", "Statut", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map(u => {
                const { all, set } = permsToSet(u.permissions);
                const isUnrestricted = u.role === "super_admin" || all;
                return (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`transition hover:bg-white/[0.02] ${!u.active ? "opacity-40" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-coral/40 to-violet/40 text-xs font-bold text-white shrink-0">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{u.full_name}</p>
                          <p className="text-xs text-white/40">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {isUnrestricted ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-lime/20 bg-lime/5 px-2.5 py-0.5 text-[10px] font-bold text-lime">
                          ✓ Accès complet
                        </span>
                      ) : set.size === 0 ? (
                        <span className="text-[11px] text-coral/85">Aucun module ⚠</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/60">
                          <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[10px] font-bold text-violet">{set.size}</span>
                          modules
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-white/50">{u.email || "–"}</td>
                    <td className="px-5 py-4 text-white/40 text-xs">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString("fr-FR") : "Jamais"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold ${u.active ? "text-lime" : "text-white/55"}`}>
                        {u.active ? "● Actif" : "● Inactif"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {u.id === me?.id ? (
                        <span className="text-[10px] italic text-white/35">— vous-même —</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button onClick={() => openEdit(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-white/85 hover:border-white/30 hover:bg-white/[0.08] hover:text-white transition"
                            title="Modifier l'agent et ses permissions">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            Modifier
                          </button>
                          <button onClick={() => { setForm({ ...u, password: "Afrilex2026!", permsAll: true, permsSet: new Set() } as FormState); setModal("reset"); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-violet/30 bg-violet/10 px-2.5 py-1.5 text-xs font-semibold text-violet hover:bg-violet/20 transition"
                            title="Réinitialiser le mot de passe">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="16" r="1" /><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                            Mot de passe
                          </button>
                          {u.active ? (
                            <button onClick={() => toggle(u)}
                              className="inline-flex items-center gap-1 rounded-lg border border-coral/40 bg-coral/15 px-2.5 py-1.5 text-xs font-bold text-coral hover:bg-coral/25 transition"
                              title="Désactiver — l'agent ne pourra plus se connecter">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                              Désactiver
                            </button>
                          ) : (
                            <button onClick={() => toggle(u)}
                              className="inline-flex items-center gap-1 rounded-lg border border-lime/40 bg-lime/15 px-2.5 py-1.5 text-xs font-bold text-lime hover:bg-lime/25 transition"
                              title="Réactiver — l'agent pourra à nouveau se connecter">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="20 6 9 17 4 12" /></svg>
                              Activer
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal create/edit */}
      <AnimatePresence>
        {(modal === "create" || modal === "edit") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={e => e.target === e.currentTarget && setModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="my-8 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f1012] shadow-2xl overflow-hidden">
              <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  {modal === "create" ? "Nouvel agent" : `Modifier — ${form.full_name}`}
                </h3>
                <button onClick={() => setModal(null)} className="text-white/55 hover:text-white transition text-xl">×</button>
              </div>

              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {([["full_name", "Nom complet *"], ["username", "Identifiant *"], ["email", "Email"]] as const).map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">{l}</label>
                    <input value={(form as Record<string, string>)[k] ?? ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-coral/50 focus:outline-none transition" />
                  </div>
                ))}

                {modal === "create" && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Mot de passe initial *</label>
                    <input type="password" value={form.password ?? ""} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-coral/50 focus:outline-none transition" />
                    <p className="text-xs text-white/55 mt-1">L'agent devra changer son mot de passe à la 1ère connexion.</p>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Rôle</label>
                  <select value={form.role ?? "agent"} onChange={e => applyRoleDefaults(e.target.value as BureauUser["role"])}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none">
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <p className="text-xs text-white/55 mt-1">
                    Changer le rôle pré-coche les permissions typiques de ce rôle (vous pouvez les ajuster ensuite).
                  </p>
                </div>

                {/* Permissions granulaires */}
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">Modules accessibles</p>
                      <p className="text-xs text-white/55 mt-0.5">
                        Cochez les modules que cet agent pourra utiliser. Les modules non cochés sont masqués dans la sidebar ET refusés côté serveur.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-lime shrink-0">
                      <input
                        type="checkbox"
                        checked={isSuperAdminForm || form.permsAll}
                        disabled={isSuperAdminForm}
                        onChange={(e) => setForm((f) => ({ ...f, permsAll: e.target.checked, permsSet: new Set() }))}
                        className="h-4 w-4 rounded border-white/20"
                      />
                      Accès complet (selon le rôle)
                    </label>
                  </div>

                  {isSuperAdminForm ? (
                    <p className="text-xs text-coral/85 italic">Un super admin a toujours tous les accès — pas de restriction possible.</p>
                  ) : form.permsAll ? (
                    <p className="text-xs text-white/45 italic">Aucune restriction : l'agent verra tout ce que son rôle permet.</p>
                  ) : (
                    <div className="space-y-4">
                      {(["agent", "admin", "super_admin"] as const).map((groupKey) => {
                        const list = grouped[groupKey].filter((p) => {
                          if (groupKey === "admin" && form.role === "agent") return false;
                          if (groupKey === "super_admin" && form.role !== "super_admin") return false;
                          return true;
                        });
                        if (list.length === 0) return null;
                        const groupLabel = groupKey === "agent" ? "Modules agent" : groupKey === "admin" ? "Modules admin" : "Modules super admin";
                        return (
                          <div key={groupKey}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">{groupLabel}</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {list.map((p) => {
                                const meta = PERMISSION_LABELS[p];
                                const checked = form.permsSet.has(p);
                                return (
                                  <label
                                    key={p}
                                    className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                                      checked ? "border-lime/35 bg-lime/[0.06]" : "border-white/10 bg-white/[0.02] hover:border-white/20"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => togglePerm(p)}
                                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white truncate">{meta.label}</p>
                                      <p className="text-[11px] text-white/48 leading-relaxed">{meta.description}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {formError && (
                <div className="px-6 pt-2">
                  <div role="alert" className="rounded-xl border border-coral/35 bg-coral/10 px-4 py-3 text-sm text-coral leading-relaxed">
                    <span className="font-bold">⚠ Erreur :</span> {formError}
                  </div>
                </div>
              )}

              <div className="border-t border-white/[0.07] px-6 py-4 flex gap-3">
                <button
                  onClick={() => setModal(null)}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={saveUser}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Enregistrement…
                    </>
                  ) : (
                    modal === "create" ? "Créer l'agent" : "Enregistrer"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {modal === "reset" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && setModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f1012] p-6 shadow-2xl">
              <h3 className="font-display text-lg font-bold text-white mb-2">Réinitialiser le mot de passe</h3>
              <p className="text-sm text-white/40 mb-5">Pour : <span className="text-white font-semibold">{form.full_name}</span></p>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nouveau mot de passe temporaire</label>
              <input value={form.password ?? ""} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none mb-3" />
              {formError && (
                <div role="alert" className="mb-3 rounded-xl border border-coral/35 bg-coral/10 px-3 py-2 text-xs text-coral">
                  <span className="font-bold">⚠</span> {formError}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setModal(null)} disabled={saving} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition disabled:opacity-50">Annuler</button>
                <button onClick={resetPw} disabled={saving} className="flex-1 rounded-xl bg-violet py-3 text-sm font-bold text-ink hover:brightness-110 transition disabled:opacity-60 inline-flex items-center justify-center gap-2">
                  {saving ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink/40 border-t-ink" />
                      Réinitialisation…
                    </>
                  ) : "Réinitialiser"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast succès — bottom center */}
      <AnimatePresence>
        {msg && !modal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-full border border-lime/30 bg-lime/15 px-6 py-3 text-sm font-semibold text-lime backdrop-blur-xl shadow-lg"
            role="status"
          >
            ✓ {msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
