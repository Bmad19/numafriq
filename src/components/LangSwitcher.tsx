import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const LANGS = [
  { code: "fr", label: "FR", full: "Français" },
  { code: "en", label: "EN", full: "English" },
] as const;

function FlagFr({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className} aria-hidden>
      <rect width="1" height="2" fill="#002395" />
      <rect x="1" width="1" height="2" fill="#fff" />
      <rect x="2" width="1" height="2" fill="#CE1126" />
    </svg>
  );
}

/** Mini Union Jack (lisible dans un cercle ~32px) */
function FlagGb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 36" className={className} aria-hidden>
      <rect width="60" height="36" fill="#012169" />
      <path stroke="#fff" strokeWidth="10" d="M0 0l60 36M60 0L0 36" />
      <path stroke="#C8102E" strokeWidth="6" d="M0 0l60 36M60 0L0 36" />
      <path stroke="#fff" strokeWidth="14" d="M30 0v36M0 18h60" />
      <path stroke="#C8102E" strokeWidth="9" d="M30 0v36M0 18h60" />
    </svg>
  );
}

function FlagIcon({ code, className }: { code: string; className?: string }) {
  if (code === "fr") return <FlagFr className={className} />;
  return <FlagGb className={className} />;
}

export function LangSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => i18n.language.startsWith(l.code)) ?? LANGS[0];

  function switchTo(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem("afrilex_lang", code);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Langue : ${current.full}`}
        className="group flex items-center gap-2 rounded-full border border-white/[0.14] bg-gradient-to-br from-white/[0.09] to-white/[0.02] py-1 pl-1 pr-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition hover:border-white/25 hover:from-white/[0.11] hover:to-white/[0.04] hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)] active:scale-[0.98] sm:pl-1 sm:pr-3 sm:py-1"
      >
        <span
          className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-[1.5px] ring-white/25 shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)] transition ring-offset-2 ring-offset-ink/80 group-hover:ring-white/40"
          aria-hidden
        >
          <FlagIcon code={current.code} className="h-full w-full scale-[1.15] object-cover" />
        </span>
        <span className="hidden min-[380px]:flex flex-col items-start leading-none">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-mist/55">Langue</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs font-bold tracking-wide text-mist/92">
            {current.label}
          </span>
        </span>
        <span className="min-[380px]:hidden text-[11px] font-extrabold uppercase tracking-wider text-mist/90">{current.label}</span>
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-2.5 w-2.5 shrink-0 text-mist/45 transition-transform duration-200 group-hover:text-mist/65 ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />

            <motion.ul
              role="listbox"
              aria-label="Choisir la langue"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-[calc(100%+10px)] z-50 min-w-[200px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c0e11]/96 p-1.5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
            >
              {LANGS.map((lang) => {
                const active = lang.code === i18n.language || i18n.language.startsWith(lang.code);
                return (
                  <li key={lang.code}>
                    <button
                      role="option"
                      aria-selected={active}
                      type="button"
                      onClick={() => switchTo(lang.code)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active
                          ? "bg-gradient-to-r from-white/[0.09] to-transparent ring-1 ring-white/[0.08]"
                          : "hover:bg-white/[0.05]"
                      }`}
                    >
                      <span
                        className={`relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full ring-[1.5px] shadow-inner ${
                          active ? "ring-lime/50" : "ring-white/20"
                        }`}
                        aria-hidden
                      >
                        <FlagIcon code={lang.code} className="h-full w-full scale-[1.12]" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={`text-[11px] font-bold uppercase tracking-[0.16em] ${active ? "text-mist" : "text-mist/55"}`}>
                          {lang.label}
                        </span>
                        <span className={`truncate text-[13px] font-medium leading-tight ${active ? "text-mist/90" : "text-mist/45"}`}>
                          {lang.full}
                        </span>
                      </span>
                      {active && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime/15">
                          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-lime">
                            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
