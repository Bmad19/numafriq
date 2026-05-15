import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "./BureauContext";
import { authApi } from "./api";

export function ChangePasswordPage() {
  const { setMustChangePassword } = useAuth();
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 6) { setError("Minimum 6 caractères"); return; }
    if (newPw !== confirmPw) { setError("Les mots de passe ne correspondent pas"); return; }
    setError(""); setLoading(true);
    try {
      await authApi.changePassword("", newPw);
      setMustChangePassword(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <a href="/" className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/50 backdrop-blur-xl transition hover:border-white/30 hover:text-white">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M10 12L6 8l4-4"/></svg>
        Retour au site
      </a>
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-lime/10 blur-[120px]" />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }} className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-lime/15 border border-lime/30 text-lime text-2xl mb-4">🔐</div>
            <h2 className="font-display text-xl font-bold text-white">Changez votre mot de passe</h2>
            <p className="mt-2 text-sm text-white/45">Pour votre sécurité, veuillez définir un nouveau mot de passe personnel.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">Nouveau mot de passe</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 6 caractères" required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/45 focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30 transition" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">Confirmer le mot de passe</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Répétez le mot de passe" required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/45 focus:border-lime/50 focus:outline-none focus:ring-1 focus:ring-lime/30 transition" />
            </div>
            {error && <p className="text-sm text-coral bg-coral/10 border border-coral/25 rounded-xl px-4 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-lime py-4 text-sm font-bold text-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50">
              {loading ? "Enregistrement…" : "Confirmer le nouveau mot de passe →"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
