import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const socials = [
  {
    label: "Facebook",
    handle: "@numafriq",
    href: "https://facebook.com/numafriq",
    color: "hover:border-[#1877F2]/50 hover:bg-[#1877F2]/10 hover:text-[#1877F2]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M24 12.073C24 5.41 18.627 0 12 0 5.373 0 0 5.41 0 12.073c0 6.03 4.437 11.03 10.125 11.927V15.56H7.078v-3.488h3.047V9.41c0-3.025 1.79-4.697 4.533-4.697 1.313 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.272h3.328l-.532 3.488h-2.796v8.44C19.563 23.103 24 18.103 24 12.073z"/>
      </svg>
    ),
  },
  {
    label: "Instagram",
    handle: "@numafriq",
    href: "https://instagram.com/numafriq",
    color: "hover:border-[#E1306C]/50 hover:bg-[#E1306C]/10 hover:text-[#E1306C]",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    handle: "NUMAFRIQ",
    href: "https://linkedin.com/company/numafriq",
    color: "hover:border-[#0A66C2]/50 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    handle: "+226 56 19 19 30",
    href: "https://wa.me/22656191930",
    color: "hover:border-[#25D366]/50 hover:bg-[#25D366]/10 hover:text-[#25D366]",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.118 1.523 5.852L0 24l6.306-1.501A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.661-.516-5.178-1.412l-.371-.219-3.843.915.946-3.741-.241-.389A9.973 9.973 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
    ),
  },
  {
    label: "TikTok",
    handle: "@numafriq",
    href: "https://tiktok.com/@numafriq",
    color: "hover:border-white/40 hover:bg-white/10 hover:text-white",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.74a4.85 4.85 0 01-1.01-.05z"/>
      </svg>
    ),
  },
];

export function Footer() {
  const { t } = useTranslation();

  const navLinks = [
    { to: "/services",      label: t("nav.services") },
    { to: "/realisations",  label: t("nav.realisations") },
    { to: "/tarifications", label: t("nav.tarifications") },
    { to: "/apropos",       label: t("nav.apropos") },
    { to: "/contact",       label: t("nav.contact") },
  ];

  return (
    <footer className="relative z-40 border-t border-white/10 bg-white/[0.02] px-4 pt-14 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <img
              src="/numafriq-logo-adapted.png"
              alt="NumAfriq"
              className="h-16 w-auto"
            />
            <p className="mt-3 max-w-sm text-sm text-mist/45 leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(t("footer.tags", { returnObjects: true }) as string[]).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-mist/65"
                >
                  {tag}
                </span>
              ))}
            </div>
            {/* Réseaux sociaux */}
            <div className="mt-7">
              <p className="text-[10px] font-bold uppercase tracking-widest text-mist/30 mb-3">Suivez-nous</p>
              <div className="flex flex-wrap gap-2.5">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className={`group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-mist/45 transition-all duration-200 ${s.color}`}
                  >
                    <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                      {s.icon}
                    </span>
                    <span className="flex flex-col leading-none">
                      <span className="text-[11px] font-bold">{s.label}</span>
                      <span className="text-[9px] opacity-60 mt-0.5">{s.handle}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mist/35">{t("footer.navigation")}</p>
            <ul className="mt-4 space-y-3">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-mist/55 transition hover:text-mist">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-mist/35">{t("footer.contact")}</p>
            <ul className="mt-4 space-y-3 text-sm text-mist/55">
              <li>
                <a href="mailto:info@numafriq.com" className="transition hover:text-lime">
                  info@numafriq.com
                </a>
              </li>
              <li className="text-mist/40">{t("footer.reponse")}</li>
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

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 pb-24 sm:pb-8 sm:flex-row">
          <p className="text-xs text-mist/30">
            © {new Date().getFullYear()} NUMAFRIQ. Tous droits réservés.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-mist/30 relative z-50 pointer-events-auto">
            <Link to="/mentions-legales" className="transition hover:text-mist/60 hover:underline cursor-pointer block py-2">{t("footer.mentions")}</Link>
            <Link to="/confidentialite" className="transition hover:text-mist/60 hover:underline cursor-pointer block py-2">{t("footer.politique")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
