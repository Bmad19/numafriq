import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { HOME_HERO_SLIDES } from "../config/siteImagery";

export type HeroSlide = {
  tag: string;
  eyebrow: string;
  title: string;
  sub: string;
  image: string;
  /** `object-position` CSS pour portraits (visage centré sous l’overlay). */
  imagePosition?: string;
  /** `object-fit` : `contain` pour tout afficher (ex. slide balance). */
  imageFit?: "cover" | "contain";
  accent: string;
  cta: { label: string; to: string };
  ctaSecondary?: { label: string; to: string };
};

const defaultSlides: HeroSlide[] = [
  {
    tag: "Cabinet",
    eyebrow: "Afrilex Conseil · Ouagadougou — Afrique de l'Ouest, autres pays OHADA, diaspora",
    title: "Conseil juridique,\nfiscal et\ncomptable.",
    sub: "Nous sécurisons vos contrats, votre fiscalité et votre gouvernance comptable avec une exigence de clarté et de proximité.",
    image: HOME_HERO_SLIDES[0].image,
    imagePosition: HOME_HERO_SLIDES[0].imagePosition,
    accent: "from-coral/58 to-transparent",
    cta: { label: "Prendre contact", to: "/contact#contact" },
    ctaSecondary: { label: "Nos expertises", to: "/services" },
  },
  {
    tag: "Investisseurs & PME",
    eyebrow: "Structuration · conformité OHADA",
    title: "Des décisions éclairées\npour vos projets\nen Afrique.",
    sub: "Accompagnement des opérateurs publics et privés : montages, due diligence et dialogue avec les administrations.",
    image: HOME_HERO_SLIDES[1].image,
    imagePosition: HOME_HERO_SLIDES[1].imagePosition,
    accent: "from-lime/58 to-transparent",
    cta: { label: "Discuter d'un dossier", to: "/contact#contact" },
    ctaSecondary: { label: "Organisation du cabinet", to: "/apropos" },
  },
  {
    tag: "Confiance",
    eyebrow: "Secret professionnel · réactivité",
    title: "Une équipe engagée\nà vos côtés,\navec méthode.",
    sub: "Mandats formalisés, reporting transparent et mise en œuvre pragmatique des solutions retenues avec vos directions.",
    image: HOME_HERO_SLIDES[2].image,
    imagePosition: HOME_HERO_SLIDES[2].imagePosition,
    imageFit: HOME_HERO_SLIDES[2].imageFit,
    accent: "from-violet/52 to-transparent",
    cta: { label: "Écrire au cabinet", to: "/contact#contact" },
    ctaSecondary: { label: "Publications", to: "/blog" },
  },
];

type Props = { slides?: HeroSlide[] };

export function HeroSlider({ slides = defaultSlides }: Props) {
  const { t } = useTranslation();
  const safeSlides = slides.length > 0 ? slides : defaultSlides;
  const stats = [
    { value: "130+", label: t("about.stats.0.l") },
    { value: "170+", label: t("about.stats.1.l") },
    { value: "10+",  label: t("about.stats.2.l") },
    { value: "4.9",  label: "Note /5" },
  ];
  const [current, setCurrent] = useState(0);
  // La barre de progression est gérée entièrement par CSS — zéro JS overhead
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 5500;

  const goTo = (index: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrent(index);
  };

  useEffect(() => {
    setCurrent((c) => Math.min(Math.max(0, c), safeSlides.length - 1));
  }, [safeSlides.length]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % safeSlides.length);
    }, DURATION);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [current, safeSlides.length]);

  const slide = safeSlides[current];

  return (
    <section
      className="relative -mx-4 -mt-[118px] overflow-hidden sm:-mx-6 sm:-mt-[142px] lg:-mx-8"
      style={{
        height: "100svh",
        minHeight: 560,
        maxHeight: 1080,
      }}
    >
      {/* ── Images préchargées, toutes montées, visibilité gérée par opacity ── */}
      {safeSlides.map((s, i) => (
        <motion.div
          key={`hero-${i}-${s.tag}`}
          className={`absolute inset-0 overflow-hidden ${s.imageFit === "contain" ? "bg-ink" : ""}`}
          animate={{ opacity: i === current ? 1 : 0, scale: i === current ? 1.06 : 1.02 }}
          transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <img
            src={s.image}
            alt={s.eyebrow}
            className={`h-full w-full ${s.imageFit === "contain" ? "object-contain" : "object-cover"}`}
            style={{ objectPosition: s.imagePosition ?? "50% 28%" }}
            loading="eager"
            decoding="async"
          />
        </motion.div>
      ))}

      {/* ── Overlays — photo plus lisible / lumineuse ; texte renforcé par drop-shadow ── */}
      <div className="absolute inset-0 bg-ink/28" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/52 via-ink/10 to-ink/[0.03]" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/38 via-ink/12 to-transparent" />

      {/* ── Accent glow par slide ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`glow-${current}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className={`pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-tr ${slide.accent} opacity-[0.95] mix-blend-soft-light`}
        />
      </AnimatePresence>

      {/* ── Contenu principal ── */}
      <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-20 sm:px-8 sm:pb-24 lg:px-16">
        <div className="mx-auto w-full max-w-7xl grid lg:grid-cols-[1fr_260px] lg:items-end gap-6 lg:gap-10">

          <div className="max-w-3xl w-full">
            {/* Eyebrow */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`eyebrow-${current}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-white/28 bg-white/22 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-mist">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
                  {slide.eyebrow}
                </span>
              </motion.div>
            </AnimatePresence>

            {/* Titre */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={`title-${current}`}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.65, delay: 0.07, ease: [0.21, 0.47, 0.32, 0.98] }}
                className="mt-5 font-display font-extrabold leading-[1.08] tracking-tight text-mist text-3xl sm:text-4xl lg:text-5xl drop-shadow-[0_2px_22px_rgba(0,0,0,0.55)]"
                style={{ whiteSpace: "pre-line" }}
              >
                {slide.title}
              </motion.h1>
            </AnimatePresence>

            {/* Sous-titre */}
            <AnimatePresence mode="wait">
              <motion.p
                key={`sub-${current}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="mt-5 max-w-lg text-xs leading-relaxed text-mist/92 sm:text-sm drop-shadow-[0_1px_14px_rgba(0,0,0,0.45)]"
              >
                {slide.sub}
              </motion.p>
            </AnimatePresence>

            {/* CTA */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`cta-${current}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, delay: 0.28 }}
                className="mt-9 flex flex-wrap items-center gap-4"
              >
                <Link
                  to={slide.cta.to}
                  className="btn-afrilex-primary group h-11 px-6 text-xs font-bold shadow-[0_0_48px_rgba(236,200,90,0.52)] hover:shadow-[0_0_64px_rgba(236,200,90,0.62)]"
                >
                  {slide.cta.label}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
                {slide.ctaSecondary && (
                  <Link
                    to={slide.ctaSecondary.to}
                    className="btn-afrilex-secondary h-11 px-6 text-xs font-bold"
                  >
                    {slide.ctaSecondary.label}
                  </Link>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="hidden lg:grid grid-cols-2 gap-2.5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center rounded-2xl border border-white/18 bg-ink/48 px-4 py-5 text-center"
              >
                <p className="font-display text-3xl font-extrabold text-mist">{s.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-mist/48">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Barre de progression des slides (bas) ── */}
      <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 z-20 px-4 sm:px-8 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Numéros + progress bar */}
          <div className="flex items-end gap-6">
            {safeSlides.map((s, i) => (
              <button
                key={`nav-${i}-${s.tag}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={s.tag}
                className="group flex flex-col items-start gap-2"
              >
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-[0.2em] transition-colors ${
                    i === current ? "text-white" : "text-white/48 group-hover:text-white/72"
                  }`}
                >
                  0{i + 1}
                </span>
                <span className="relative h-[2px] w-14 overflow-hidden rounded-full bg-white/10 sm:w-20">
                  {i === current && (
                    // Animation CSS pure — aucun re-render JS
                    <span
                      key={`bar-${current}`}
                      className="absolute inset-y-0 left-0 rounded-full bg-coral hero-progress-bar"
                    />
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Tag courant */}
          <AnimatePresence mode="wait">
            <motion.span
              key={`tag-${current}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.35 }}
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/18 bg-ink/42 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-lime"
            >
              <span className="h-1 w-1 rounded-full bg-lime" />
              {slide.tag}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Indicateur scroll ── */}
      <div className="absolute bottom-8 right-6 hidden lg:flex flex-col items-center gap-2 opacity-30 sm:right-10 lg:right-16">
        <span
          className="text-[9px] font-bold uppercase tracking-[0.25em] text-mist"
          style={{ writingMode: "vertical-rl" }}
        >
          Scroll
        </span>
        <div className="h-8 w-px bg-gradient-to-b from-mist to-transparent" />
      </div>
    </section>
  );
}
