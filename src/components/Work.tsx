import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((line) => (
        <li key={line} className="flex gap-3 text-sm leading-relaxed text-mist/89">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-lime/85" aria-hidden />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

function ContentPanel({
  children,
  accentClass,
}: {
  children: ReactNode;
  accentClass: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent shadow-[0_12px_48px_rgba(0,0,0,0.12)]">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentClass}`} aria-hidden />
      <div className="pl-5 sm:pl-6 md:p-8 md:pl-10">{children}</div>
    </div>
  );
}

export function Work() {
  const { t } = useTranslation();
  const functioningBullets = t("work.functioningBullets", { returnObjects: true }) as string[];
  const whyBullets = t("work.whyBullets", { returnObjects: true }) as string[];
  const approachBullets = t("work.approachBullets", { returnObjects: true }) as string[];
  const teamParagraphs = t("work.teamParagraphs", { returnObjects: true }) as string[];

  const accents = ["bg-coral", "bg-lime", "bg-violet", "bg-coral"] as const;

  return (
    <section id="organisation" className="scroll-mt-24 border-y border-white/10 bg-white/[0.02] py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AnimateIn>
          <header className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime">{t("work.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl md:text-5xl text-balance">{t("work.title")}</h2>
            <p className="mt-4 text-mist/77 leading-relaxed">{t("work.sub")}</p>
          </header>
        </AnimateIn>

        <div className="mt-14 space-y-6 md:space-y-8">
          <AnimateIn delay={0.05}>
            <ContentPanel accentClass={accents[0]}>
              <h3 className="font-display text-xl font-bold text-mist sm:text-2xl">{t("work.functioningTitle")}</h3>
              <p className="mt-3 text-sm font-medium text-mist/84">{t("work.functioningLead")}</p>
              <BulletList items={functioningBullets} />
            </ContentPanel>
          </AnimateIn>

          <AnimateIn delay={0.1}>
            <ContentPanel accentClass={accents[1]}>
              <h3 className="font-display text-xl font-bold text-mist sm:text-2xl">{t("work.positioningTitle")}</h3>
              <p className="mt-4 text-sm leading-relaxed text-mist/84 md:text-[15px]">{t("work.positioningBody")}</p>
            </ContentPanel>
          </AnimateIn>

          <AnimateIn delay={0.12}>
            <ContentPanel accentClass={accents[2]}>
              <h3 className="font-display text-xl font-bold text-mist sm:text-2xl">{t("work.whyTitle")}</h3>
              <BulletList items={whyBullets} />
            </ContentPanel>
          </AnimateIn>

          <AnimateIn delay={0.14}>
            <ContentPanel accentClass={accents[3]}>
              <h3 className="font-display text-xl font-bold text-mist sm:text-2xl">{t("work.teamApproachSectionTitle")}</h3>

              <h4 className="mt-8 font-display text-lg font-semibold text-mist sm:text-xl">{t("work.teamTitle")}</h4>
              <div className="mt-4 space-y-4">
                {teamParagraphs.map((p, i) => (
                  <p key={`team-p-${i}`} className="text-sm leading-relaxed text-mist/84 md:text-[15px]">
                    {p}
                  </p>
                ))}
              </div>

              <h4 className="mt-10 font-display text-lg font-semibold text-mist sm:text-xl">{t("work.approachTitle")}</h4>
              <BulletList items={approachBullets} />
            </ContentPanel>
          </AnimateIn>
        </div>

        <AnimateIn delay={0.08}>
          <div className="mt-14 flex justify-center">
            <Link
              to="/contact#contact"
              className="btn-afrilex-primary gap-2 px-8 py-4 text-sm shadow-lg shadow-coral/15 focus-visible:ring-lime/60"
            >
              {t("work.cta")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
