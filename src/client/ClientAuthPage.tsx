import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "../components/BrandLogo";
import { useClient } from "./ClientContext";

type Tab = "login" | "register";

export function ClientAuthPage() {
  const { t } = useTranslation();
  const { login, register } = useClient();
  const [tab, setTab]       = useState<Tab>("login");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail]   = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [reg, setReg] = useState({ name: "", email: "", password: "", confirm: "", company: "", phone: "" });
  const setR = (k: string, v: string) => setReg(r => ({ ...r, [k]: v }));

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    if (reg.password !== reg.confirm) { setError("Les mots de passe ne correspondent pas"); setLoading(false); return; }
    try { await register({ name: reg.name, email: reg.email, password: reg.password, company: reg.company, phone: reg.phone }); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Erreur"); }
    finally { setLoading(false); }
  }

  const input = "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/45 focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30 transition";
  const label = "block text-[11px] font-bold uppercase tracking-widest text-white/62 mb-1.5";

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-4 py-12">
      <a href="/" className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/72 backdrop-blur-xl transition hover:border-white/30 hover:text-white">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M10 12L6 8l4-4"/></svg>
        Retour au site
      </a>
      {/* Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-lime/10 blur-[120px]" />
        <div className="absolute -bottom-40 right-1/4 h-[400px] w-[400px] rounded-full bg-violet/10 blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <BrandLogo variant="auth" className="mb-5 mx-auto" />
          <div className="inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/8 px-4 py-2 mb-4" style={{ background: "rgba(235,228,212,0.07)" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-lime">
              <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest text-lime">{t("nav.portailClient")}</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white">
            {tab === "login" ? "Connectez-vous" : "Créer un compte"}
          </h1>
          <p className="mt-2 text-sm text-white/65">
            {tab === "login"
              ? "Accédez à votre espace client Afrilex Conseil"
              : "Rejoignez l'espace client et suivez votre projet"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl border border-white/10 bg-white/[0.02] p-1 mb-6">
          {(["login", "register"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                tab === t ? "bg-lime text-ink shadow-md" : "text-white/62 hover:text-white"
              }`}>
              {t === "login" ? "Se connecter" : "Créer un compte"}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl shadow-2xl">
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2 rounded-xl border border-coral/25 bg-coral/10 px-4 py-3 text-sm text-coral" style={{ background: "rgba(236,200,90,0.14)" }}>
              ⚠️ {error}
            </motion.div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className={label}>Adresse email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" required className={input} /></div>
              <div><label className={label}>Mot de passe</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className={input} /></div>
              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-lime py-4 text-sm font-bold text-ink hover:brightness-110 transition active:scale-[0.98] disabled:opacity-50 mt-2">
                {loading ? "Connexion…" : "Se connecter →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div><label className={label}>Nom complet *</label><input value={reg.name} onChange={e => setR("name", e.target.value)} placeholder="Votre nom" required className={input} /></div>
              <div><label className={label}>Email *</label><input type="email" value={reg.email} onChange={e => setR("email", e.target.value)} placeholder="vous@email.com" required className={input} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Entreprise</label><input value={reg.company} onChange={e => setR("company", e.target.value)} placeholder="Ma société" className={input} /></div>
                <div><label className={label}>Téléphone</label><input value={reg.phone} onChange={e => setR("phone", e.target.value)} placeholder="+226 00 00 00" className={input} /></div>
              </div>
              <div><label className={label}>Mot de passe *</label><input type="password" value={reg.password} onChange={e => setR("password", e.target.value)} placeholder="Min. 6 caractères" required className={input} /></div>
              <div><label className={label}>Confirmer *</label><input type="password" value={reg.confirm} onChange={e => setR("confirm", e.target.value)} placeholder="Répéter le mot de passe" required className={input} /></div>
              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-lime py-4 text-sm font-bold text-ink hover:brightness-110 transition active:scale-[0.98] disabled:opacity-50 mt-2">
                {loading ? "Création…" : "Créer mon espace client →"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-white/48 mt-6">
          Afrilex Conseil · Cabinet juridique, fiscal et comptable
        </p>
      </motion.div>
    </div>
  );
}
