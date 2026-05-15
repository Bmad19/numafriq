import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { projectsApi, leadsApi, agentClientApi, type ProjectStats, type LeadStats, type Lead, type ClientConversation } from "../api";
import { useAuth } from "../BureauContext";

const card = "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm";

export function OverviewPage() {
  const { user } = useAuth();
  const [stats, setStats]             = useState<ProjectStats | null>(null);
  const [leadStats, setLeadStats]     = useState<LeadStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [convs, setConvs]             = useState<ClientConversation[]>([]);

  useEffect(() => {
    projectsApi.stats().then(setStats).catch(() => {});
    leadsApi.stats().then(setLeadStats).catch(() => {});
    leadsApi.list().then(l => setRecentLeads(l.slice(0, 5))).catch(() => {});
    agentClientApi.conversations().then(c => setConvs(c.filter(x => x.unread > 0).slice(0, 3))).catch(() => {});
  }, []);

  const totalUnreadClients = convs.reduce((s, c) => s + c.unread, 0);

  const kpis = [
    { label: "Projets actifs",        value: stats?.en_cours ?? "–",  color: "text-lime",   border: "border-lime/20",   to: "/bureau/projets" },
    { label: "Budget total (FCFA)",   value: stats ? `${(stats.budget_total/1_000_000).toFixed(1)}M` : "–", color: "text-white", border: "border-white/10", to: "/bureau/comptabilite" },
    { label: "Nouvelles demandes",    value: leadStats?.nouveau ?? "–", color: "text-coral", border: "border-coral/30",  alert: (leadStats?.nouveau ?? 0) > 0, to: "/bureau/inbox" },
    { label: "Messages clients",      value: totalUnreadClients || "–", color: "text-lime",  border: "border-lime/20",   alert: totalUnreadClients > 0, to: "/bureau/clients" },
  ];

  const timeAgo = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `Il y a ${min}min`;
    const h = Math.floor(min / 60);
    return h < 24 ? `Il y a ${h}h` : `Il y a ${Math.floor(h / 24)}j`;
  };

  const SERVICE_ICONS: Record<string, string> = {
    "site-vitrine": "🌐", ecommerce: "🛒", seo: "📈", branding: "🎨", app: "⚙️", autre: "💬",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Vue d'ensemble</h1>
        <p className="mt-1 text-sm text-white/40">Bonjour ! Voici l'état du bureau Afrilex Conseil.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <NavLink to={k.to}
              className={`${card} ${k.border} border flex flex-col gap-1 relative overflow-hidden hover:border-opacity-50 transition block`}>
              {k.alert && <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-coral animate-pulse" />}
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{k.label}</p>
              <p className={`font-display text-3xl font-extrabold ${k.color}`}>{k.value}</p>
            </NavLink>
          </motion.div>
        ))}
      </div>

      {/* Messages clients non-lus */}
      {convs.length > 0 && (
        <div className={`${card} border border-lime/20`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
              <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                Messages clients non-lus ({totalUnreadClients})
              </h2>
            </div>
            <NavLink to="/bureau/clients" className="text-xs font-semibold text-lime hover:underline">Voir tout →</NavLink>
          </div>
          <div className="space-y-2">
            {convs.map(c => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lime/30 to-lime/10 text-xs font-bold text-lime border border-lime/20">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                  {c.last_message && <p className="text-xs text-white/40 truncate">{c.last_message}</p>}
                </div>
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-ink">
                  {c.unread}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nouvelles demandes */}
      {recentLeads.length > 0 && (
        <div className={`${card} border border-coral/20`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-coral animate-pulse" />
              <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                Demandes récentes ({leadStats?.nouveau ?? 0} nouvelles)
              </h2>
            </div>
            <NavLink to="/bureau/inbox" className="text-xs font-semibold text-coral hover:underline">
              Voir tout →
            </NavLink>
          </div>
          <div className="space-y-2">
            {recentLeads.map((lead, i) => (
              <motion.div key={lead.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                <span className="text-lg shrink-0">{SERVICE_ICONS[lead.service ?? ""] ?? "📋"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
                  <p className="text-xs text-white/40 truncate">{lead.email}{lead.budget ? ` · ${lead.budget}` : ""}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lead.status === "nouveau" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-lime/25 bg-lime/10 px-2.5 py-0.5 text-[10px] font-bold text-lime uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />Nouveau
                    </span>
                  )}
                  <span className="text-xs text-white/48">{timeAgo(lead.created_at)}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <NavLink to="/bureau/inbox"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-coral/20 bg-coral/5 py-3 text-sm font-semibold text-coral hover:bg-coral/10 transition">
            Gérer toutes les demandes →
          </NavLink>
        </div>
      )}

      {/* Résumé rapide */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Projets terminés",  value: stats?.termine ?? "–",  color: "text-violet", icon: "✓", to: "/bureau/projets" },
          { label: "En pause",          value: stats?.en_pause ?? "–",  color: "text-violet", icon: "⏸", to: "/bureau/projets" },
          { label: "Total demandes",    value: leadStats?.total ?? "–", color: "text-white",  icon: "📋", to: "/bureau/inbox" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
            <NavLink to={s.to} className={`${card} flex items-center gap-4 hover:border-white/20 transition block`}>
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{s.label}</p>
                <p className={`font-display text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              </div>
            </NavLink>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
