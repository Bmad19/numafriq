// HR, Missions, Retours, Settings — pages compactes

// ── HR ────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { hrApi, usersApi, type HrRecord, type BureauUser } from "../api";
import { useAuth, hasRole } from "../BureauContext";
import { authApi } from "../api";
import { feedbackApi, type Feedback } from "../api";
import { missionsApi, type Mission } from "../api";
import { AnimatePresence, motion } from "framer-motion";

const HR_TYPES  = ["conge","absence","retard","prime","note"] as const;
const HR_LABELS: Record<string,string> = { conge:"Congé",absence:"Absence",retard:"Retard",prime:"Prime",note:"Note RH" };
const HR_ICONS:  Record<string,string> = { conge:"🏖️",absence:"❌",retard:"⏰",prime:"💰",note:"📋" };
const HR_COLORS: Record<string,string> = { conge:"text-lime bg-lime/10 border-lime/20",absence:"text-red-400 bg-red-500/10 border-red-500/20",retard:"text-orange-400 bg-orange-400/10 border-orange-400/20",prime:"text-violet bg-violet/10 border-violet/20",note:"text-white/60 bg-white/5 border-white/10" };
const HR_STATUS_COLORS: Record<string,string> = { en_attente:"text-orange-400 bg-orange-400/10 border-orange-400/20",approuve:"text-lime bg-lime/10 border-lime/20",refuse:"text-red-400 bg-red-500/10 border-red-500/20" };
const HR_STATUS_LABELS: Record<string,string> = { en_attente:"En attente",approuve:"Approuvé",refuse:"Refusé" };

type HrTab = "tous" | "conge" | "prime" | "absence" | "retard" | "note";

export function RHPage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");
  const [records, setRecords] = useState<HrRecord[]>([]);
  const [agents,  setAgents]  = useState<BureauUser[]>([]);
  const [tab,     setTab]     = useState<HrTab>("tous");
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");
  const [form, setForm] = useState({
    user_id: "", type: "conge" as typeof HR_TYPES[number],
    title: "", description: "", date: new Date().toISOString().split("T")[0],
    amount: "", status: "en_attente",
  });

  const load = () => Promise.all([hrApi.list(), usersApi.list()])
    .then(([r, u]) => { setRecords(r); setAgents(u); })
    .catch(() => {});

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.user_id || !form.title) return;
    setSaving(true);
    try {
      await hrApi.create({
        user_id: +form.user_id,
        type: form.type,
        title: form.title,
        description: form.description || undefined,
        date: form.date,
        amount: form.amount ? +form.amount : undefined,
        status: "en_attente",
      });
      setModal(false);
      setForm({ user_id:"",type:"conge",title:"",description:"",date:new Date().toISOString().split("T")[0],amount:"",status:"en_attente" });
      load();
    } finally { setSaving(false); }
  }

  async function approve(id: number, status: "approuve" | "refuse") {
    await hrApi.update(id, { status });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Supprimer cet enregistrement ?")) return;
    await hrApi.delete(id);
    load();
  }

  const filtered = records.filter(r => {
    if (tab !== "tous" && r.type !== tab) return false;
    if (search && !r.employee_name?.toLowerCase().includes(search.toLowerCase()) &&
        !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total:      records.length,
    en_attente: records.filter(r => r.status === "en_attente").length,
    approuve:   records.filter(r => r.status === "approuve").length,
    conges:     records.filter(r => r.type === "conge").length,
    primes:     records.filter(r => r.type === "prime").reduce((s, r) => s + (r.amount ?? 0), 0),
  };

  const inp = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-coral/50 focus:outline-none transition";
  const lbl = "block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5";

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Ressources Humaines</h1>
          <p className="text-sm text-white/40 mt-0.5">Gestion des congés, absences, primes et notes</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal(true)}
            className="shrink-0 rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95">
            + Nouvel enregistrement
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Total enregistrements", value: stats.total, color:"text-white", icon:"📊" },
          { label:"En attente", value: stats.en_attente, color:"text-orange-400", icon:"⏳" },
          { label:"Approuvés", value: stats.approuve, color:"text-lime", icon:"✅" },
          { label:"Primes versées", value: stats.primes.toLocaleString("fr-FR")+" FCFA", color:"text-violet", icon:"💰" },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{k.icon}</span>
              <p className="text-[11px] text-white/40 uppercase tracking-wider font-bold">{k.label}</p>
            </div>
            <p className={`text-2xl font-display font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres & recherche */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
          {(["tous","conge","absence","retard","prime","note"] as HrTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition capitalize ${
                tab === t ? "bg-coral/20 text-coral" : "text-white/40 hover:text-white/70"
              }`}>
              {t === "tous" ? "Tous" : HR_LABELS[t]}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un agent ou titre…"
          className="flex-1 min-w-[180px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-white/25 focus:border-coral/40 focus:outline-none transition"
        />
        <span className="text-xs text-white/30">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-sm">Aucun enregistrement correspondant</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                <tr>{["Agent","Type","Titre","Date","Montant","Statut","Actions"].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-white/35 whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet/60 to-coral/60 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {(r.employee_name ?? "?")[0].toUpperCase()}
                        </div>
                        <span className="text-white/80 font-medium">{r.employee_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${HR_COLORS[r.type]}`}>
                        <span>{HR_ICONS[r.type]}</span>{HR_LABELS[r.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-white/60 max-w-[160px] truncate">{r.title}</td>
                    <td className="px-5 py-3.5 text-white/40 text-xs whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString("fr-FR", { day:"numeric",month:"short",year:"numeric" })}
                    </td>
                    <td className="px-5 py-3.5 text-white/60 font-medium whitespace-nowrap">
                      {r.amount ? <span className="text-violet">{r.amount.toLocaleString("fr-FR")} <span className="text-xs text-white/40">FCFA</span></span> : <span className="text-white/25">–</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${HR_STATUS_COLORS[r.status]}`}>
                        {HR_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {isAdmin && (
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                          {r.status === "en_attente" && <>
                            <button onClick={() => approve(r.id, "approuve")}
                              className="rounded-lg bg-lime/10 border border-lime/20 text-lime text-xs px-2.5 py-1 hover:bg-lime/20 transition font-bold">
                              ✓ Approuver
                            </button>
                            <button onClick={() => approve(r.id, "refuse")}
                              className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-2.5 py-1 hover:bg-red-500/20 transition font-bold">
                              ✗ Refuser
                            </button>
                          </>}
                          <button onClick={() => remove(r.id)}
                            className="rounded-lg text-white/25 hover:text-red-400 text-xs px-1.5 py-1 hover:bg-red-500/10 transition">
                            🗑
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal création */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && setModal(false)}>
            <motion.div initial={{ scale:0.95, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.95 }}
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1012] shadow-2xl overflow-hidden">
              <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">Nouvel enregistrement RH</h3>
                <button onClick={() => setModal(false)} className="text-white/30 hover:text-white transition text-xl">×</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={lbl}>Agent concerné *</label>
                  <select value={form.user_id} onChange={e => setForm(f => ({...f,user_id:e.target.value}))} className={inp}>
                    <option value="">— Sélectionner un agent —</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name} ({a.role})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Type *</label>
                    <select value={form.type} onChange={e => setForm(f => ({...f,type:e.target.value as typeof HR_TYPES[number]}))} className={inp}>
                      {HR_TYPES.map(t => <option key={t} value={t}>{HR_ICONS[t]} {HR_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Date *</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({...f,date:e.target.value}))} className={inp} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Titre *</label>
                  <input value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))} placeholder="Ex : Congé annuel — semaine 18" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Description</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm(f => ({...f,description:e.target.value}))} placeholder="Détails supplémentaires…" className={inp + " resize-none"} />
                </div>
                {(form.type === "prime") && (
                  <div>
                    <label className={lbl}>Montant (FCFA)</label>
                    <input type="number" min="0" value={form.amount} onChange={e => setForm(f => ({...f,amount:e.target.value}))} placeholder="Ex : 50000" className={inp} />
                  </div>
                )}
              </div>
              <div className="border-t border-white/[0.07] px-6 py-4 flex gap-3">
                <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">
                  Annuler
                </button>
                <button onClick={save} disabled={saving || !form.user_id || !form.title}
                  className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition disabled:opacity-40">
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
