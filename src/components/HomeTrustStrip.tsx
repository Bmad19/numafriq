import { useTranslation } from "react-i18next";

const PHONE_E164 = "+22652209191";
const WA_PATH = "22652209191";

export function HomeTrustStrip() {
  const { t } = useTranslation();
  const bullets = t("home.trustBullets", { returnObjects: true }) as string[];

  return (
    <aside
      aria-label={t("home.trustStripLabel")}
      className="relative z-30 border-y border-white/[0.08] bg-ink/92"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:gap-y-3 sm:px-6 lg:px-8">
        <ul className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-[13px] leading-snug text-mist/89 sm:text-sm">
          {bullets.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-lime" aria-hidden>
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <a
            href={`tel:${PHONE_E164}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-mist transition hover:border-coral/40 hover:bg-coral/10 hover:text-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="whitespace-nowrap">
              {t("home.trustPhoneShort")} · +226 52 20 91 91
            </span>
          </a>
          <a
            href={`https://wa.me/${WA_PATH}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-coral/35 bg-coral/10 px-3.5 py-2 text-xs font-semibold text-mist transition hover:bg-coral/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/45"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 shrink-0 opacity-90 text-coral" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.118 1.523 5.852L0 24l6.306-1.501A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.661-.516-5.178-1.412l-.371-.219-3.843.915.946-3.741-.241-.389A9.973 9.973 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            <span className="whitespace-nowrap">{t("home.trustWaBtn")}</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
