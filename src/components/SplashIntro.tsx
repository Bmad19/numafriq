import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "./BrandLogo";

const STORAGE_KEY = "afrilex_splash_session";

function readSkip(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
  } catch {
    /* navigation privée */
  }
  return false;
}

/**
 * Plein écran au premier chargement du site vitrine (une fois par onglet).
 * Clic ou Échap pour passer plus vite.
 */
export function SplashIntro() {
  const [present, setPresent] = useState(() => !readSkip());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPresent(false);
  }, []);

  useEffect(() => {
    if (!present) return;
    const id = requestAnimationFrame(() => layerRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [present]);

  useEffect(() => {
    timerRef.current = window.setTimeout(dismiss, 2200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [present, dismiss]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, dismiss]);

  return (
    <AnimatePresence
      onExitComplete={() => {
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          /* ignore */
        }
        document.documentElement.style.overflow = "";
      }}
    >
      {present && (
        <motion.div
          key="afrilex-splash"
          ref={layerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Afrilex Conseil"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[220] flex cursor-pointer flex-col items-center justify-center bg-ink outline-none focus-visible:ring-2 focus-visible:ring-coral/45 focus-visible:ring-offset-4 focus-visible:ring-offset-ink"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 90% 70% at 50% 42%, rgba(236,200,90,0.38) 0%, transparent 58%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(255,252,248,0.26) 0%, transparent 48%)",
          }}
          onClick={dismiss}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              dismiss();
            }
          }}
          tabIndex={0}
        >
          <div className="pointer-events-none absolute inset-0 bg-[length:48px_48px] bg-grid-pattern opacity-[0.4]" aria-hidden />

          <motion.div
            className="relative z-10 flex flex-col items-center gap-10 px-6"
            initial={{ opacity: 0, scale: 0.88, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <BrandLogo variant="auth" className="scale-[1.02] sm:scale-110" />
            </motion.div>

            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38, duration: 0.48 }}
            >
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />
              <p className="max-w-[16rem] text-center font-display text-[11px] font-semibold uppercase tracking-[0.35em] text-white/55">
                Cabinet juridique, fiscal&nbsp;&amp;&nbsp;comptable
              </p>
            </motion.div>
          </motion.div>

          <motion.p
            className="pointer-events-none absolute bottom-10 left-0 right-0 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.4 }}
          >
            Touchez l&apos;écran ou appuyez sur Échap pour continuer
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
