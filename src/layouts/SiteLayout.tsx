import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { LocationMapBanner } from "../components/LocationMapBanner";
import { SplashIntro } from "../components/SplashIntro";
import { ChatWidget } from "../components/chat/ChatWidget";

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
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [pathname, hash]);
  return null;
}

function SkipToMain() {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[230] focus:rounded-xl focus:bg-coral focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-lime focus:ring-offset-2 focus:ring-offset-ink"
    >
      {t("a11y.skipToContent")}
    </a>
  );
}

export function SiteLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SkipToMain />
      <SplashIntro />
      {/* Fond grille */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[length:64px_64px] bg-grid-pattern opacity-[0.82]"
        aria-hidden
      />
      {/* Glow décoratifs — réduits et masqués sur mobile pour économiser le GPU */}
      <div
        className="pointer-events-none fixed -left-40 top-1/4 -z-10 hidden sm:block h-[400px] w-[400px] rounded-full bg-lime/44 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-40 bottom-1/4 -z-10 hidden sm:block h-[320px] w-[320px] rounded-full bg-coral/42 blur-[80px]"
        aria-hidden
      />

      <ScrollToTop />
      <Header />

      {/*
        pt-[28px] = hauteur de la PortailBar (fixée en top:0)
        Le Header est fixé sous la portailbar (min-h-16 à sm:min-h-[5rem] selon la hauteur du logo).
        Le HeroSlider compense le bandeau fixe (portail + header) avec -mt-[118px] sm:-mt-[142px]
        pour remonter derrière portailbar + header et remplir tout l'écran.
      */}
      <main id="main-content" tabIndex={-1} className="pt-[28px] outline-none sm:pt-[30px]">
        <Outlet />
      </main>

      <LocationMapBanner className="mt-16 sm:mt-20" />

      <Footer />
      <ChatWidget />
    </div>
  );
}
