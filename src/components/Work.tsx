import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

const cases = [
  {
    name: "Maison Atlas",
    cat: "Vitrine",
    sector: "Luxe & retail",
    tone: "from-amber-900/40 to-stone-900",
    tags: ["E-commerce", "Design system", "SEO"],
    result: "+40 % conversions",
    link: "#",
  },
  {
    name: "Pulse Fitness",
    cat: "Application",
    sector: "Sport & app mobile",
    tone: "from-emerald-900/50 to-ink",
    tags: ["App web", "Dashboard", "UX"],
    result: "−60 % taux de rebond",
    link: "#",
  },
  {
    name: "Studio Nord",
    cat: "SEO",
    sector: "Agence créative",
    tone: "from-violet-900/40 to-ink",
    tags: ["Portfolio", "Animations", "CMS"],
    result: "3× trafic organique",
    link: "#",
  },
  {
    name: "Greenline",
    cat: "Vitrine",
    sector: "Impact & RSE",
    tone: "from-lime-900/30 to-ink",
    tags: ["Landing page", "Lead gen", "Analytics"],
    result: "1 200 leads / mois",
    link: "#",
  },
  {
    name: "BarkaPro",
    cat: "E-commerce",
    sector: "Distribution",
    tone: "from-coral/25 to-ink",
    tags: ["Catalogue", "Paiement", "SEO local"],
    result: "+85 % commandes web",
    link: "#",
  },
  {
    name: "Rayon Tours",
    cat: "SEO",
    sector: "Tourisme",
    tone: "from-sky-900/40 to-ink",
    tags: ["SEO", "Google Business", "Tracking"],
    result: "Top 3 sur 12 mots-clés",
    link: "#",
  },
];

export function Work() {
  const { t } = useTranslation();
  const filters = t("work.filters", { returnObjects: true }) as string[];
  const [activeFilter, setActiveFilter] = useState(filters[0]);

  const visibleCases = useMemo(() => {
    if (activeFilter === filters[0]) return cases;
    const catMap: Record<string, string> = {
      "Vitrine": "Vitrine", "Showcase": "Vitrine",
      "E-commerce": "E-commerce",
      "SEO": "SEO",
      "Application": "Application", "App": "Application",
    };
    const mapped = catMap[activeFilter] ?? activeFilter;
    return cases.filter((item) => item.cat === mapped);
  }, [activeFilter, filters]);

  return (
    <section id="realisations" className="scroll-mt-24 border-y border-white/10 bg-white/[0.02] py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AnimateIn>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-lime">{t("work.eyebrow")}</p>
              <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl">{t("work.title")}</h2>
              <p className="mt-2 text-mist/50 text-sm">{t("work.sub")}</p>
            </div>
            <Link
              to="/contact#contact"
              className="shrink-0 inline-flex items-center gap-1 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-mist/70 transition hover:border-white/30 hover:text-mist active:scale-95"
            >
              {t("work.cta")}
            </Link>
          </div>
        </AnimateIn>

        <AnimateIn delay={0.2}>
          <div className="mt-8 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  activeFilter === filter
                    ? "border-coral/70 bg-coral/15 text-coral"
                    : "border-white/15 bg-white/[0.02] text-mist/60 hover:border-white/30 hover:text-mist/85"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </AnimateIn>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {visibleCases.map((c, index) => (
            <AnimateIn key={c.name} delay={index * 0.05}>
              <article
                className={`group relative flex h-full min-h-[300px] flex-col justify-end overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br p-8 ${c.tone} transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_18px_70px_rgba(0,0,0,0.22)] cursor-pointer`}
              >
                {/* Texture overlay */}
                <div
                  className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/G%3E%3C/svg%3E')] opacity-50"
                  aria-hidden
                />
                {/* Result pill — visible on hover */}
                <div className="absolute right-6 top-6 translate-y-2 rounded-full border border-white/15 bg-ink/60 px-3 py-1 text-xs font-semibold text-lime opacity-0 backdrop-blur-sm transition group-hover:translate-y-0 group-hover:opacity-100">
                  {c.result}
                </div>

                <div className="relative">
                  <p className="text-xs font-medium uppercase tracking-wider text-mist/50">
                    {c.cat} · {c.sector}
                  </p>
                  <h3 className="mt-2 font-display text-3xl font-bold text-mist">{c.name}</h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-mist/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist/60">
                    Une direction claire, une execution propre et un objectif business mesurable.
                  </p>
                  <a
                    href={c.link}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-mist/70 opacity-0 transition group-hover:opacity-100"
                  >
                    {t("work.see")}
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 translate-x-0 transition group-hover:translate-x-1">
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </a>
                </div>
              </article>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
