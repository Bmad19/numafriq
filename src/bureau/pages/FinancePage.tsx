import { useEffect, useState } from "react";
import { financeApi, casesApi, type FinanceOverview } from "../api";

const fmtMoney = (n: number, ccy = "XOF") =>
  `${Math.round(Number(n) || 0).toLocaleString("fr-FR")} ${ccy === "XOF" ? "FCFA" : ccy}`;

export function FinancePage() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true); setError(null);
    financeApi.overview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const maxTrend = data ? Math.max(1, ...data.trend.map((t) => t.amount)) : 1;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display text-white">Tableau de bord financier</h1>
          <p className="text-sm text-white/55">Vue cabinet : factures, encaissements, prévisions, recouvrement.</p>
        </div>
        <button onClick={load} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5">
          ↻ Actualiser
        </button>
      </header>

      {loading && <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">Chargement…</div>}
      {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi label="Facturé total" value={fmtMoney(data.kpis.total_invoiced)} />
            <Kpi label="Encaissé total" value={fmtMoney(data.kpis.total_collected)} accent="emerald" />
            <Kpi label="Solde dû" value={fmtMoney(data.kpis.total_outstanding)} accent={data.kpis.total_outstanding > 0 ? "amber" : "white"} />
            <Kpi label="Factures en retard" value={String(data.kpis.overdue_count)} accent={data.kpis.overdue_count > 0 ? "red" : "white"} />
            <Kpi label="Montant en retard" value={fmtMoney(data.kpis.overdue_amount)} accent={data.kpis.overdue_amount > 0 ? "red" : "white"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="font-semibold text-white mb-3">Encaissements mensuels (3 derniers + en cours)</h2>
              <div className="flex items-end justify-between gap-3 h-40">
                {data.trend.map((t) => (
                  <div key={t.label} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                    <div className="text-[10px] text-white/70 font-medium">{fmtMoney(t.amount).replace(" FCFA", "")}</div>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-coral/60 to-coral/30 border-t-2 border-coral"
                      style={{ height: `${Math.max(4, (t.amount / maxTrend) * 100)}%` }}
                    />
                    <div className="text-[10px] text-white/55">{t.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="font-semibold text-white mb-3">Prévisions encaissement (6 prochains mois)</h2>
              {data.forecast.length === 0 ? (
                <p className="text-sm text-white/55 italic">Aucune facture à venir avec échéance définie.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.forecast.map((f) => (
                    <li key={f.month} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                      <span className="text-white/80">{f.month}</span>
                      <span className="font-semibold text-white">{fmtMoney(f.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-semibold text-white mb-3">Top dossiers à recouvrer</h2>
            {data.top_to_collect.length === 0 ? (
              <p className="text-sm text-white/55 italic">Aucun retard à signaler.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs text-white/55 uppercase tracking-wide">
                    <tr>
                      <th className="text-left py-2 pr-3">Dossier</th>
                      <th className="text-right py-2 px-3">Factures</th>
                      <th className="text-right py-2 pl-3">Solde dû</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.top_to_collect.map((t) => (
                      <tr key={t.project_id}>
                        <td className="py-2 pr-3 text-white">
                          <div className="font-medium">{t.case_name ?? "—"}</div>
                          <div className="text-xs text-white/55">{t.case_number ?? "(sans n°)"}</div>
                        </td>
                        <td className="py-2 px-3 text-right text-white/80">{t.count}</td>
                        <td className="py-2 pl-3 text-right font-semibold text-coral">{fmtMoney(t.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-semibold text-white mb-3">Factures en retard ({data.overdue.length})</h2>
            {data.overdue.length === 0 ? (
              <p className="text-sm text-white/55 italic">🎉 Aucune facture en retard.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs text-white/55 uppercase tracking-wide">
                    <tr>
                      <th className="text-left py-2 pr-3">N°</th>
                      <th className="text-left py-2 px-3">Dossier</th>
                      <th className="text-left py-2 px-3">Titre</th>
                      <th className="text-right py-2 px-3">Échéance</th>
                      <th className="text-right py-2 px-3">Retard</th>
                      <th className="text-right py-2 px-3">Restant</th>
                      <th className="text-right py-2 pl-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.overdue.map((o) => (
                      <tr key={o.id}>
                        <td className="py-2 pr-3 font-mono text-xs text-white/80">{o.invoice_number ?? `#${o.id}`}</td>
                        <td className="py-2 px-3 text-white/80">
                          <div className="text-xs">{o.case_number ?? "—"}</div>
                          <div className="text-white">{o.case_name ?? "—"}</div>
                        </td>
                        <td className="py-2 px-3 text-white/80">{o.title}</td>
                        <td className="py-2 px-3 text-right text-white/70">{new Date(o.due_date).toLocaleDateString("fr-FR")}</td>
                        <td className="py-2 px-3 text-right text-red-300 font-semibold">{o.days_overdue} j</td>
                        <td className="py-2 px-3 text-right font-semibold text-coral">{fmtMoney(o.remaining, o.currency)}</td>
                        <td className="py-2 pl-3 text-right">
                          <button
                            onClick={() => casesApi.downloadInvoicePdf(o.id, `facture-${o.invoice_number ?? o.id}.pdf`).catch((e) => alert(String(e)))}
                            className="text-xs rounded-md border border-white/15 px-2 py-1 text-white/80 hover:bg-white/5"
                            title="Télécharger la facture en PDF"
                          >
                            ↓ PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, accent = "white" }: { label: string; value: string; accent?: "white" | "emerald" | "amber" | "red" }) {
  const color = {
    white: "text-white",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    red: "text-red-300",
  }[accent];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-white/55">{label}</div>
      <div className={`mt-1 text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
