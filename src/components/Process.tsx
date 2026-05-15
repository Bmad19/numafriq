import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

const colors = [
  { color: "text-coral", border: "border-coral/30", glow: "bg-coral/20" },
  { color: "text-lime",  border: "border-lime/30",  glow: "bg-lime/20"  },
  { color: "text-violet",border: "border-violet/30",glow: "bg-violet/20"},
  { color: "text-coral", border: "border-coral/30", glow: "bg-coral/20" },
  { color: "text-lime",  border: "border-lime/30",  glow: "bg-lime/20"  },
];

export function Process() {
  const { t } = useTranslation();
  const rawSteps = t("process.steps", { returnObjects: true }) as Array<{ n: string; title: string; desc: string }>;
  const steps = rawSteps.map((s, i) => ({ ...s, ...colors[i] }));
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:gap-16 lg:items-start">
          {/* Header sticky */}
          <div className="lg:sticky lg:top-28">
            <AnimateIn>
              <p className="text-sm font-semibold uppercase tracking-widest text-coral">{t("process.eyebrow")}</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl text-balance">
                {t("process.title")}
              </h2>
              <p className="mt-4 text-mist/77 leading-relaxed">{t("process.sub")}</p>
              <Link
                to="/contact#contact"
                className="btn-afrilex-primary mt-8 gap-2 px-6 py-3 text-sm"
              >
                {t("process.cta")}
              </Link>
            </AnimateIn>
          </div>

          {/* Steps */}
          <ol className="mt-12 space-y-5 lg:mt-0">
            {steps.map((s, i) => (
              <AnimateIn key={s.n} delay={i * 0.1} direction="left">
                <li
                  className={`group relative flex gap-6 rounded-2xl border ${s.border} bg-white/[0.03] p-6 transition hover:bg-white/[0.06]`}
                >
                  <div
                    className={`shrink-0 flex h-12 w-12 items-center justify-center rounded-xl ${s.glow} font-display text-lg font-extrabold ${s.color}`}
                  >
                    {s.n}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-mist">{s.title}</h3>
                    <p className="mt-1.5 text-sm text-mist/77 leading-relaxed">{s.desc}</p>
                  </div>
                </li>
              </AnimateIn>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
