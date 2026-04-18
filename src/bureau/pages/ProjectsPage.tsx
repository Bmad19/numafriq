import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi, usersApi, type Project, type BureauUser } from "../api";
import { useAuth, hasRole } from "../BureauContext";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  en_cours: { label: "En cours",  color: "text-lime   bg-lime/10   border-lime/20"   },
  termine:  { label: "Terminé",   color: "text-white  bg-white/5   border-white/10"  },
  en_pause: { label: "En pause",  color: "text-violet bg-violet/10 border-violet/20" },
  annule:   { label: "Annulé",    color: "text-red-400 bg-red-500/10 border-red-500/20" },
};
const PRIORITY_LABELS: Record<string, string> = {
  basse: "text-white/40", normale: "text-white/60", haute: "text-coral", urgente: "text-red-400 font-bold",
};

const empty: Partial<Project> = { name:"",client:"",description:"",status:"en_cours",priority:"normale",budget:0,deadline:"",progress:0 };

export function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents]     = useState<BureauUser[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<"create"|"edit"|null>(null);
  const [form, setForm]         = useState<Partial<Project>>(empty);
  const [filter, setFilter]     = useState("tous");
  const [msg, setMsg]           = useState("");

  async function load() {
    setLoading(true);
    const [p, u] = await Promise.all([projectsApi.list(), usersApi.list()]);
    setProjects(p); setAgents(u);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === "tous" ? projects : projects.filter(p => p.status === filter);

  async function save() {
    try {
      if (modal === "create") await projectsApi.create(form);
      else if (form.id) await projectsApi.update(form.id, form);
      setMsg("Projet enregistré !"); setModal(null); load();
      setTimeout(() => setMsg(""), 3000);
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erreur"); }
  }

  async function deleteProject(id: number) {
    if (!confirm("Supprimer ce projet ?")) return;
    await projectsApi.delete(id); load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Projets</h1>
          <p className="mt-0.5 text-sm text-white/40">{projects.length} projet{projects.length>1?"s":""} au total</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setForm(empty); setModal("create"); }}
            className="inline-flex items-center gap-2 rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95">
            <span>+</span> Nouveau projet
          </button>
        )}
      </div>

      {msg && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-lime bg-lime/10 border border-lime/20 rounded-xl px-4 py-3">{msg}</motion.div>}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[["tous","Tous"],["en_cours","En cours"],["termine","Terminés"],["en_pause","En pause"]].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${filter===v ? "bg-coral text-white" : "border border-white/10 text-white/50 hover:text-white"}`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center text-white/30 py-20">Chargement…</div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => {
            const st = STATUS_LABELS[p.status];
            return (
              <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col gap-4 hover:border-white/20 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{p.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{p.client}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${st.color}`}>{st.label}</span>
                </div>
                {p.description && <p className="text-sm text-white/50 line-clamp-2">{p.description}</p>}
                <div>
                  <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>Avancement</span><span className="font-bold text-white">{p.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-coral to-lime transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span className={PRIORITY_LABELS[p.priority]}>↑ {p.priority}</span>
                  <span>{p.budget ? `${(p.budget/1000).toFixed(0)}k FCFA` : "–"}</span>
                  {p.agent_name && <span className="text-violet/80">{p.agent_name}</span>}
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => { setForm(p); setModal("edit"); }}
                      className="flex-1 rounded-xl border border-white/10 py-2 text-xs text-white/50 hover:text-white hover:border-white/25 transition">
                      Modifier
                    </button>
                    <button onClick={() => deleteProject(p.id)}
                      className="rounded-xl border border-red-500/20 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition">
                      ×
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && setModal(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1012] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <h3 className="font-display text-lg font-bold text-white mb-5">
                {modal==="create" ? "Nouveau projet" : "Modifier le projet"}
              </h3>
              <div className="space-y-4">
                {([["name","Nom du projet *","text"],["client","Client *","text"],["description","Description","text"],["deadline","Deadline","date"]] as const).map(([key,label,type]) => (
                  <div key={key}>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">{label}</label>
                    <input type={type} value={(form as Record<string,unknown>)[key] as string ?? ""} onChange={e => setForm(f => ({...f,[key]:e.target.value}))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-coral/50 focus:outline-none transition" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Statut</label>
                    <select value={form.status} onChange={e => setForm(f => ({...f,status:e.target.value as Project["status"]}))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none">
                      {Object.entries(STATUS_LABELS).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Priorité</label>
                    <select value={form.priority} onChange={e => setForm(f => ({...f,priority:e.target.value as Project["priority"]}))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none">
                      {["basse","normale","haute","urgente"].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Budget (FCFA)</label>
                    <input type="number" value={form.budget ?? 0} onChange={e => setForm(f => ({...f,budget:+e.target.value}))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Avancement %</label>
                    <input type="number" min="0" max="100" value={form.progress ?? 0} onChange={e => setForm(f => ({...f,progress:+e.target.value}))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Agent responsable</label>
                  <select value={form.assigned_to ?? ""} onChange={e => setForm(f => ({...f,assigned_to:+e.target.value||undefined}))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none">
                    <option value="">— Non assigné —</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">Annuler</button>
                <button onClick={save} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition">Enregistrer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
