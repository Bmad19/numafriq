import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

/** Fiche Google Maps officielle (lien court → même lieu que l’iframe). */
const GOOGLE_MAPS_URL = "https://maps.app.goo.gl/GbHfqSD87kMfU12U7";

/** Centre iframe — coordonnées de la fiche Maps (Kamsonghin, Ouagadougou). */
const MAP_EMBED_SRC =
  "https://www.google.com/maps?q=12.3547055,-1.5247279&hl=fr&z=17&output=embed";

type Props = {
  /** Marge au-dessus du bandeau (entre le contenu de page et la carte). */
  className?: string;
};

/**
 * Bandeau carte pleine largeur + texte superposé — même rendu sur toutes les pages du layout vitrine.
 */
export function LocationMapBanner({ className = "" }: Props) {
  const { t } = useTranslation();

  return (
    <AnimateIn>
      <div
        id="localisation"
        className={`scroll-mt-[112px] sm:scroll-mt-[128px] ${className}`.trim()}
      >
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 border-y border-white/14 bg-ink/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="relative isolate min-h-[360px] h-[clamp(340px,46vw,580px)] w-full sm:min-h-[420px] lg:min-h-[460px]">
            <iframe
              title={t("contact.location.mapAria")}
              src={MAP_EMBED_SRC}
              className="absolute inset-0 block h-full w-full border-0 contrast-[1.02]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,#263a34_0%,rgba(38,58,52,0.9)_26%,rgba(38,58,52,0.5)_52%,rgba(38,58,52,0.12)_78%,transparent_100%)]"
              aria-hidden
            />

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-end">
              <div className="w-full px-5 pb-8 pt-16 sm:px-10 sm:pb-10 sm:pt-20 lg:px-14 lg:pb-12">
                <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
                  <div className="max-w-xl space-y-3 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-coral drop-shadow-md">
                      {t("contact.location.kicker")}
                    </p>
                    <h3 className="font-display text-2xl font-extrabold tracking-tight text-mist text-balance drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)] sm:text-3xl lg:text-[2rem] lg:leading-tight">
                      {t("contact.location.title")}
                    </h3>
                    <p className="text-sm leading-relaxed text-mist/88 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
                      {t("contact.location.lead")}
                    </p>
                    <address className="not-italic text-sm leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)]">
                      <span className="block font-semibold text-mist">{t("contact.location.addressLine1")}</span>
                      <span className="block text-mist/90">{t("contact.location.addressLine2")}</span>
                      <span className="mt-1.5 block text-mist/65">{t("contact.location.city")}</span>
                    </address>
                  </div>

                  <div className="flex w-full max-w-lg flex-col gap-3 lg:max-w-md lg:items-end lg:text-right">
                    <p className="text-[13px] font-medium leading-relaxed text-mist/92 drop-shadow-[0_1px_8px_rgba(0,0,0,0.5)] sm:text-sm">
                      {t("contact.location.ctaHint")}
                    </p>
                    <a
                      href={GOOGLE_MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pointer-events-auto group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-coral px-6 py-4 text-center text-sm font-extrabold uppercase tracking-wide text-ink shadow-[0_4px_28px_rgba(0,0,0,0.28),0_0_36px_rgba(236,200,90,0.48)] transition hover:brightness-110 hover:shadow-[0_6px_36px_rgba(0,0,0,0.32),0_0_48px_rgba(236,200,90,0.58)] active:scale-[0.99] sm:rounded-2xl sm:py-[1.05rem] sm:text-[15px] lg:w-auto lg:min-w-[min(100%,320px)]"
                    >
                      <span className="text-balance">{t("contact.location.ctaLabel")}</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0 opacity-90 transition-transform group-hover:translate-x-0.5" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>
                    <p className="text-[11px] text-mist/55 lg:text-right">{t("contact.location.ctaNote")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimateIn>
  );
}
