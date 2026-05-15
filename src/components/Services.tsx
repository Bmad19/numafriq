import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SERVICES_POLE_BANNERS } from "../config/siteImagery";
import { AnimateIn } from "./animations/AnimateIn";
import { ParallaxFigure } from "./animations/ParallaxFigure";

type ServicePole = {
  title: string;
  desc: string;
  points: string[];
};

const stripColors = ["bg-coral", "bg-lime", "bg-violet"] as const;
const blobColors = ["bg-coral/45", "bg-lime/40", "bg-violet/45"] as const;
/** Pastilles & accents du bloc texte — alignés sur la bande verticale du pôle. */
const poleAccentDots = ["bg-coral", "bg-lime", "bg-violet"] as const;
const poleAccentLabels = ["text-coral", "text-lime", "text-violet"] as const;

function ServicesPoleBanner({
  src,
  alt,
  stripeIndex,
  objectPosition = "center",
}: {
  src: string;
  alt: string;
  stripeIndex: number;
  objectPosition?: string;
}) {
  const reduceMotion = useReducedMotion();
  const blob = blobColors[stripeIndex % blobColors.length];

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 36 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-72px", amount: 0.2 }}
      transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
      className="group/banner relative mt-9 md:mt-10"
    >
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/12 bg-ink/40 shadow-[0_18px_56px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.06] transition-[box-shadow,transform] duration-500 ease-out group-hover/article:shadow-[0_28px_90px_-12px_rgba(0,0,0,0.58)] group-hover/article:ring-white/[0.11]`}
      >
        <div
          className={`pointer-events-none absolute -bottom-24 -right-16 z-[1] h-52 w-52 rounded-full ${blob} animate-pole-glow md:h-64 md:w-64`}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-br from-white/[0.07] via-transparent to-transparent opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover/article:opacity-100"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-1/4 z-[2] w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 animate-pole-shine mix-blend-soft-light transition-opacity duration-300 group-hover/article:opacity-100"
          aria-hidden
        />

        <motion.div
          className="relative z-0 origin-center"
          whileHover={reduceMotion ? undefined : { scale: 1.025 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          {reduceMotion ? (
            <div className="aspect-[2/1] max-h-[300px] w-full overflow-hidden sm:max-h-[340px]">
              <img
                src={src}
                alt={alt}
                className="h-full w-full object-cover"
                style={{ objectPosition }}
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : (
            <ParallaxFigure
              src={src}
              alt={alt}
              className="aspect-[2/1] max-h-[300px] w-full sm:max-h-[340px]"
              objectPosition={objectPosition}
            />
          )}
        </motion.div>

        <div
          className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-t from-ink via-ink/25 to-transparent opacity-[0.72]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70 group-hover/article:via-lime/40"
          aria-hidden
        />
      </div>
    </motion.div>
  );
}

export function Services() {
  const { t } = useTranslation();
  const rawPoles = t("services.poles", { returnObjects: true });
  const poles = Array.isArray(rawPoles) ? (rawPoles as ServicePole[]) : [];
  const rawAlts = t("services.poleImageAlts", { returnObjects: true });
  const poleImageAlts = Array.isArray(rawAlts) ? (rawAlts as string[]) : [];

  return (
    <section id="services" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <AnimateIn>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-coral">{t("services.eyebrow")}</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-mist sm:text-4xl md:text-5xl text-balance">
                {t("services.title")}
              </h2>
              <p className="mt-4 max-w-2xl text-mist/78">{t("services.sub")}</p>
            </div>
          </AnimateIn>
          <AnimateIn delay={0.2}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 md:max-w-xs">
              <p className="text-xs uppercase tracking-widest text-mist/64">{t("services.approach")}</p>
              <p className="mt-2 text-sm leading-relaxed text-mist/84">{t("services.approachText")}</p>
            </div>
          </AnimateIn>
        </div>

        <div className="mt-14 space-y-6 md:space-y-7">
          {poles.map((pole, index) => (
            <AnimateIn key={pole.title} delay={index * 0.035}>
              <article className="group/article relative flex overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent shadow-[0_12px_48px_rgba(0,0,0,0.15)] transition hover:border-white/[0.18]">
                <div className={`w-1 shrink-0 ${stripColors[index % stripColors.length]}`} aria-hidden />
                <div className="min-w-0 flex-1 flex-col p-6 sm:p-8 md:p-9">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" aria-hidden />
                  <div className="rounded-2xl border border-white/[0.12] bg-black/[0.28] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-md sm:p-7 md:p-8">
                    <p
                      className={`font-display text-[0.6875rem] font-bold uppercase tracking-[0.32em] ${poleAccentLabels[index % poleAccentLabels.length]}`}
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-mist text-balance sm:text-3xl md:text-[2rem] md:leading-[1.15] [text-shadow:0_2px_28px_rgba(0,0,0,0.55),0_1px_0_rgba(255,255,255,0.06)]">
                      {pole.title}
                    </h3>
                    <div
                      className={`mt-5 h-1 w-14 shrink-0 rounded-full ring-1 ring-white/25 shadow-[0_0_18px_rgba(255,255,255,0.12)] ${stripColors[index % stripColors.length]}`}
                      aria-hidden
                    />
                    <p className="mt-5 max-w-[52ch] text-base font-normal leading-[1.72] text-mist/[0.93] sm:text-[1.0625rem] sm:leading-[1.74]">
                      {pole.desc}
                    </p>
                    <ul className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                      {pole.points.map((pt) => (
                        <li
                          key={pt}
                          className="flex gap-3 text-[0.9375rem] leading-[1.68] text-mist/[0.91] sm:text-base sm:leading-[1.72]"
                        >
                          <span
                            className={`mt-[0.55rem] h-2 w-2 shrink-0 rounded-full ring-2 ring-white/15 ${poleAccentDots[index % poleAccentDots.length]}`}
                            aria-hidden
                          />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {SERVICES_POLE_BANNERS[index] && poleImageAlts[index] ? (
                    <ServicesPoleBanner
                      src={SERVICES_POLE_BANNERS[index].src}
                      objectPosition={SERVICES_POLE_BANNERS[index].objectPosition}
                      alt={poleImageAlts[index]}
                      stripeIndex={index % stripColors.length}
                    />
                  ) : null}
                </div>
              </article>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn delay={0.15}>
          <div className="mt-14 flex justify-center">
            <Link
              to="/contact#contact"
              className="btn-afrilex-secondary gap-2 px-8 py-4 text-sm"
            >
              {t("services.cta")}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
