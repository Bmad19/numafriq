import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo, BRAND_LOGO_PNG } from "./BrandLogo";
import { LangSwitcher } from "./LangSwitcher";
import { RECRUITMENT_PATH } from "../config/recruitmentNav";

function PortailBar() {
  const { t } = useTranslation();
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-end gap-1.5 sm:gap-2 bg-ink/[0.94] py-1 pl-2 pr-3 sm:py-1.5 sm:pl-3 sm:pr-6 lg:pr-8 backdrop-blur-xl border-b border-white/[0.09]">
      <span className="mr-auto inline-flex items-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] text-white/52">
        <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <img
            src={BRAND_LOGO_PNG}
            alt=""
            width={28}
            height={28}
            className="h-[72%] w-[72%] shrink-0 rounded-full object-cover object-center select-none"
            decoding="async"
            draggable={false}
            aria-hidden
          />
        </span>
        <span className="hidden sm:inline">Afrilex Conseil</span>
      </span>

      <Link
        to="/espace-client"
        className="inline-flex items-center gap-1 sm:gap-2 rounded-full border border-lime/25 px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-lime/80 transition hover:border-lime/50 hover:text-lime"
        style={{ background: "rgba(235,228,212,0.06)" }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 shrink-0">
          <circle cx="8" cy="5" r="3" />
          <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
        {t("nav.portailClient")}
      </Link>

      <Link
        to="/bureau"
        className="inline-flex items-center gap-1 sm:gap-2 rounded-full border border-coral/25 px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-coral/80 transition hover:border-coral/50 hover:text-coral"
        style={{ background: "rgba(236,200,90,0.10)" }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3 shrink-0">
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
        </svg>
        {t("nav.portailAgent")}
        <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-coral/20 px-1.5 py-0.5 text-[9px] font-black text-coral/90 uppercase tracking-wider">
          {t("nav.portailAgentBadge")}
        </span>
      </Link>
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  /** Page Recrutements uniquement : pas de logo dans la barre principale (lien d’accueil). */
  const hideMainLogo = pathname === RECRUITMENT_PATH || pathname.endsWith(`${RECRUITMENT_PATH}`);

  const links = useMemo(
    () => [
      { to: "/", label: t("nav.home") },
      { to: "/apropos", label: t("nav.apropos") },
      { to: "/services", label: t("nav.services") },
      { to: "/realisations", label: t("nav.realisations") },
      { to: "/blog", label: t("nav.blog") },
      { to: RECRUITMENT_PATH, label: t("nav.recrutement") },
      { to: "/contact", label: t("nav.contact") },
    ],
    [t, i18n.language],
  );

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
            ? "border-b border-white/[0.12] bg-ink/[0.93] shadow-[0_10px_36px_rgba(0,0,0,0.26)] backdrop-blur-xl"
            : "border-b border-transparent bg-gradient-to-b from-ink/45 via-ink/18 to-transparent"
        }`}
      >
        <div className="mx-auto flex min-h-[4.75rem] max-w-6xl items-center justify-between py-1 pl-2 pr-4 sm:min-h-[5.5rem] sm:pl-3 sm:pr-6 sm:py-1.5 lg:pl-4 lg:pr-8">
          {hideMainLogo ? (
            <div
              className="shrink-0 h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] -translate-x-0.5 sm:-translate-x-1 lg:-translate-x-2 invisible pointer-events-none select-none"
              aria-hidden
            />
          ) : (
            <Link
              to="/"
              className="group inline-flex items-center rounded-lg outline-none transition-[opacity,transform] duration-200 ease-out hover:opacity-[0.96] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-coral/55 focus-visible:ring-offset-2 focus-visible:ring-offset-ink -translate-x-0.5 sm:-translate-x-1 lg:-translate-x-2"
              aria-label="Afrilex conseil — accueil"
            >
              <BrandLogo variant="header" suppressTextForA11y />
            </Link>
          )}

          <nav className="hidden items-center gap-6 md:flex" aria-label="Principal">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `relative text-sm font-semibold tracking-tight transition [text-shadow:0_1px_14px_rgba(12,18,16,0.55)] hover:text-mist ${isActive ? "font-bold text-coral" : "text-mist/[0.93]"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <LangSwitcher />
            <Link
              to="/contact#contact"
              className="rounded-full bg-coral px-5 py-2 text-sm font-bold text-ink transition hover:brightness-110"
            >
              {t("nav.cta")}
            </Link>
          </nav>

          <button
            type="button"
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/22 bg-ink/25 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`block h-0.5 w-5 bg-mist transition ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-mist transition ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-mist transition ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </button>
        </div>

        <div id="mobile-nav" className={`border-t border-white/[0.12] bg-ink/[0.97] backdrop-blur-xl md:hidden ${open ? "block" : "hidden"}`}>
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-base font-semibold ${isActive ? "font-bold text-coral" : "text-mist"}`
                }
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                to="/espace-client"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-lime/25 bg-lime/10 py-2.5 text-xs font-bold uppercase tracking-widest text-lime"
              >
                {t("nav.portailClient")}
              </Link>
              <Link
                to="/bureau"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-coral/25 bg-coral/10 py-2.5 text-xs font-bold uppercase tracking-widest text-coral"
              >
                {t("nav.portailAgent")}
              </Link>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <LangSwitcher />
              <Link to="/contact#contact" onClick={() => setOpen(false)} className="flex-1 rounded-full bg-coral px-5 py-3 text-center font-bold text-ink">
                {t("nav.cta")}
              </Link>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
