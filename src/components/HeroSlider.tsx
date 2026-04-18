import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export type HeroSlide = {
  tag: string;
  eyebrow: string;
  title: string;
  sub: string;
  image: string;
  accent: string;
  cta: { label: string; to: string };
  ctaSecondary?: { label: string; to: string };
};

const defaultSlides: HeroSlide[] = [
  {
    tag: "Présence digitale",
    eyebrow: "Site vitrine & image de marque",
    title: "Un site qui inspire\nconfiance et\nconvertit.",
    sub: "Nous concevons des sites web clairs, rassurants et orientés résultats pour renforcer votre crédibilité et transformer vos visiteurs en clients.",
    image: "https://images.unsplash.com/photo-1573164574511-73c773193279?auto=format&fit=crop&w=1920&q=80",
    accent: "from-coral/50 to-orange-500/0",
    cta: { label: "Créer mon site", to: "/contact#contact" },
    ctaSecondary: { label: "Nos réalisations", to: "/realisations" },
  },
  {
    tag: "Acquisition & SEO",
    eyebrow: "SEO, contenu, acquisition",
    title: "Soyez trouvé par\nceux qui ont\nbesoin de vous.",
    sub: "Référencement naturel, campagnes Ads et stratégie de contenu pensés pour votre marché — en Afrique comme à l'international.",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1920&q=80",
    accent: "from-lime/50 to-emerald-500/0",
    cta: { label: "Booster ma visibilité", to: "/services" },
    ctaSecondary: { label: "Nos réalisations", to: "/realisations" },
  },
  {
    tag: "UX & Croissance",
    eyebrow: "Design & différenciation",
    title: "Démarquez-vous\navec un design\nqui fait vendre.",
    sub: "Positionnement, UX et tunnel de conversion pensés pour faire émerger votre marque et défendre votre valeur face à la concurrence.",
    image: "https://images.unsplash.com/photo-1573164574397-dd250bc8a598?auto=format&fit=crop&w=1920&q=80",
    accent: "from-violet/50 to-purple-500/0",
    cta: { label: "Démarrer un projet", to: "/contact#contact" },
    ctaSecondary: { label: "Nos réalisations", to: "/realisations" },
  },
];

type Props = { slides?: HeroSlide[] };

export function HeroSlider({ slides = defaultSlides }: Props) {
  const { t } = useTranslation();
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
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, DURATION);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [current, slides.length]);

  const slide = slides[current];

  return (
    <section
      className="relative -mx-4 overflow-hidden sm:-mx-6 lg:-mx-8"
      style={{
        height: "100svh",
        minHeight: 560,
        maxHeight: 1080,
        /* remonte derrière portailbar (28px) + header (64px) = 92px */
        marginTop: "calc(-92px)",
      }}
    >
      {/* ── Images préchargées, toutes montées, visibilité gérée par opacity ── */}
      {slides.map((s, i) => (
        <motion.div
          key={s.image}
          className="absolute inset-0"
          animate={{ opacity: i === current ? 1 : 0, scale: i === current ? 1.06 : 1.02 }}
          transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <img
            src={s.image}
            alt={s.eyebrow}
            className="h-full w-full object-cover"
            style={i === 1 ? { objectPosition: "50% 15%" } : { objectPosition: "center" }}
            loading={i === 0 ? "eager" : "lazy"}
          />
        </motion.div>
      ))}

      {/* ── Overlays ── */}
      <div className="absolute inset-0 bg-ink/60" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-ink/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-transparent" />

      {/* ── Accent glow par slide ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`glow-${current}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          className={`pointer-events-none absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-tr ${slide.accent} blur-[120px]`}
        />
      </AnimatePresence>

      {/* ── Contenu principal ── */}
      <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-20 sm:px-8 sm:pb-24 lg:px-16">
        <div className="mx-auto w-full max-w-7xl grid lg:grid-cols-[1fr_260px] lg:items-end gap-6 lg:gap-10">

          {/* Texte */}
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
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-mist/75 backdrop-blur-md">
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
                className="mt-5 font-display font-extrabold leading-[1.08] tracking-tight text-mist text-3xl sm:text-4xl lg:text-5xl"
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
                className="mt-5 max-w-lg text-xs leading-relaxed text-mist/65 sm:text-sm"
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
                  className="group inline-flex h-11 items-center gap-2 rounded-full bg-coral px-6 text-xs font-bold text-white shadow-[0_0_40px_rgba(255,107,74,0.35)] transition-all hover:brightness-110 hover:shadow-[0_0_60px_rgba(255,107,74,0.55)] active:scale-95"
                >
                  {slide.cta.label}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-1">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
                {slide.ctaSecondary && (
                  <Link
                    to={slide.ctaSecondary.to}
                    className="inline-flex h-11 items-center rounded-full border border-white/20 bg-white/[0.04] px-6 text-xs font-bold text-mist/90 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 active:scale-95"
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
                className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-ink/40 px-4 py-5 backdrop-blur-xl text-center"
              >
                <p className="font-display text-3xl font-extrabold text-mist">{s.value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-mist/40">{s.label}</p>
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
            {slides.map((s, i) => (
              <button
                key={s.tag}
                type="button"
                onClick={() => goTo(i)}
                aria-label={s.tag}
                className="group flex flex-col items-start gap-2"
              >
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-[0.2em] transition-colors ${
                    i === current ? "text-white" : "text-white/30 group-hover:text-white/60"
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
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-lime/90 backdrop-blur-md"
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
