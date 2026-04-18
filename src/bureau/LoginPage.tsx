import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "./BureauContext";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try { await login(username.trim(), password); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Erreur de connexion"); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#08090b] flex items-center justify-center px-4">
      {/* Bouton retour site */}
      <a href="/" className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/50 backdrop-blur-xl transition hover:border-white/30 hover:text-white">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
          <path d="M10 12L6 8l4-4"/>
        </svg>
        Retour au site
      </a>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-coral/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h1v60H0zm60 0h-1v60h1zM0 0v1h60V0zm0 60v-1h60v1z\' fill=\'%23ffffff05\'/%3E%3C/svg%3E')]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="w-full max-w-md"
      >
        {/* Logo + title */}
        <div className="text-center mb-10">
          <img
            src="/numafriq-logo-adapted.png"
            alt="NumAfriq"
            className="h-20 w-auto object-contain mx-auto mb-5"
          />
          <h1 className="font-display text-2xl font-bold text-white">Espace Bureau</h1>
          <p className="mt-1 text-sm text-white/40">Accès réservé aux agents NUMAFRIQ</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">Identifiant</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="votre_identifiant" required autoComplete="username"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:border-coral/50 focus:outline-none focus:ring-1 focus:ring-coral/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">Mot de passe</label>
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input
                  type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-white/20 focus:border-coral/50 focus:outline-none focus:ring-1 focus:ring-coral/30 transition"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    {showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                {error}
              </motion.div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-coral to-violet py-4 text-sm font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Connexion…
                </span>
              ) : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Accès restreint aux agents NUMAFRIQ · Version {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
