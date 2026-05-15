import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";
import { RECRUITMENT_PATH } from "../config/recruitmentNav";

const socials = [
  {
    label: "WhatsApp",
    handle: "+226 52 20 91 91",
    href: "https://wa.me/22652209191",
    color: "hover:border-coral/50 hover:bg-coral/10 hover:text-coral",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.118 1.523 5.852L0 24l6.306-1.501A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.661-.516-5.178-1.412l-.371-.219-3.843.915.946-3.741-.241-.389A9.973 9.973 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
      </svg>
    ),
  },
  {
    label: "Site officiel",
    handle: "afrilexconseil.com",
    href: "https://afrilexconseil.com/",
    color: "hover:border-lime/50 hover:bg-lime/10 hover:text-lime",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
];

export function Footer() {
  const { t, i18n } = useTranslation();

  const navLinks = useMemo(
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

  return (
    <footer className="relative z-40 border-t border-white/10 bg-white/[0.02] px-4 pt-14 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link
              to="/"
              className="inline-block rounded-lg outline-none transition-opacity duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              aria-label="Afrilex conseil — retour à l'accueil"
            >
              <BrandLogo variant="footer" suppressTextForA11y />
            </Link>
            <p className="mt-4 max-w-sm text-sm text-mist/69 leading-relaxed">{t("footer.tagline")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(t("footer.tags", { returnObjects: true }) as string[]).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-mist/83"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-7">
              <p className="text-[10px] font-bold uppercase tracking-widest text-mist/52 mb-3">Suivez-nous</p>
              <div className="flex flex-wrap gap-2.5">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className={`group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-mist/69 transition-all duration-200 ${s.color}`}
                  >
                    <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">{s.icon}</span>
                    <span className="flex flex-col leading-none">
                      <span className="text-[11px] font-bold">{s.label}</span>
                      <span className="text-[9px] opacity-60 mt-0.5">{s.handle}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mist/57">{t("footer.navigation")}</p>
            <ul className="mt-4 space-y-3">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-mist/77 transition hover:text-mist">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mist/57">{t("footer.contact")}</p>
            <ul className="mt-4 space-y-3 text-sm text-mist/77">
              <li>
                <a href="mailto:info@afrilexconseil.com" className="transition hover:text-lime">
                  info@afrilexconseil.com
                </a>
              </li>
              <li>
                <a href="tel:+22652209191" className="transition hover:text-lime">
                  +226 52 20 91 91
                </a>
              </li>
              <li className="text-mist/64">{t("footer.reponse")}</li>
            </ul>
            <Link
              to="/contact#contact"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-lime/10 border border-lime/25 px-4 py-2 text-xs font-semibold text-lime transition hover:bg-lime/20"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" aria-hidden />
              {t("footer.disponible")}
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 pb-24 sm:pb-8 sm:flex-row">
          <div className="text-xs text-mist/52 text-center sm:text-left">
            <p>© {new Date().getFullYear()} Afrilex Conseil · {t("footer.droits")}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-mist/52 relative z-50 pointer-events-auto">
            <Link to="/mentions-legales" className="transition hover:text-mist/78 hover:underline cursor-pointer block py-2">
              {t("footer.mentions")}
            </Link>
            <Link to="/confidentialite" className="transition hover:text-mist/78 hover:underline cursor-pointer block py-2">
              {t("footer.politique")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
