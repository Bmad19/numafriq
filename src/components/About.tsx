import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

export function About() {
  const { t } = useTranslation();
  const points  = t("about.points", { returnObjects: true }) as string[];
  const stats   = t("about.stats",  { returnObjects: true }) as Array<{ n: string; l: string }>;
  const dotColors = ["bg-coral","bg-lime","bg-violet"];

  return (
    <section id="apropos" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <AnimateIn>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-violet">{t("about.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl text-balance">
              {t("about.title")}
            </h2>
            <p className="mt-6 text-mist/60 leading-relaxed">{t("about.p1")}</p>
            <ul className="mt-8 space-y-4 text-mist/80">
              {points.map((pt, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColors[i]}`} aria-hidden />
                  {pt}
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-wider text-mist/40">{t("about.distinguish")}</p>
              <p className="mt-2 text-sm leading-relaxed text-mist/70">{t("about.distinguishText")}</p>
            </div>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-wider text-mist/45">{t("about.markets")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Ouagadougou", "Abidjan", "Dakar", "Cotonou", "Douala", "Diaspora"].map((city) => (
                  <span key={city} className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-mist/75">
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </AnimateIn>

        <AnimateIn delay={0.2} direction="left">
          <div className="relative">
            <div className="aspect-[4/5] max-h-[460px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-coral/20 via-violet/10 to-lime/20 p-1 shadow-[0_18px_70px_rgba(0,0,0,0.22)] hover:scale-[1.02] transition-transform duration-500">
              <div className="flex h-full flex-col justify-between rounded-[1.35rem] bg-ink/90 p-8">
                <div>
                  <p className="font-display text-5xl font-extrabold text-mist/10">01</p>
                  <p className="-mt-4 font-display text-xl font-semibold text-mist">{t("about.card.method")}</p>
                  <p className="mt-3 text-sm text-mist/50 leading-relaxed">{t("about.card.methodSub")}</p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-wider text-mist/40">{t("about.card.slot")}</p>
                    <p className="mt-1 font-display text-2xl font-bold text-lime">{t("about.card.slotDate")}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-wider text-mist/40">{t("about.card.position")}</p>
                    <p className="mt-1 text-sm leading-relaxed text-mist/70">{t("about.card.positionText")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {stats.map((item) => (
                <div key={item.l} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center transition hover:bg-white/[0.06]">
                  <p className="font-display text-lg font-bold text-coral">{item.n}</p>
                  <p className="mt-1 text-[11px] text-mist/55">{item.l}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
