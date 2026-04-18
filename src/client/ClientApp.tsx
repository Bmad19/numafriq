import { Routes, Route, Navigate } from "react-router-dom";
import { ClientProvider, useClient } from "./ClientContext";
import { ClientAuthPage } from "./ClientAuthPage";
import { ClientDashboard } from "./ClientDashboard";

function ClientInner() {
  const { client, loading } = useClient();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-lime" />
          <p className="text-sm text-white/30">Chargement…</p>
        </div>
      </div>
    );
  }

  return client ? <ClientDashboard /> : <ClientAuthPage />;
}

export function ClientApp() {
  return (
    <ClientProvider>
      <Routes>
        <Route path="/*" element={<ClientInner />} />
      </Routes>
    </ClientProvider>
  );
}
