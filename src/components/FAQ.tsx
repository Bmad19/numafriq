import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-6 py-5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium text-mist leading-snug">{q}</span>
        <span
          className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-mist/50 transition ${open ? "bg-lime/10 border-lime/30 rotate-45 text-lime" : ""}`}
          aria-hidden
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M8 3v10M3 8h10" />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-5 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <p className="text-sm text-mist/60 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export function FAQ() {
  const { t } = useTranslation();
  const faqs = t("faq.items", { returnObjects: true }) as Array<{ q: string; a: string }>;

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-16">
          <AnimateIn>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-lime">{t("faq.eyebrow")}</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl text-balance">
                {t("faq.title")}
              </h2>
              <p className="mt-4 text-mist/55 leading-relaxed">{t("faq.sub")}</p>
              <a
                href="mailto:info@numafriq.com"
                className="mt-6 inline-block text-sm font-medium text-lime transition hover:text-lime/80 hover:underline"
              >
                info@numafriq.com →
              </a>
            </div>
          </AnimateIn>

          <AnimateIn delay={0.2} direction="left">
            <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.03] px-6 shadow-[0_18px_70px_rgba(0,0,0,0.16)] lg:mt-0">
              {faqs.map((f) => (
                <Item key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
