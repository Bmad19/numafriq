import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

type ParallaxFigureProps = {
  src: string;
  alt: string;
  /** Classes du conteneur (aspect-ratio, radius sur le parent si besoin). */
  className?: string;
  /** Centrage du recadrage (`object-position` CSS), ex. `"50% 30%"`. */
  objectPosition?: string;
};

/**
 * Image pleine largeur dans un cadre overflow:hidden ; léger mouvement vertical au scroll.
 */
export function ParallaxFigure({ src, alt, className = "", objectPosition }: ParallaxFigureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-11%", "11%"]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div className="absolute inset-x-0 top-[-12%] h-[124%] w-full will-change-transform" style={{ y }}>
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          style={objectPosition ? { objectPosition } : undefined}
          loading="lazy"
          decoding="async"
        />
      </motion.div>
    </div>
  );
}
