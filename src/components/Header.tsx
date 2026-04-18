import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LangSwitcher } from "./LangSwitcher";

// ── Barre portails (fixée en haut, au-dessus du header) ─────────────────────
function PortailBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-end gap-1.5 sm:gap-2 bg-ink/90 px-3 py-1 sm:py-1.5 backdrop-blur-xl border-b border-white/[0.05] sm:px-6 lg:px-8">
      <span className="mr-auto text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20 hidden sm:block">
        NUMAFRIQ
      </span>

      {/* Espace Client */}
      <Link
        to="/espace-client"
        className="inline-flex items-center gap-1 sm:gap-2 rounded-full border border-lime/25 px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-lime/80 transition hover:border-lime/50 hover:text-lime"
        style={{ background: "rgba(163,230,53,0.06)" }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 shrink-0">
          <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
        </svg>
        Espace Client
      </Link>

      {/* Espace Agent */}
      <Link
        to="/bureau"
        className="inline-flex items-center gap-1 sm:gap-2 rounded-full border border-coral/25 px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-coral/80 transition hover:border-coral/50 hover:text-coral"
        style={{ background: "rgba(255,107,74,0.06)" }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 shrink-0">
          <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
          <rect x="9" y="9" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/>
        </svg>
        Espace Agent
        <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-coral/20 px-1.5 py-0.5 text-[9px] font-black text-coral/90 uppercase tracking-wider">
          Privé
        </span>
      </Link>
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/services", label: t("nav.services") },
    { to: "/realisations", label: t("nav.realisations") },
    { to: "/tarifications", label: t("nav.tarifications") },
    { to: "/apropos", label: t("nav.apropos") },
    { to: "/contact", label: t("nav.contact") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <PortailBar />

      <header
        className={`fixed top-[28px] sm:top-[30px] z-50 w-full transition-[background,backdrop-filter,border-color] duration-300 ${
          scrolled
            ? "border-b border-white/10 bg-ink/80 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[4.25rem] sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center" aria-label="NumAfriq">
            <img src="/numafriq-logo-adapted.png" alt="NumAfriq"
              className="h-14 w-auto max-w-[320px] object-contain sm:h-16" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) =>
                  `relative text-sm font-medium transition hover:text-mist ${isActive ? "text-coral" : "text-mist/70"}`
                }
              >{l.label}</NavLink>
            ))}
            <LangSwitcher />
            <Link to="/contact#contact"
              className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110">
              {t("nav.cta")}
            </Link>
          </nav>

          <button type="button"
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/15 md:hidden"
            aria-expanded={open} aria-controls="mobile-nav"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`block h-0.5 w-5 bg-mist transition ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-mist transition ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-mist transition ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>

        {/* Mobile menu */}
        <div id="mobile-nav" className={`border-t border-white/10 bg-ink/95 backdrop-blur-xl md:hidden ${open ? "block" : "hidden"}`}>
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to}
                className={({ isActive }) => `rounded-lg px-3 py-3 ${isActive ? "text-coral" : "text-mist/90"}`}
                onClick={() => setOpen(false)}
              >{l.label}</NavLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/espace-client" onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-lime/25 bg-lime/10 py-2.5 text-xs font-bold uppercase tracking-widest text-lime">
                Espace Client
              </Link>
              <Link to="/bureau" onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-coral/25 bg-coral/10 py-2.5 text-xs font-bold uppercase tracking-widest text-coral">
                Espace Agent
              </Link>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <LangSwitcher />
              <Link to="/contact#contact" onClick={() => setOpen(false)}
                className="flex-1 rounded-full bg-coral px-5 py-3 text-center font-semibold text-white">
                {t("nav.cta")}
              </Link>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
