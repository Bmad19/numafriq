import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, hasRole } from "./BureauContext";
import { leadsApi, agentClientApi, userHasPermission, type PermissionKey } from "./api";

type NavEntry = {
  to: string;
  label: string;
  icon: React.ReactNode;
  min: "agent" | "admin" | "super_admin";
  /** Permission requise (en plus du rôle). Si absent, n'est filtré que par le rôle. */
  perm?: PermissionKey;
  badge?: string;
};

const NAV: NavEntry[] = [
  { to: "/bureau/overview",      label: "Vue d'ensemble",  icon: <GridIcon />,    min: "agent" },
  { to: "/bureau/leads",         label: "Demandes",        icon: <LeadsIcon />,   min: "agent",       perm: "leads",      badge: "leads" },
  { to: "/bureau/assistant",     label: "Assistant",       icon: <SparkIcon />,   min: "agent",       perm: "assistant" },
  { to: "/bureau/projets",       label: "Projets",         icon: <FolderIcon />,  min: "agent",       perm: "projects" },
  { to: "/bureau/missions",      label: "Mes missions",    icon: <TaskIcon />,    min: "agent",       perm: "missions" },
  { to: "/bureau/clients",       label: "Messages clients",icon: <InboxIcon />,   min: "agent",       perm: "clients",    badge: "clients" },
  { to: "/bureau/chat",          label: "Chat interne",    icon: <ChatIcon />,    min: "agent",       perm: "chat" },
  { to: "/bureau/rh",            label: "Ressources Hum.", icon: <PeopleIcon />,  min: "admin",       perm: "hr" },
  { to: "/bureau/comptabilite",  label: "Comptabilité",    icon: <ChartIcon />,   min: "admin",       perm: "accounting" },
  { to: "/bureau/retours",       label: "Retours clients", icon: <StarIcon />,    min: "admin",       perm: "feedback" },
  { to: "/bureau/offres-emploi", label: "Offres d'emploi", icon: <BriefcaseIcon />, min: "admin",     perm: "job_offers" },
  { to: "/bureau/blog",          label: "Blog",            icon: <PencilIcon />,  min: "admin",       perm: "blog" },
  { to: "/bureau/mailbox",       label: "Boîte mail LWS",  icon: <MailIcon />,    min: "super_admin", perm: "mailbox" },
  { to: "/bureau/equipe",        label: "Équipe",          icon: <ShieldIcon />,  min: "super_admin" },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [newLeads, setNewLeads]     = useState(0);
  const [newClients, setNewClients] = useState(0);

  useEffect(() => {
    function fetchBadges() {
      leadsApi.stats().then(s => setNewLeads(s.nouveau)).catch(() => {});
      agentClientApi.conversations().then(convs => {
        setNewClients(convs.reduce((sum, c) => sum + (c.unread ?? 0), 0));
      }).catch(() => {});
    }
    fetchBadges();
    const t = setInterval(fetchBadges, 20000);
    return () => clearInterval(t);
  }, []);

  const visibleNav = NAV.filter(n => hasRole(user, n.min) && (!n.perm || userHasPermission(user, n.perm)));

  const roleLabel: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Administrateur",
    agent: "Agent",
  };
  const roleColor: Record<string, string> = {
    super_admin: "text-coral",
    admin: "text-lime",
    agent: "text-violet",
  };

  const isMobile = () => window.innerWidth < 768;

  // Ferme le sidebar en naviguant sur mobile
  function handleNavClick() {
    if (isMobile()) setSidebarOpen(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-ink text-white">

      {/* Overlay mobile — ferme le sidebar au tap */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -260, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -260, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="fixed md:relative z-40 shrink-0 flex flex-col h-full w-[260px] border-r border-white/[0.06] bg-ink md:bg-white/[0.02] overflow-hidden"
          >
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-coral to-violet text-white text-sm font-black">N</div>
              <div>
                <p className="text-sm font-bold text-white">Afrilex Conseil</p>
                <p className="text-[10px] text-white/35 uppercase tracking-wider">Bureau Interne</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
              {visibleNav.map(n => (
                <NavLink key={n.to} to={n.to} onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive ? "bg-coral/15 text-coral" : "text-white/50 hover:bg-white/[0.04] hover:text-white"
                    }`
                  }
                >
                  <span className="shrink-0">{n.icon}</span>
                  <span className="flex-1">{n.label}</span>
                  {n.badge === "leads" && newLeads > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">
                      {newLeads}
                    </span>
                  )}
                  {n.badge === "clients" && newClients > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-ink">
                      {newClients}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* User bottom */}
            <div className="p-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet/40 to-coral/40 text-sm font-bold text-white">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${roleColor[user?.role ?? '']}`}>
                    {roleLabel[user?.role ?? '']}
                  </p>
                </div>
              </div>
        <div className="mt-1 grid grid-cols-3 gap-1">
              <a href="/"
                className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] text-white/55 hover:bg-white/[0.04] hover:text-white transition">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5"><path d="M2 6.5L8 2l6 4.5V14H10v-4H6v4H2z"/></svg>
                Site
              </a>
              <NavLink to="/bureau/parametres"
                className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] text-white/40 hover:bg-white/[0.04] hover:text-white transition">
                <SettingsIcon />Profil
              </NavLink>
              <button onClick={logout}
                className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] text-white/40 hover:bg-coral/10 hover:text-coral transition">
                <LogoutIcon />Déco.
              </button>
            </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 border-b border-white/[0.06] px-6 shrink-0 bg-white/[0.01]">
          <button onClick={() => setSidebarOpen(v => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white transition">
            <MenuIcon />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-lime/20 bg-lime/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-lime animate-pulse" />
              <span className="text-[11px] font-semibold text-lime/80">Connecté</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function GridIcon()   { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function LeadsIcon()  { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function FolderIcon() { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>; }
function TaskIcon()   { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>; }
function ChatIcon()   { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>; }
function PeopleIcon() { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function ChartIcon()  { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>; }
function StarIcon()   { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>; }
function ShieldIcon() { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function InboxIcon()  { return <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>; }
function SettingsIcon(){ return <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function LogoutIcon() { return <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function MenuIcon()   { return <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function SparkIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}
