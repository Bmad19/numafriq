import { useEffect, useRef, useState } from "react";
import { assistantApi } from "../api";

type Msg = { role: "user" | "assistant"; content: string };

const card =
  "rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm shadow-[0_18px_60px_-30px_rgba(0,0,0,0.75)]";

const suggestions = [
  "Check-list pièces à constituer pour contentieux OHADA générique",
  "Plan de défense succinct sur litige résolution de contrat commerce",
  "Questions préalables avant rédiger une mise en demeure",
];

const dossFields: Array<{ key: string; label: string; placeholder: string }> = [
  { key: "reference", label: "Réf interne dossier", placeholder: "Ex. LEX-2026-084" },
  { key: "client", label: "Client représenté", placeholder: "" },
  { key: "demandeur", label: "Demandeur / autre partie", placeholder: "" },
  { key: "juridiction", label: "Juridiction / instance prévue", placeholder: "" },
  { key: "resume_faits", label: "Résumé faits en 10 lignes max", placeholder: "" },
  { key: "pieces", label: "Principaux éléments de preuve", placeholder: "Contrats, PV, échanges écrits…" },
  {
    key: "memo_litige",
    label: "Synopsis litige (si pas de résumé faits)",
    placeholder: "Version courte pour l’IA si le champ résumé est vide…",
  },
  { key: "theses_principales", label: "Thèses / moyens envisagés", placeholder: "" },
  { key: "points_de_droit", label: "Points de droit (OHADA / national)", placeholder: "" },
  { key: "conclusions_souhaitees", label: "Conclusions souhaitées", placeholder: "" },
  { key: "objectif", label: "Objectif procédural", placeholder: "Rejet demande / annulation titre / désistement…" },
  { key: "contraintes_delais", label: "Échéances / contraintes", placeholder: "" },
];

export function AgentAssistantPage() {
  const [mode, setMode] = useState<"assist" | "memo_defense">("assist");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Bonjour — je suis votre copilote de rédaction et de préparation de dossiers. Précisez faits juridiques, pièces déjà disponibles et objectif stratégique. Les sorties IA restent au stade projet et doivent être validées par votre responsable dossier avant envoi.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [dossier, setDossier] = useState<Record<string, string>>(() =>
    dossFields.reduce<Record<string, string>>((a, b) => {
      a[b.key] = "";
      return a;
    }, {})
  );

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submit(next: Msg[]) {
    setLoading(true);
    setErr("");
    try {
      const res = await assistantApi.chat(next, mode, mode === "memo_defense" ? dossier : undefined);
      const content = (res.reply ?? res.message) || "";
      setMessages([...next, { role: "assistant", content }]);
    } catch (e: unknown) {
      setErr((e as Error).message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function sendUser() {
    const t = input.trim();
    if (!t || loading) return;
    const next = [...messages, { role: "user" as const, content: t }];
    setMessages(next);
    setInput("");
    await submit(next);
  }

  async function quickPick(s: string) {
    if (loading) return;
    const next = [...messages, { role: "user" as const, content: s }];
    setMessages(next);
    await submit(next);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 pb-24 lg:flex-row">
      <section className="flex-[1.3] space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Assistant dossiers</h1>
          <p className="mt-2 max-w-xl text-sm text-white/45">
            Pensé comme un second œil sur les plans d’argumentation, annexes méthodiques et gabarits d’écritures. La base locale regroupe vos synthèses OHADA &
            droit des affaires (fichiers <code className="text-lime">api/bureau/kb</code>).
          </p>
        </div>

        <div className={`${card} border-amber-500/15 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-5`}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-200/80">Limite procédure & déontologie</p>
          <p className="mt-3 text-sm leading-relaxed text-amber-100/70">
            Les réponses peuvent contenir erreurs ou omissions. Vérifiez toujours la version officielle des textes OHADA ou nationaux, la cartographie processsuelle locale et le mandat /
            périmètre barreaux applicables avant dépôt d’écrit ou audience.
          </p>
        </div>

        <div className={`${card} border p-0 overflow-hidden flex flex-col h-[calc(100vh-12rem)] max-h-[640px]`}>
          <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-5 py-3 bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setMode("assist")}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                mode === "assist" ? "bg-coral text-white" : "border border-white/10 text-white/40 hover:border-white/30"
              }`}
            >
              Mode analyse
            </button>
            <button
              type="button"
              onClick={() => setMode("memo_defense")}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                mode === "memo_defense" ? "bg-violet/90 text-ink" : "border border-white/10 text-white/40 hover:border-white/30"
              }`}
            >
              Brouillon mémoire défense
            </button>
            <span className="hidden sm:inline-flex text-[10px] text-white/55">
              Llama‑3.3 70b (Groq) · clé serveur obligatoire
            </span>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-8 border-coral/20 bg-coral/[0.09] text-mist"
                    : "mr-8 border-white/[0.08] bg-white/[0.04] text-mist/80 whitespace-pre-wrap"
                }`}
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  {m.role === "user" ? "Vous (agent)" : "Assistant dossiers"}
                </p>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-8 rounded-2xl border border-white/[0.08] px-4 py-3">
                <div className="flex gap-1.5 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-lime [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-lime [animation-delay:140ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-lime [animation-delay:280ms]" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {err ? <p className="px-5 py-3 text-xs text-coral/90">{err}</p> : null}

          <footer className="border-t border-white/[0.06] p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => quickPick(s)}
                  disabled={loading}
                  className="rounded-full border border-white/[0.1] px-3 py-1.5 text-[11px] text-white/50 transition hover:border-lime/30 hover:text-lime disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Décriviez le problème dossier avec faits précis..."
                rows={2}
                className="flex-1 resize-none rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-lime/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => sendUser()}
                disabled={loading || !input.trim()}
                className="shrink-0 self-end rounded-2xl bg-lime px-5 py-3 text-xs font-bold text-ink hover:brightness-110 disabled:opacity-40"
              >
                Envoyer
              </button>
            </div>
          </footer>
        </div>
      </section>

      {mode === "memo_defense" && (
        <aside className="lg:w-[360px] shrink-0 space-y-5">
          <div className={card}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Bloc-notes dossier IA</p>
            <p className="mt-3 text-xs text-white/45">
              Renseigner avant la génération : les champs peuvent voyager dans les instructions système (non stockés automatiquement côté serveur).
            </p>
          </div>
          <div className={`${card} space-y-4 p-6`}>
            {dossFields.map((f) => (
              <label key={f.key} className="block space-y-1">
                <span className="text-[11px] font-semibold text-white/40">{f.label}</span>
                <input
                  value={dossier[f.key]}
                  placeholder={f.placeholder}
                  onChange={(e) => setDossier((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-violet/40 focus:outline-none"
                />
              </label>
            ))}
            <p className="text-[11px] text-white/35">
              Puis conversez comme d’habitude : le dernier bloc « Envoyer » injecte aussi le champ « Résumé faits ».
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
