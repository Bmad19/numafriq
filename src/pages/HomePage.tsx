import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Seo } from "../components/Seo";
import { AnimateIn } from "../components/animations/AnimateIn";
import { Parallax } from "../components/animations/Parallax";
import { HeroSlider, HeroSlide } from "../components/HeroSlider";

const needCardImages = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80",
];
const needCardTos  = ["/services", "/tarifications", "/realisations"];

const valueImages = [
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1531496730074-83b638c0a7ac?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
];

const clients = ["Telecel Faso","IAM Gold","PNUD","Banque Mondiale","AFD","Union Africaine","PME & Startups","Marques e-commerce"];


export function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const rawSlides = t("homeSlides", { returnObjects: true }) as Array<{
    tag: string; eyebrow: string; title: string; sub: string; cta: string; ctaSecondary: string;
  }>;

  const slides: HeroSlide[] = rawSlides.map((s, i) => {
    const images = [
      "https://images.unsplash.com/photo-1573164574511-73c773193279?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=1920&q=80",
      "https://images.unsplash.com/photo-1573164574397-dd250bc8a598?auto=format&fit=crop&w=1920&q=80",
    ];
    const accents = ["from-coral/50 to-orange-500/0", "from-lime/50 to-emerald-500/0", "from-violet/50 to-purple-500/0"];
    const positions: Array<"center" | "50% 15%" | "center"> = ["center", "50% 15%", "center"];
    return {
      tag: s.tag, eyebrow: s.eyebrow, title: s.title, sub: s.sub,
      image: images[i], accent: accents[i],
      cta: { label: s.cta, to: "/contact#contact" },
      ctaSecondary: { label: s.ctaSecondary, to: "/realisations" },
    };
  });

  const needCards = (t("home.need", { returnObjects: true }) as Array<{ title: string; text: string; cta: string; }>)
    .map((c, i) => ({ ...c, image: needCardImages[i], to: needCardTos[i] }));

  const valueItems = (t("home.values", { returnObjects: true }) as Array<{ title: string; desc: string; }>)
    .map((v, i) => ({ ...v, image: valueImages[i] }));

  return (
    <>
      <Seo
        title={lang === "en" ? "Home" : "Accueil"}
        description="NUMAFRIQ — Digital agency for ambitious African brands."
      />

      {/* ── Hero Slider plein écran ── */}
      <HeroSlider slides={slides} />

      <div className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl pt-20">

          {/* ── Section : De quoi avez-vous besoin ? ── */}
          <section className="mt-8">
            <AnimateIn>
              <p className="text-sm font-semibold uppercase tracking-widest text-coral">
                {t("home.needTitle")}
              </p>
            </AnimateIn>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {needCards.map((item, index) => (
                <AnimateIn key={item.title} delay={index * 0.1}>
                  <Parallax offset={20}>
                    <Link
                      to={item.to}
                      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.98]"
                    >
                      <div className="relative h-48 w-full overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-6">
                        <h2 className="font-display text-2xl font-bold text-mist">{item.title}</h2>
                        <p className="mt-3 text-sm leading-relaxed text-mist/60">{item.text}</p>
                        <p className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-lime transition group-hover:text-coral">
                          {item.cta}
                          <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                        </p>
                      </div>
                    </Link>
                  </Parallax>
                </AnimateIn>
              ))}
            </div>
          </section>

          {/* ── Section : Nos valeurs ── */}
          <AnimateIn>
            <section className="mt-20 relative overflow-hidden rounded-3xl border border-white/10 bg-ink/50 p-7 md:p-10">
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1920&q=80"
                  alt="Background valeurs"
                  className="h-full w-full object-cover opacity-10 mix-blend-luminosity grayscale"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-ink/90 via-ink/80 to-lime/10" />
              </div>
              <div className="relative z-10 grid gap-8 md:grid-cols-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-lime">{t("home.valuesTag")}</p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-mist text-balance">
                    {t("home.valuesTitle")}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-mist/60">
                    {t("home.valuesSub")}
                  </p>
                </div>
                <div className="grid gap-4 md:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
                  {valueItems.map((item, index) => (
                    <AnimateIn key={item.title} delay={0.2 + index * 0.1}>
                      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink/65 backdrop-blur-sm transition hover:bg-ink/80 hover:border-lime/30">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-32 w-full shrink-0 object-cover"
                          loading="lazy"
                        />
                        <div className="flex grow flex-col p-5">
                          <h3 className="font-display text-xl font-bold text-mist">{item.title}</h3>
                          <p className="mt-2 text-sm text-mist/60">{item.desc}</p>
                        </div>
                      </div>
                    </AnimateIn>
                  ))}
                </div>
              </div>
            </section>
          </AnimateIn>

          {/* ── Section : Références ── */}
          <AnimateIn>
            <section className="mt-20 relative overflow-hidden rounded-3xl border border-white/10 bg-ink/50 p-8 sm:p-12 lg:p-16">
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1920&q=80"
                  alt="Background"
                  className="h-full w-full object-cover opacity-40 mix-blend-luminosity"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-transparent" />
              </div>
              <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-widest text-coral">{t("home.refsTag")}</p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl text-balance">
                    {t("home.refsTitle")}
                  </h2>
                  <p className="mt-4 text-mist/60 leading-relaxed max-w-lg">
                    {t("home.refsSub")}
                  </p>
                  <Link
                    to="/realisations"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-lime transition hover:text-coral hover:underline"
                  >
                    {t("home.refsLink")} →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:w-full lg:max-w-md">
                  {clients.map((client, index) => (
                    <AnimateIn key={client} delay={index * 0.05}>
                      <div className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-center text-sm font-medium text-mist/75 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/[0.08] hover:text-mist">
                        {client}
                      </div>
                    </AnimateIn>
                  ))}
                </div>
              </div>
            </section>
          </AnimateIn>

          {/* ── Section : Prêt à démarrer ? ── */}
          <AnimateIn>
            <section className="mt-20 relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1531123414780-f74242c2b052?auto=format&fit=crop&w=1920&q=80"
                alt="Africains professionnels souriants"
                className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-ink/95 via-ink/80 to-coral/20" />

              <div className="relative z-10 grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:items-center lg:p-16">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-coral">{t("home.ctaTag")}</p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl lg:text-5xl text-balance">
                    {t("home.ctaTitle")}
                  </h2>
                  <p className="mt-6 text-lg text-mist/70 leading-relaxed">
                    {t("home.ctaSub")}
                  </p>
                  <div className="mt-10 flex flex-wrap gap-4">
                    <Link
                      to="/contact#contact"
                      className="inline-flex items-center justify-center rounded-full bg-coral px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-coral/20 transition hover:brightness-110 active:scale-95"
                    >
                      {t("home.ctaBtn1")}
                    </Link>
                    <Link
                      to="/tarifications"
                      className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-sm font-semibold text-mist transition hover:border-white/40 hover:bg-white/10 active:scale-95"
                    >
                      {t("home.ctaBtn2")}
                    </Link>
                  </div>
                </div>

                <div className="hidden lg:block relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-coral/30 to-lime/30 blur-2xl opacity-50" />
                  <img
                    src="https://images.unsplash.com/photo-1573167243872-43c6433b9d40?auto=format&fit=crop&w=800&q=80"
                    alt="Collaboration professionnelle"
                    className="relative z-10 w-full rounded-2xl border border-white/10 shadow-2xl transform rotate-2 transition hover:rotate-0 duration-500 object-cover aspect-video"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=600&q=80"
                    alt="Travail d'équipe"
                    className="absolute -bottom-10 -left-10 z-20 w-2/3 rounded-2xl border border-white/10 shadow-2xl transform -rotate-3 transition hover:rotate-0 duration-500 object-cover aspect-video"
                  />
                </div>
              </div>
            </section>
          </AnimateIn>

        </div>
      </div>
    </>
  );
}
