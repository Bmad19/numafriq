import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { ChatWidget } from "../components/chat/ChatWidget";
import { WhatsAppFloat } from "../components/WhatsAppFloat";

// Remonte en haut de page à chaque changement de route.
// Si l'URL contient un #hash, fait défiler vers l'élément correspondant.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      // Petit délai pour laisser React terminer le rendu de la nouvelle page
      const timer = setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 80);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, hash]);
  return null;
}

export function SiteLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Fond grille */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[length:64px_64px] bg-grid-pattern opacity-40"
        aria-hidden
      />
      {/* Glow décoratifs — réduits et masqués sur mobile pour économiser le GPU */}
      <div
        className="pointer-events-none fixed -left-40 top-1/4 -z-10 hidden sm:block h-[400px] w-[400px] rounded-full bg-lime/15 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-40 bottom-1/4 -z-10 hidden sm:block h-[320px] w-[320px] rounded-full bg-coral/15 blur-[80px]"
        aria-hidden
      />

      <ScrollToTop />
      <Header />

      {/*
        pt-[28px] = hauteur de la PortailBar (fixée en top:0)
        Le Header est fixé à top-[28px] avec h-16 (64px).
        Le HeroSlider utilisé sur chaque page compense avec -mt-[92px]
        pour remonter derrière portailbar + header et remplir tout l'écran.
      */}
      <main className="pt-[28px] sm:pt-[30px]">
        <Outlet />
      </main>

      <Footer />
      <ChatWidget />
      <WhatsAppFloat />
    </div>
  );
}
