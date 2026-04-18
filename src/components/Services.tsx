import { useTranslation } from "react-i18next";
import { AnimateIn } from "./animations/AnimateIn";

const items = [
  {
    title: "Audit & stratégie digitale",
    desc: "Analyse de votre marché, de vos objectifs et de vos canaux pour poser une feuille de route claire, réaliste et actionnable.",
    tag: "Stratégie",
    glowClass: "group-hover:bg-coral/25",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M4 19h16M7 16V8m5 8V5m5 11v-6" />
      </svg>
    ),
  },
  {
    title: "Sites & landing pages",
    desc: "Pages rapides, lisibles et orientées conversion pour présenter votre offre, rassurer vos prospects et déclencher l'action.",
    tag: "Web",
    glowClass: "group-hover:bg-lime/25",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    title: "E-commerce & boutiques",
    desc: "Boutiques fluides avec tunnel d'achat clair, paiements adaptés et expérience pensée pour convertir davantage.",
    tag: "Shop",
    glowClass: "group-hover:bg-coral/25",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    title: "Identité visuelle & UI",
    desc: "Direction artistique, design system et interfaces cohérentes pour créer une image forte et immédiatement reconnaissable.",
    tag: "Design",
    glowClass: "group-hover:bg-violet/25",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 000 20M2 12h20" />
      </svg>
    ),
  },
  {
    title: "Performance & SEO",
    desc: "Performance technique, SEO, contenus structurés et analytics pour être visible, crédible et plus facile à trouver.",
    tag: "SEO",
    glowClass: "group-hover:bg-lime/20",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: "Publicité digitale (SEA & Social Ads)",
    desc: "Google Ads, Meta Ads et campagnes localisées pour générer rapidement du trafic qualifié et des opportunités commerciales.",
    tag: "Acquisition",
    glowClass: "group-hover:bg-coral/20",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M3 12h18M12 3v18" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    title: "Google Business & Maps",
    desc: "Optimisation de votre fiche locale, de vos avis et de votre présence cartographique pour capter plus de demandes à proximité.",
    tag: "Local",
    glowClass: "group-hover:bg-lime/20",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    title: "Applications web sur-mesure",
    desc: "SaaS, dashboards et portails clients conçus pour simplifier vos opérations et offrir une expérience fluide.",
    tag: "App",
    glowClass: "group-hover:bg-violet/20",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: "Contenu web & community management",
    desc: "Rédaction orientée SEO, pages de vente et animation éditoriale pour renforcer votre image et votre visibilité.",
    tag: "Contenu",
    glowClass: "group-hover:bg-coral/20",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    title: "Maintenance & accompagnement",
    desc: "Mises à jour, sécurité, évolutions et support prioritaire pour faire vivre votre site après la mise en ligne.",
    tag: "Support",
    glowClass: "group-hover:bg-violet/20",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

export function Services() {
  const { t } = useTranslation();
  return (
    <section id="services" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <AnimateIn>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-coral">{t("services.eyebrow")}</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-mist sm:text-4xl md:text-5xl text-balance">
                {t("services.title")}
              </h2>
              <p className="mt-4 max-w-2xl text-mist/60">{t("services.sub")}</p>
            </div>
          </AnimateIn>
          <AnimateIn delay={0.2}>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 md:max-w-xs">
              <p className="text-xs uppercase tracking-widest text-mist/40">{t("services.approach")}</p>
              <p className="mt-2 text-sm leading-relaxed text-mist/70">{t("services.approachText")}</p>
            </div>
          </AnimateIn>
        </div>

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {items.map((item, index) => (
            <AnimateIn key={item.title} delay={index * 0.05}>
              <li
                className="group relative h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-7 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_70px_rgba(0,0,0,0.22)]"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-mist/70 transition group-hover:text-lime">
                    {item.icon}
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-lime">
                    {item.tag}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-bold text-mist">{item.title}</h3>
                <p className="mt-3 text-sm text-mist/55 leading-relaxed">{item.desc}</p>
              <div className="mt-6 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-mist/45 transition group-hover:text-coral">
                {t("services.cta")}
                  <span aria-hidden>→</span>
                </div>
                <span
                  className={`absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-violet/10 blur-2xl transition ${item.glowClass}`}
                  aria-hidden
                />
              </li>
            </AnimateIn>
          ))}
        </ul>
      </div>
    </section>
  );
}
