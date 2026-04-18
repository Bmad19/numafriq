import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { AnimateIn } from "./animations/AnimateIn";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  primaryLabel?: string;
  primaryTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
};

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
}: PageHeroProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section className="px-4 pb-8 pt-28 sm:px-6 sm:pt-36 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10">
        <div ref={ref} className="relative min-h-[360px] sm:min-h-[420px] overflow-hidden">
          <motion.img
            src={image}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover origin-bottom"
            style={{ y, scale }}
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/45 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent" />

          <div className="relative flex h-full max-w-3xl flex-col justify-end p-8 sm:p-10">
            <AnimateIn delay={0.1}>
              <p className="text-xs font-semibold uppercase tracking-widest text-lime/90">{eyebrow}</p>
            </AnimateIn>
            <AnimateIn delay={0.2}>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-mist sm:text-5xl text-balance">
                {title}
              </h1>
            </AnimateIn>
            <AnimateIn delay={0.3}>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-mist/80 sm:text-lg">
                {description}
              </p>
            </AnimateIn>

            {(primaryLabel && primaryTo) || (secondaryLabel && secondaryTo) ? (
              <AnimateIn delay={0.4}>
                <div className="mt-8 flex flex-wrap gap-3">
                  {primaryLabel && primaryTo ? (
                    <Link
                      to={primaryTo}
                      className="inline-flex items-center justify-center rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-95"
                    >
                      {primaryLabel}
                    </Link>
                  ) : null}
                  {secondaryLabel && secondaryTo ? (
                    <Link
                      to={secondaryTo}
                      className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-mist transition hover:border-white/40 hover:bg-white/[0.05] active:scale-95"
                    >
                      {secondaryLabel}
                    </Link>
                  ) : null}
                </div>
              </AnimateIn>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
