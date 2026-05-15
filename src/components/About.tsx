import { useTranslation } from "react-i18next";
import {
  ABOUT_MAIN_PARALLAX_OBJECT_POSITION,
  ABOUT_PARALLAX_IMAGE_URLS,
  ABOUT_STRIP_LEADERSHIP_OBJECT_POSITION,
} from "../config/siteImagery";
import { AnimateIn } from "./animations/AnimateIn";
import { ParallaxFigure } from "./animations/ParallaxFigure";

type ParallaxBlockFr = {
  alt: string;
  eyebrow?: string;
  caption?: string;
};

export function About() {
  const { t } = useTranslation();
  const rawPoints = t("about.points", { returnObjects: true });
  const points = Array.isArray(rawPoints) ? (rawPoints as string[]) : [];
  const rawStats = t("about.stats", { returnObjects: true });
  const stats = Array.isArray(rawStats) ? (rawStats as Array<{ n: string; l: string }>) : [];
  const rawZones = t("about.interventionZones", { returnObjects: true });
  const interventionZones = Array.isArray(rawZones) ? (rawZones as string[]) : [];
  const rawParallax = t("about.parallaxBlocks", { returnObjects: true });
  const parallaxBlocks = Array.isArray(rawParallax) ? (rawParallax as ParallaxBlockFr[]) : [];
  const dotColors = ["bg-coral", "bg-lime", "bg-violet"];

  const mainVisual = parallaxBlocks[0];
  const stripBlocks = [parallaxBlocks[1], parallaxBlocks[2]].filter(Boolean);

  return (
    <section id="apropos" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-16 lg:space-y-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <AnimateIn>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-violet">{t("about.eyebrow")}</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl text-balance">{t("about.title")}</h2>
              <p className="mt-6 text-mist/60 leading-relaxed">{t("about.p1")}</p>
              <ul className="mt-8 space-y-4 text-mist/80">
                {points.map((pt, i) => (
                  <li key={i} className="flex gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColors[i]}`} aria-hidden />
                    {pt}
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs uppercase tracking-wider text-mist/40">{t("about.distinguish")}</p>
                <p className="mt-2 text-sm leading-relaxed text-mist/70">{t("about.distinguishText")}</p>
              </div>

              <div className="mt-8">
                <p className="text-xs uppercase tracking-wider text-mist/45">{t("about.markets")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {interventionZones.map((zone) => (
                    <span key={zone} className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-mist/75">
                      {zone}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </AnimateIn>

          <AnimateIn delay={0.2} direction="left">
            <div className="relative lg:sticky lg:top-28">
              <div className="relative isolate aspect-[4/5] max-h-[460px] overflow-hidden rounded-3xl border border-white/10 shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
                <ParallaxFigure
                  src={ABOUT_PARALLAX_IMAGE_URLS[0]}
                  alt={mainVisual?.alt ?? ""}
                  className="absolute inset-0 h-full w-full"
                  objectPosition={ABOUT_MAIN_PARALLAX_OBJECT_POSITION}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/90 to-ink/55" aria-hidden />
                <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-between p-8">
                  <div>
                    <p className="font-display text-5xl font-extrabold text-mist/10">01</p>
                    <p className="-mt-4 font-display text-xl font-semibold text-mist">{t("about.card.method")}</p>
                    <p className="mt-3 text-sm text-mist/50 leading-relaxed">{t("about.card.methodSub")}</p>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-wider text-mist/40">{t("about.card.slot")}</p>
                      <p className="mt-1 font-display text-2xl font-bold text-lime">{t("about.card.slotDate")}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      <p className="text-xs uppercase tracking-wider text-mist/40">{t("about.card.position")}</p>
                      <p className="mt-1 text-sm leading-relaxed text-mist/70">{t("about.card.positionText")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {stats.map((item) => (
                  <div
                    key={item.l}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center transition hover:bg-white/[0.06]"
                  >
                    <p className="font-display text-lg font-bold text-coral">{item.n}</p>
                    <p className="mt-1 text-[11px] text-mist/55">{item.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {stripBlocks.map((block, i) => (
            <AnimateIn key={block.alt} delay={0.08 + i * 0.12}>
              <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-[0_14px_50px_rgba(0,0,0,0.18)]">
                <ParallaxFigure
                  src={ABOUT_PARALLAX_IMAGE_URLS[i + 1]}
                  alt={block.alt}
                  className="aspect-[16/10] w-full"
                  objectPosition={i === 0 ? ABOUT_STRIP_LEADERSHIP_OBJECT_POSITION : undefined}
                />
                {(block.eyebrow || block.caption) && (
                  <div className="border-t border-white/10 p-6">
                    {block.eyebrow ? (
                      <p className="text-xs font-semibold uppercase tracking-widest text-lime/90">{block.eyebrow}</p>
                    ) : null}
                    {block.caption ? <p className="mt-2 text-sm leading-relaxed text-mist/70">{block.caption}</p> : null}
                  </div>
                )}
              </article>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
