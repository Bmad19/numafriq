import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

const planTones = [
  "border-white/10 bg-white/[0.03]",
  "border-coral/40 bg-gradient-to-br from-coral/15 to-white/[0.02]",
  "border-lime/35 bg-gradient-to-br from-lime/10 to-white/[0.02]",
];


export function Pricing() {
  const { t } = useTranslation();
  const plans = (t("pricing.plans", { returnObjects: true }) as Array<{
    name: string; subtitle: string; price: string; features: string[]; cta: string; featured?: boolean;
  }>).map((p, i) => ({ ...p, tone: planTones[i] }));

  return (
    <section id="tarifs" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AnimateIn>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-coral">{t("pricing.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl text-balance">
              {t("pricing.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-mist/60">{t("pricing.sub")}</p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-mist/45">{t("pricing.sub2")}</p>
          </div>
        </AnimateIn>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <AnimateIn key={plan.name} delay={index * 0.1}>
              <article
                className={`relative h-full overflow-hidden rounded-3xl border p-7 transition duration-300 hover:-translate-y-1 hover:border-white/35 hover:shadow-[0_18px_70px_rgba(0,0,0,0.22)] ${plan.tone}`}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                {plan.featured ? (
                  <span className="absolute right-4 top-4 rounded-full border border-coral/60 bg-coral/20 px-3 py-1 text-xs font-semibold text-coral">
                    {t("pricing.badge")}
                  </span>
                ) : null}

                <p className="font-display text-3xl font-bold text-mist">{plan.name}</p>
                <p className="mt-2 text-sm text-mist/55">{plan.subtitle}</p>
                <p className="mt-6 font-display text-2xl font-semibold text-lime">{plan.price}</p>
                <div className="mt-4 h-px w-full bg-white/10" />

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-mist/75">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/contact#contact"
                  className={`mt-7 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition hover:brightness-110 active:scale-95 ${
                    plan.featured ? "bg-coral text-white" : "bg-white/10 text-mist"
                  }`}
                >
                  {plan.cta}
                </Link>
              </article>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
