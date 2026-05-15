import { useEffect, useState } from "react";
import { accountingApi, type AccountingEntry, type AccountingStats } from "../api";
import { useAuth, hasRole } from "../BureauContext";
import { motion, AnimatePresence } from "framer-motion";

const cats = { recette: ["Projet","Maintenance","Consultation","Autre"], depense: ["Logiciels","Hébergement","Salaire","Matériel","Marketing","Autre"] };

export function ComptabilitePage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "admin");
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [stats, setStats]     = useState<AccountingStats | null>(null);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ type:"recette",category:"Projet",amount:"",description:"",date:new Date().toISOString().split("T")[0] });
  const [msg, setMsg]         = useState("");

  const load = async () => { const [e,s] = await Promise.all([accountingApi.list(), accountingApi.stats()]); setEntries(e); setStats(s); };
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.amount || !form.description) return alert("Champs requis manquants");
    await accountingApi.create({ ...form, amount: +form.amount });
    setMsg("Écriture enregistrée !"); setModal(false); load();
    setTimeout(() => setMsg(""), 3000);
  }

  const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Comptabilité</h1>
          <p className="text-sm text-white/40 mt-0.5">Suivi financier de l'agence</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal(true)} className="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition active:scale-95">
            + Nouvelle écriture
          </button>
        )}
      </div>

      {msg && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-lime bg-lime/10 border border-lime/20 rounded-xl px-4 py-3">{msg}</motion.div>}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Recettes",  value: fmt(stats?.recettes ?? 0), color: "text-lime",   border: "border-lime/20" },
          { label: "Dépenses",  value: fmt(stats?.depenses ?? 0), color: "text-coral", border: "border-coral/25" },
          { label: "Solde net", value: fmt(stats?.solde ?? 0),    color: stats && stats.solde >= 0 ? "text-white" : "text-coral", border: "border-white/10" },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border ${k.border} bg-white/[0.02] p-5`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">{k.label}</p>
            <p className={`font-display text-xl font-extrabold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] border-b border-white/[0.06]">
            <tr>{["Date","Type","Catégorie","Description","Montant","Par","Actions"].map(h => (
              <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white/40">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-white/[0.02] transition">
                <td className="px-5 py-3 text-white/50 text-xs">{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-bold uppercase rounded-full border px-2 py-0.5 ${e.type==="recette" ? "text-lime border-lime/20 bg-lime/5" : "text-coral border-coral/25 bg-coral/5"}`}>
                    {e.type}
                  </span>
                </td>
                <td className="px-5 py-3 text-white/60 text-xs">{e.category}</td>
                <td className="px-5 py-3 text-white/80">{e.description}</td>
                <td className={`px-5 py-3 font-bold ${e.type==="recette" ? "text-lime" : "text-coral"}`}>
                  {e.type==="recette" ? "+" : "–"}{e.amount.toLocaleString("fr-FR")}
                </td>
                <td className="px-5 py-3 text-white/35 text-xs">{e.created_by_name}</td>
                <td className="px-5 py-3">
                  {isAdmin && <button onClick={async () => { if (confirm("Supprimer ?")) { await accountingApi.delete(e.id); load(); } }}
                    className="text-xs text-coral hover:text-coral/80 transition">×</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && setModal(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1012] p-6 shadow-2xl">
              <h3 className="font-display text-lg font-bold text-white mb-5">Nouvelle écriture</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {(["recette","depense"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({...f,type:t,category:cats[t][0]}))}
                      className={`py-3 rounded-xl text-sm font-bold transition border ${form.type===t ? (t==="recette" ? "bg-lime/15 border-lime/30 text-lime" : "bg-coral/15 border-coral/30 text-coral") : "border-white/10 text-white/40"}`}>
                      {t === "recette" ? "✚ Recette" : "✖ Dépense"}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Catégorie</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f,category:e.target.value}))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none">
                    {cats[form.type as keyof typeof cats].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Description *</label>
                  <input value={form.description} onChange={e => setForm(f => ({...f,description:e.target.value}))}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-coral/50 focus:outline-none transition" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Montant (FCFA) *</label>
                    <input type="number" value={form.amount} onChange={e => setForm(f => ({...f,amount:e.target.value}))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm(f => ({...f,date:e.target.value}))}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModal(false)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/50 hover:text-white transition">Annuler</button>
                <button onClick={save} className="flex-1 rounded-xl bg-coral py-3 text-sm font-bold text-white hover:brightness-110 transition">Enregistrer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
