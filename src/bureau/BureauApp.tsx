import { Routes, Route, Navigate } from "react-router-dom";
import { BureauProvider, useAuth } from "./BureauContext";
import { LoginPage } from "./LoginPage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { DashboardLayout } from "./DashboardLayout";
import { OverviewPage } from "./pages/OverviewPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ChatPage } from "./pages/ChatPage";
import { ComptabilitePage } from "./pages/ComptabilitePage";
import { EquipePage } from "./pages/EquipePage";
import { MissionsPage, RetoursPage, SettingsPage } from "./pages/OtherPages";
import { HRPage } from "./pages/HRPage";
import { ClientMessagesPage } from "./pages/ClientMessagesPage";
import { LeadsPage } from "./pages/LeadsPage";
import { AgentAssistantPage } from "./pages/AgentAssistantPage";
import { JobOffersAdminPage } from "./pages/JobOffersAdminPage";
import { BlogAdminPage } from "./pages/BlogAdminPage";
import { MailboxPage } from "./pages/MailboxPage";
import { InboxPage } from "./pages/InboxPage";

function BureauInner() {
  const { user, loading, mustChangePassword } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-coral" />
          <p className="text-sm text-white/55">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  if (mustChangePassword) return <ChangePasswordPage />;

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview"      element={<OverviewPage />} />
        <Route path="projets"       element={<ProjectsPage />} />
        <Route path="missions"      element={<MissionsPage />} />
        <Route path="chat"          element={<ChatPage />} />
        <Route path="rh"            element={<HRPage />} />
        <Route path="comptabilite"  element={<ComptabilitePage />} />
        <Route path="retours"       element={<RetoursPage />} />
        <Route path="clients"       element={<ClientMessagesPage />} />
        <Route path="inbox"         element={<InboxPage />} />
        <Route path="leads"         element={<Navigate to="/bureau/inbox" replace />} />
        <Route path="leads-legacy"  element={<LeadsPage />} />
        <Route path="assistant"      element={<AgentAssistantPage />} />
        <Route path="offres-emploi" element={<JobOffersAdminPage />} />
        <Route path="blog"          element={<BlogAdminPage />} />
        <Route path="mailbox"       element={<MailboxPage />} />
        <Route path="equipe"        element={<EquipePage />} />
        <Route path="parametres"    element={<SettingsPage />} />
        <Route path="*"             element={<Navigate to="overview" replace />} />
      </Route>
    </Routes>
  );
}

export function BureauApp() {
  return (
    <BureauProvider>
      <BureauInner />
    </BureauProvider>
  );
}
