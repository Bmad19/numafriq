import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { AnimateIn } from "./animations/AnimateIn";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  /** Alignement du portrait sous les dégradés (ex. `50% 28%`). */
  imageObjectPosition?: string;
  primaryLabel?: string;
  primaryTo?: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  tertiaryLabel?: string;
  tertiaryTo?: string;
};

function isExternalHref(to: string) {
  return /^https?:\/\//i.test(to);
}

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  imageObjectPosition = "50% 28%",
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
  tertiaryLabel,
  tertiaryTo,
}: PageHeroProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <section className="px-4 pb-8 pt-[7.5rem] sm:px-6 sm:pt-40 lg:px-8">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/14">
        <div ref={ref} className="relative min-h-[360px] sm:min-h-[420px] overflow-hidden">
          <motion.img
            src={image}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover origin-bottom"
            style={{ y, scale, objectPosition: imageObjectPosition }}
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/46 via-ink/18 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/28 via-transparent to-transparent" />

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
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-mist/90 sm:text-lg">
                {description}
              </p>
            </AnimateIn>

            {(primaryLabel && primaryTo) ||
            (secondaryLabel && secondaryTo) ||
            (tertiaryLabel && tertiaryTo) ? (
              <AnimateIn delay={0.4}>
                <div className="mt-8 flex flex-wrap gap-3">
                  {primaryLabel && primaryTo ? (
                    isExternalHref(primaryTo) ? (
                      <a
                        href={primaryTo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-coral px-6 py-3 text-sm font-semibold text-ink transition hover:brightness-110 active:scale-95"
                      >
                        {primaryLabel}
                      </a>
                    ) : (
                      <Link
                        to={primaryTo}
                        className="inline-flex items-center justify-center rounded-full bg-coral px-6 py-3 text-sm font-semibold text-ink transition hover:brightness-110 active:scale-95"
                      >
                        {primaryLabel}
                      </Link>
                    )
                  ) : null}
                  {secondaryLabel && secondaryTo ? (
                    isExternalHref(secondaryTo) ? (
                      <a
                        href={secondaryTo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-mist transition hover:border-white/40 hover:bg-white/[0.05] active:scale-95"
                      >
                        {secondaryLabel}
                      </a>
                    ) : (
                      <Link
                        to={secondaryTo}
                        className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-mist transition hover:border-white/40 hover:bg-white/[0.05] active:scale-95"
                      >
                        {secondaryLabel}
                      </Link>
                    )
                  ) : null}
                  {tertiaryLabel && tertiaryTo ? (
                    isExternalHref(tertiaryTo) ? (
                      <a
                        href={tertiaryTo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-mist transition hover:border-white/30 hover:bg-white/[0.1] active:scale-95"
                      >
                        {tertiaryLabel}
                      </a>
                    ) : (
                      <Link
                        to={tertiaryTo}
                        className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-mist transition hover:border-white/30 hover:bg-white/[0.1] active:scale-95"
                      >
                        {tertiaryLabel}
                      </Link>
                    )
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
