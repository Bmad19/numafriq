import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usersApi, type BureauUser } from "../api";
import { useAuth } from "../BureauContext";

const ROLE_LABELS = { super_admin: "Super Admin", admin: "Admin", agent: "Agent" };
const ROLE_COLORS = { super_admin: "text-coral border-coral/30 bg-coral/10", admin: "text-lime border-lime/30 bg-lime/10", agent: "text-violet border-violet/30 bg-violet/10" };

const emptyUser = { username: "", full_name: "", email: "", role: "agent" as const, password: "" };

export function EquipePage() {
  const { user: me } = useAuth();
  const [users, setUsers]   = useState<BureauUser[]>([]);
  const [modal, setModal]   = useState<"create"|"edit"|"reset"|null>(null);
  const [form, setForm]     = useState<Partial<BureauUser> & { password?: string }>(emptyUser);
  const [msg, setMsg]       = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => usersApi.list().then(setUsers).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function saveUser() {
    try {
      if (modal === "create") { await usersApi.create(form as BureauUser & { password: string }); }
      else if (form.id) { await usersApi.update(form.id, form); }
      setMsg("Utilisateur enregistré !"); setModal(null); load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erreur"); }
  }

  async function resetPw() {
    if (!form.id || !form.password) return;
    try { await usersApi.resetPassword(form.id, form.password); setMsg("Mot de passe réinitialisé."); setModal(null); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Erreur"); }
  }

  async function toggle(u: BureauUser) {
    if (u.id === me?.id) return alert("Vous ne pouvez pas désactiver votre propre compte.");
    await usersApi.update(u.id, { ...u, active: u.active ? 0 : 1 }); load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Équipe</h1>
          <p className="text-sm text-white/40 mt-0.5">{users.length} membre{users.length>1?"s":""}</p>
        </div>
        <button onClick={() => { setForm(emptyUser); setModal("create"); }}
          className="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95">
          + Ajouter un agent
        </button>
      </div>

      {msg && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-lime bg-lime/10 border border-lime/20 rounded-xl px-4 py-3">{msg}</motion.div>}

      {loading ? <p className="text-white/30 text-center py-20">Chargement…</p> : (
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] border-b border-white/[0.06]">
              <tr>
                {["Agent","Rôle","Email","Dernière connexion","Statut","Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map(u => (
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
                  <td className="px-5 py-4 text-white/50">{u.email || "–"}</td>
                  <td className="px-5 py-4 text-white/40 text-xs">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString("fr-FR") : "Jamais"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold ${u.active ? "text-lime" : "text-white/30"}`}>
                      {u.active ? "● Actif" : "● Inactif"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5">
                      {u.id !== me?.id && (
                        <>
                          <button onClick={() => { setForm({ ...u, password: "" }); setModal("edit"); }}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white hover:border-white/25 transition">
                            Modifier
                          </button>
                          <button onClick={() => { setForm({ ...u, password: "Numafriq2026!" }); setModal("reset"); }}
                            className="rounded-lg border border-violet/20 px-3 py-1.5 text-xs text-violet/70 hover:bg-violet/10 transition">
                            Pwd
                          </button>
                          <button onClick={() => toggle(u)}
                            className={`rounded-lg border px-3 py-1.5 text-xs transition ${u.active ? "border-red-500/20 text-red-400 hover:bg-red-500/10" : "border-lime/20 text-lime hover:bg-lime/10"}`}>
                            {u.active ? "Désac." : "Activer"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal create/edit */}
      <AnimatePresence>
        {(modal === "create" || modal === "edit") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && setModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1012] p-6 shadow-2xl">
              <h3 className="font-display text-lg font-bold text-white mb-5">
                {modal === "create" ? "Nouvel agent" : "Modifier l'agent"}
              </h3>
              <div className="space-y-4">
                {([["full_name","Nom complet *"],["username","Identifiant *"],["email","Email"]] as const).map(([k,l]) => (
                  <div key={k}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">{l}</label>
                    <input value={(form as Record<string,string>)[k] ?? ""} onChange={e => setForm(f => ({...f,[k]:e.target.value}))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-coral/50 focus:outline-none transition" />
                  </div>
                ))}
                {modal === "create" && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Mot de passe *</label>
                    <input type="password" value={form.password ?? ""} onChange={e => setForm(f => ({...f,password:e.target.value}))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-coral/50 focus:outline-none transition" />
                    <p className="text-xs text-white/30 mt-1">L'agent devra changer son mot de passe à la 1ère connexion.</p>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Rôle</label>
                  <select value={form.role ?? "agent"} onChange={e => setForm(f => ({...f,role:e.target.value as BureauUser["role"]}))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none">
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">Annuler</button>
                <button onClick={saveUser} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition">Enregistrer</button>
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
              <input value={form.password ?? ""} onChange={e => setForm(f => ({...f,password:e.target.value}))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none mb-5" />
              <div className="flex gap-3">
                <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">Annuler</button>
                <button onClick={resetPw} className="flex-1 rounded-xl bg-violet py-3 text-sm font-bold text-white hover:brightness-110 transition">Réinitialiser</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
