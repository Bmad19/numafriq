import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { SiteLayout } from "./layouts/SiteLayout";

// ── Lazy-load de TOUTES les pages — réduit le bundle initial de ~70% ──────────
const HomePage     = lazy(() => import("./pages/HomePage").then(m => ({ default: m.HomePage })));
const ServicesPage = lazy(() => import("./pages/ServicesPage").then(m => ({ default: m.ServicesPage })));
const WorkPage     = lazy(() => import("./pages/WorkPage").then(m => ({ default: m.WorkPage })));
const PricingPage  = lazy(() => import("./pages/PricingPage").then(m => ({ default: m.PricingPage })));
const AboutPage    = lazy(() => import("./pages/AboutPage").then(m => ({ default: m.AboutPage })));
const ContactPage  = lazy(() => import("./pages/ContactPage").then(m => ({ default: m.ContactPage })));
const LegalPage    = lazy(() => import("./pages/LegalPage").then(m => ({ default: m.LegalPage })));

const BureauApp = lazy(() => import("./bureau/BureauApp").then(m => ({ default: m.BureauApp })));
const ClientApp = lazy(() => import("./client/ClientApp").then(m => ({ default: m.ClientApp })));

// Loader pleine page (bureau/client)
function FullPageLoader({ color = "coral" }: { color?: "coral" | "lime" }) {
  return (
    <div className="min-h-screen bg-[#08090b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className={`h-10 w-10 animate-spin rounded-full border-2 border-white/10 ${color === "lime" ? "border-t-[#2aa8ff]" : "border-t-[#e61f2f]"}`} />
        <p className="text-sm text-white/30">Chargement…</p>
      </div>
    </div>
  );
}

// Loader discret inline pour les pages publiques (le layout reste visible)
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-coral" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ── Site public ─────────────────────────────────────────────────── */}
      <Route element={<SiteLayout />}>
        <Route index element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
        <Route path="/services"        element={<Suspense fallback={<PageLoader />}><ServicesPage /></Suspense>} />
        <Route path="/realisations"    element={<Suspense fallback={<PageLoader />}><WorkPage /></Suspense>} />
        <Route path="/tarifications"   element={<Suspense fallback={<PageLoader />}><PricingPage /></Suspense>} />
        <Route path="/apropos"         element={<Suspense fallback={<PageLoader />}><AboutPage /></Suspense>} />
        <Route path="/contact"         element={<Suspense fallback={<PageLoader />}><ContactPage /></Suspense>} />
        <Route path="/mentions-legales"   element={<Suspense fallback={<PageLoader />}><LegalPage title="Mentions légales" /></Suspense>} />
        <Route path="/confidentialite"    element={<Suspense fallback={<PageLoader />}><LegalPage title="Politique de confidentialité" /></Suspense>} />
      </Route>

      {/* ── Espace Bureau (chargé uniquement si /bureau/*) ──────────────── */}
      <Route
        path="/bureau/*"
        element={
          <Suspense fallback={<FullPageLoader color="coral" />}>
            <BureauApp />
          </Suspense>
        }
      />

      {/* ── Espace Client (chargé uniquement si /espace-client/*) ─────── */}
      <Route
        path="/espace-client/*"
        element={
          <Suspense fallback={<FullPageLoader color="lime" />}>
            <ClientApp />
          </Suspense>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
