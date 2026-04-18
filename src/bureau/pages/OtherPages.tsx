// HR, Missions, Retours, Settings — pages compactes

// ── HR ────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { hrApi, usersApi, type HrRecord, type BureauUser } from "../api";
import { useAuth, hasRole } from "../BureauContext";
import { authApi } from "../api";
import { feedbackApi, type Feedback } from "../api";
import { missionsApi, type Mission } from "../api";
import { AnimatePresence, motion } from "framer-motion";

const HR_TYPES  = ["conge","absence","retard","prime","note"];
const HR_LABELS: Record<string,string> = { conge:"Congé",absence:"Absence",retard:"Retard",prime:"Prime",note:"Note RH" };
const HR_COLORS: Record<string,string> = { conge:"text-lime",absence:"text-red-400",retard:"text-orange-400",prime:"text-violet",note:"text-white/60" };

export function RHPage() {
  const { user } = useAuth(); const isAdmin = hasRole(user,"admin");
  const [records,setRecords] = useState<HrRecord[]>([]);
  const [agents,setAgents]   = useState<BureauUser[]>([]);
  const [modal, setModal]    = useState(false);
  const [form,  setForm]     = useState({ user_id:"",type:"conge",title:"",description:"",date:new Date().toISOString().split("T")[0],amount:"",status:"en_attente" });

  const load = () => Promise.all([hrApi.list(),usersApi.list()]).then(([r,u]) => { setRecords(r); setAgents(u); });
  useEffect(() => { load(); }, []);

  async function save() {
    await hrApi.create({ ...form, user_id: +form.user_id, amount: form.amount ? +form.amount : undefined });
    setModal(false); load();
  }

  const statusColor: Record<string,string> = { en_attente:"text-orange-400",approuve:"text-lime",refuse:"text-red-400" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-white">Ressources Humaines</h1><p className="text-sm text-white/40 mt-0.5">Congés, primes et notes</p></div>
        {isAdmin && <button onClick={() => setModal(true)} className="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95">+ Nouveau</button>}
      </div>
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] border-b border-white/[0.06]"><tr>{["Agent","Type","Titre","Date","Montant","Statut","Action"].map(h => <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/[0.04]">
            {records.map(r => (
              <tr key={r.id} className="hover:bg-white/[0.02] transition">
                <td className="px-5 py-3 text-white/80 font-medium">{r.employee_name}</td>
                <td className={`px-5 py-3 text-xs font-bold uppercase ${HR_COLORS[r.type]}`}>{HR_LABELS[r.type]}</td>
                <td className="px-5 py-3 text-white/60">{r.title}</td>
                <td className="px-5 py-3 text-white/40 text-xs">{new Date(r.date).toLocaleDateString("fr-FR")}</td>
                <td className="px-5 py-3 text-white/60">{r.amount ? `${r.amount.toLocaleString("fr-FR")} FCFA` : "–"}</td>
                <td className={`px-5 py-3 text-xs font-bold ${statusColor[r.status]}`}>{r.status.replace("_"," ")}</td>
                <td className="px-5 py-3">
                  {isAdmin && (
                    <div className="flex gap-1">
                      {r.status === "en_attente" && <>
                        <button onClick={() => hrApi.update(r.id,{status:"approuve"}).then(load)} className="text-xs text-lime hover:underline">✓</button>
                        <button onClick={() => hrApi.update(r.id,{status:"refuse"}).then(load)} className="text-xs text-red-400 hover:underline ml-2">✗</button>
                      </>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AnimatePresence>{modal && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <motion.div initial={{ scale:0.95 }} animate={{ scale:1 }} exit={{ scale:0.95 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1012] p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-white">Nouvel enregistrement RH</h3>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Agent</label>
              <select value={form.user_id} onChange={e => setForm(f => ({...f,user_id:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none">
                <option value="">— Sélectionner —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({...f,type:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none">
                  {HR_TYPES.map(t => <option key={t} value={t}>{HR_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f,date:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Titre *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Montant (FCFA)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({...f,amount:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">Annuler</button>
              <button onClick={save} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition">Enregistrer</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// ── Missions ──────────────────────────────────────────────────────────────────
export function MissionsPage() {
  const { user } = useAuth(); const isAdmin = hasRole(user,"admin");
  const [missions,setMissions] = useState<Mission[]>([]);
  const [agents,setAgents]     = useState<BureauUser[]>([]);
  const [modal, setModal]      = useState(false);
  const [form,  setForm]       = useState({ title:"",description:"",assigned_to:"",status:"a_faire",due_date:"" });

  const load = () => Promise.all([missionsApi.list(),usersApi.list()]).then(([m,u]) => { setMissions(m); setAgents(u); });
  useEffect(() => { load(); }, []);

  const statusColor: Record<string,string> = { a_faire:"text-white/40",en_cours:"text-lime",termine:"text-violet" };
  const statusLabel: Record<string,string> = { a_faire:"À faire",en_cours:"En cours",termine:"Terminé" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-white">Missions</h1><p className="text-sm text-white/40 mt-0.5">Tâches assignées à l'équipe</p></div>
        {isAdmin && <button onClick={() => setModal(true)} className="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95">+ Assigner</button>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {missions.map(m => (
          <div key={m.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{m.title}</p>
                {m.project_name && <p className="text-xs text-white/40 mt-0.5">📁 {m.project_name}</p>}
              </div>
              <select value={m.status} onChange={async e => { await missionsApi.update(m.id,{...m,status:e.target.value as Mission["status"]}); load(); }}
                className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase bg-transparent cursor-pointer ${statusColor[m.status]} border-white/10 focus:outline-none`}>
                {Object.entries(statusLabel).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {m.description && <p className="mt-2 text-xs text-white/50">{m.description}</p>}
            <div className="flex items-center justify-between mt-3 text-xs text-white/35">
              <span>→ {m.assignee_name}</span>
              {m.due_date && <span>📅 {new Date(m.due_date).toLocaleDateString("fr-FR")}</span>}
              {isAdmin && <button onClick={async () => { if (confirm("Supprimer ?")) { await missionsApi.delete(m.id); load(); } }} className="text-red-400 hover:text-red-300">×</button>}
            </div>
          </div>
        ))}
      </div>
      <AnimatePresence>{modal && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <motion.div initial={{ scale:0.95 }} animate={{ scale:1 }} exit={{ scale:0.95 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1012] p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-white">Assigner une mission</h3>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Titre *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Description</label>
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({...f,description:e.target.value}))} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Assigner à *</label>
                <select value={form.assigned_to} onChange={e => setForm(f => ({...f,assigned_to:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none">
                  <option value="">— Sélectionner —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Échéance</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f,due_date:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">Annuler</button>
              <button onClick={async () => { if (!form.title||!form.assigned_to) return alert("Champs requis"); await missionsApi.create({...form,assigned_to:+form.assigned_to}); setModal(false); load(); }} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition">Assigner</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// ── Feedback ──────────────────────────────────────────────────────────────────
export function RetoursPage() {
  const { user } = useAuth(); const isAdmin = hasRole(user,"admin");
  const [feedbacks,setFeedbacks] = useState<Feedback[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ client_name:"",rating:"5",comment:"",category:"satisfaction",status:"nouveau" });

  const load = () => feedbackApi.list().then(setFeedbacks).catch(() => {});
  useEffect(() => { load(); }, []);

  const statusColor: Record<string,string> = { nouveau:"text-coral",traite:"text-lime",archive:"text-white/30" };
  const stars = (n?: number) => n ? "★".repeat(n) + "☆".repeat(5-n) : "–";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="font-display text-2xl font-bold text-white">Retours clients</h1><p className="text-sm text-white/40 mt-0.5">{feedbacks.length} retour{feedbacks.length>1?"s":""}</p></div>
        {isAdmin && <button onClick={() => setModal(true)} className="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95">+ Ajouter</button>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {feedbacks.map(f => (
          <div key={f.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{f.client_name}</p>
                {f.project_name && <p className="text-xs text-white/40">📁 {f.project_name}</p>}
              </div>
              <span className={`text-xs font-bold uppercase ${statusColor[f.status]}`}>{f.status}</span>
            </div>
            <p className="mt-2 text-lg text-amber-400 tracking-widest">{stars(f.rating)}</p>
            {f.comment && <p className="mt-2 text-sm text-white/60 italic">"{f.comment}"</p>}
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-white/30">{new Date(f.created_at).toLocaleDateString("fr-FR")}</span>
              {isAdmin && f.status !== "traite" && <button onClick={() => feedbackApi.update(f.id,"traite").then(load)} className="text-xs text-lime hover:underline">Marquer traité</button>}
            </div>
          </div>
        ))}
      </div>
      <AnimatePresence>{modal && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <motion.div initial={{ scale:0.95 }} animate={{ scale:1 }} exit={{ scale:0.95 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1012] p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-bold text-white">Nouveau retour client</h3>
            <div><label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Client *</label><input value={form.client_name} onChange={e => setForm(f => ({...f,client_name:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" /></div>
            <div><label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Note (1-5)</label><input type="number" min="1" max="5" value={form.rating} onChange={e => setForm(f => ({...f,rating:e.target.value}))} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" /></div>
            <div><label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Commentaire</label><textarea rows={3} value={form.comment} onChange={e => setForm(f => ({...f,comment:e.target.value}))} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" /></div>
            <div className="flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">Annuler</button>
              <button onClick={async () => { await feedbackApi.create({...form,rating:+form.rating}); setModal(false); load(); }} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition">Enregistrer</button>
            </div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { user, refresh } = useAuth();
  const [form, setForm]   = useState({ full_name: user?.full_name??"", username: user?.username??"", email: user?.email??"" });
  const [pwForm, setPwForm] = useState({ old_password:"", new_password:"", confirm:"" });
  const [msg, setMsg]     = useState("");
  const [err, setErr]     = useState("");

  async function saveProfile() {
    try { await authApi.updateProfile(form); setMsg("Profil mis à jour !"); refresh(); setTimeout(() => setMsg(""),3000); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erreur"); }
  }

  async function changePw() {
    if (pwForm.new_password !== pwForm.confirm) { setErr("Les mots de passe ne correspondent pas"); return; }
    if (pwForm.new_password.length < 6) { setErr("Minimum 6 caractères"); return; }
    try { await authApi.changePassword(pwForm.old_password, pwForm.new_password); setMsg("Mot de passe modifié !"); setPwForm({old_password:"",new_password:"",confirm:""}); setTimeout(() => setMsg(""),3000); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Erreur"); }
  }

  const input = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-coral/50 focus:outline-none transition";
  const label = "block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5";
  const section = "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-5";

  return (
    <div className="max-w-lg space-y-6">
      <div><h1 className="font-display text-2xl font-bold text-white">Mon profil</h1><p className="text-sm text-white/40 mt-0.5">Gérez vos informations personnelles</p></div>
      {msg && <div className="text-sm text-lime bg-lime/10 border border-lime/20 rounded-xl px-4 py-3">{msg}</div>}
      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{err}</div>}

      <div className={section}>
        <h2 className="font-bold text-white">Informations</h2>
        <div><label className={label}>Nom complet</label><input value={form.full_name} onChange={e => setForm(f => ({...f,full_name:e.target.value}))} className={input} /></div>
        <div><label className={label}>Identifiant</label><input value={form.username} onChange={e => setForm(f => ({...f,username:e.target.value}))} className={input} /></div>
        <div><label className={label}>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({...f,email:e.target.value}))} className={input} /></div>
        <button onClick={saveProfile} className="w-full rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition">Enregistrer les modifications</button>
      </div>

      <div className={section}>
        <h2 className="font-bold text-white">Changer le mot de passe</h2>
        <div><label className={label}>Mot de passe actuel</label><input type="password" value={pwForm.old_password} onChange={e => setPwForm(f => ({...f,old_password:e.target.value}))} className={input} /></div>
        <div><label className={label}>Nouveau mot de passe</label><input type="password" value={pwForm.new_password} onChange={e => setPwForm(f => ({...f,new_password:e.target.value}))} className={input} /></div>
        <div><label className={label}>Confirmer</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({...f,confirm:e.target.value}))} className={input} /></div>
        <button onClick={changePw} className="w-full rounded-xl bg-violet py-3 text-sm font-bold text-white hover:brightness-110 transition">Changer le mot de passe</button>
      </div>
    </div>
  );
}
