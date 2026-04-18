import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

const testimonials = [
  {
    name: "Aïcha Traoré",
    role: "CEO, Maison Atlas",
    avatar: "AT",
    color: "from-amber-500/20 to-orange-500/10",
    text: "NUMAFRIQ a transformé notre présence en ligne en 3 semaines. Le taux de conversion a augmenté de 40 %. Résultat bluffant, équipe ultra-réactive.",
    stars: 5,
  },
  {
    name: "Kofi Mensah",
    role: "Directeur Marketing, Pulse Fitness",
    avatar: "KM",
    color: "from-emerald-500/20 to-teal-500/10",
    text: "Design très soigné, communication transparente à chaque étape. On a livré en avance sur le planning — rare dans ce secteur.",
    stars: 5,
  },
  {
    name: "Sébastien Laurent",
    role: "Fondateur, Studio Nord",
    avatar: "SL",
    color: "from-violet-500/20 to-purple-500/10",
    text: "Équipe créative, code de qualité et un vrai sens de l'esthétique. Notre site reflète enfin notre positionnement premium.",
    stars: 5,
  },
  {
    name: "Fatou Diallo",
    role: "Directrice, Greenline Impact",
    avatar: "FD",
    color: "from-lime-500/20 to-green-500/10",
    text: "Process clair, pricing honnête et résultat à la hauteur. Je recommande NUMAFRIQ les yeux fermés pour tout projet digital sérieux.",
    stars: 5,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} étoiles sur 5`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="h-4 w-4 text-lime" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  const { t } = useTranslation();
  const stats = t("testimonials.stats", { returnObjects: true }) as Array<{ n: string; l: string }>;

  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AnimateIn>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet">
              {t("testimonials.eyebrow")}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl text-balance">
              {t("testimonials.title")}
            </h2>
            <p className="mt-4 text-mist/55">{t("testimonials.sub")}</p>
          </div>
        </AnimateIn>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {testimonials.map((t, index) => (
            <AnimateIn key={t.name} delay={index * 0.1}>
              <figure
                className={`h-full rounded-3xl border border-white/10 bg-gradient-to-br ${t.color} p-7 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_70px_rgba(0,0,0,0.18)]`}
              >
                <Stars count={t.stars} />
                <blockquote className="mt-4 text-mist/80 leading-relaxed">
                  &ldquo;{t.text}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-sm font-bold text-mist"
                    aria-hidden
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-mist">{t.name}</p>
                    <p className="text-xs text-mist/45">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn delay={0.2} direction="up">
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-center text-xs uppercase tracking-widest text-mist/40">
              {t("testimonials.trust")}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {["PME", "Startups", "ONG", "Institutions", "E-commerce", "Cabinets", "BTP"].map((brand) => (
                <span
                  key={brand}
                  className="rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-mist/70"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </AnimateIn>

        {/* Social proof bar */}
        <AnimateIn delay={0.3} direction="up">
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-6 text-center">
            {stats.map((s) => (
              <div key={s.l}>
                <p className="font-display text-2xl font-bold text-lime">{s.n}</p>
                <p className="mt-0.5 text-xs text-mist/45">{s.l}</p>
              </div>
            ))}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
