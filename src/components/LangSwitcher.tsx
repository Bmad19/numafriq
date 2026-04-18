import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const LANGS = [
  { code: "fr", label: "FR", full: "Français", flag: "🇫🇷" },
  { code: "en", label: "EN", full: "English",  flag: "🇬🇧" },
];

export function LangSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  function switchTo(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem("numafriq_lang", code);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-mist/70 backdrop-blur-sm transition hover:border-white/30 hover:text-mist"
      >
        <span className="text-sm leading-none">{current.flag}</span>
        {current.label}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`h-2.5 w-2.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay invisible pour fermer */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[130px] overflow-hidden rounded-2xl border border-white/10 bg-ink/95 shadow-2xl backdrop-blur-xl"
            >
              {LANGS.map((lang) => (
                <li key={lang.code}>
                  <button
                    role="option"
                    aria-selected={lang.code === i18n.language}
                    type="button"
                    onClick={() => switchTo(lang.code)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition ${
                      lang.code === i18n.language
                        ? "bg-white/[0.06] font-bold text-mist"
                        : "text-mist/55 hover:bg-white/[0.04] hover:text-mist"
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span className="font-semibold tracking-wide uppercase text-[11px]">{lang.label}</span>
                    <span className="ml-auto text-xs text-mist/35">{lang.full}</span>
                    {lang.code === i18n.language && (
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-lime ml-1 shrink-0">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
