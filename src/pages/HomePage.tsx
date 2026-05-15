import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Seo } from "../components/Seo";
import { AnimateIn } from "../components/animations/AnimateIn";
import { Parallax } from "../components/animations/Parallax";
import { HeroSlider, HeroSlide } from "../components/HeroSlider";
import {
  HOME_CTA_SECTION_BG,
  HOME_CTA_SIDE_IMAGES,
  HOME_HERO_SLIDES,
  HOME_NEED_CARD_IMAGES,
  HOME_REFS_SECTION_BG,
  HOME_VALUE_CARD_IMAGES,
  HOME_VALUES_SECTION_BG,
} from "../config/siteImagery";
import { HomeTrustStrip } from "../components/HomeTrustStrip";

const needCardTos = ["/services", "/blog", "/realisations"];

export function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const rawSlides = t("homeSlides", { returnObjects: true }) as Array<{
    tag: string;
    eyebrow: string;
    title: string;
    sub: string;
    cta: string;
    ctaSecondary: string;
  }>;

  const secondaryTos = ["/services", "/apropos", "/realisations"] as const;
  const slides: HeroSlide[] = rawSlides.map((s, i) => {
    const accents = ["from-coral/45 to-transparent", "from-lime/45 to-transparent", "from-violet/40 to-transparent"];
    return {
      tag: s.tag,
      eyebrow: s.eyebrow,
      title: s.title,
      sub: s.sub,
      image: HOME_HERO_SLIDES[i].image,
      imagePosition: HOME_HERO_SLIDES[i].imagePosition,
      imageFit: HOME_HERO_SLIDES[i].imageFit,
      accent: accents[i],
      cta: { label: s.cta, to: "/contact#contact" },
      ctaSecondary: { label: s.ctaSecondary, to: secondaryTos[i] },
    };
  });

  const needCards = (t("home.need", { returnObjects: true }) as Array<{ title: string; text: string; cta: string }>).map((c, i) => ({
    ...c,
    image: HOME_NEED_CARD_IMAGES[i],
    to: needCardTos[i],
  }));

  const valueItems = (t("home.values", { returnObjects: true }) as Array<{ title: string; desc: string }>).map((v, i) => ({
    ...v,
    image: HOME_VALUE_CARD_IMAGES[i],
  }));

  return (
    <>
      <Seo
        title={lang === "en" ? "Home" : "Accueil"}
        description={t("home.seoDescription")}
      />

      <HeroSlider slides={slides} />
      <HomeTrustStrip />

      <div className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl pt-20">
          <section className="mt-8">
            <AnimateIn>
              <p className="text-sm font-semibold uppercase tracking-widest text-coral">{t("home.needTitle")}</p>
            </AnimateIn>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {needCards.map((item, index) => (
                <AnimateIn key={item.title} delay={index * 0.1}>
                  <Parallax offset={20}>
                    <Link
                      to={item.to}
                      className="group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-ink/40 transition hover:border-white/25 hover:bg-white/[0.06] active:scale-[0.98]"
                    >
                      <img
                        src={item.image}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/88 to-ink/35" aria-hidden />
                      <div className="relative z-10 p-6">
                        <h2 className="font-display text-2xl font-bold text-mist">{item.title}</h2>
                        <p className="mt-3 text-sm leading-relaxed text-mist/85">{item.text}</p>
                        <p className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-lime transition group-hover:text-coral">
                          {item.cta}
                          <span aria-hidden className="transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </p>
                      </div>
                    </Link>
                  </Parallax>
                </AnimateIn>
              ))}
            </div>
          </section>

          <AnimateIn>
            <section className="mt-20 relative overflow-hidden rounded-3xl border border-white/10 bg-ink/50 p-7 md:p-10">
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={HOME_VALUES_SECTION_BG}
                  alt=""
                  className="h-full w-full scale-110 object-cover opacity-10 mix-blend-luminosity grayscale"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-ink/90 via-ink/80 to-lime/10" />
              </div>
              <div className="relative z-10 grid gap-8 md:grid-cols-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-lime">{t("home.valuesTag")}</p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-mist text-balance">{t("home.valuesTitle")}</h2>
                  <p className="mt-4 text-sm leading-relaxed text-mist/60">{t("home.valuesSub")}</p>
                </div>
                <div className="grid gap-4 md:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
                  {valueItems.map((item, index) => (
                    <AnimateIn key={item.title} delay={0.2 + index * 0.1}>
                      <div className="group relative flex min-h-[260px] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-ink/65 shadow-[0_12px_40px_rgba(0,0,0,0.25)] transition hover:border-lime/30 hover:bg-ink/80">
                        <img
                          src={item.image}
                          alt=""
                          aria-hidden
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/82 to-ink/40" aria-hidden />
                        <div className="relative z-10 flex grow flex-col justify-end p-5 pt-24">
                          <h3 className="font-display text-xl font-bold text-mist">{item.title}</h3>
                          <p className="mt-2 text-sm text-mist/80">{item.desc}</p>
                        </div>
                      </div>
                    </AnimateIn>
                  ))}
                </div>
              </div>
            </section>
          </AnimateIn>

          <AnimateIn>
            <section className="mt-20 relative overflow-hidden rounded-3xl border border-white/10 bg-ink/50 p-8 sm:p-12 lg:p-16">
              <div className="absolute inset-0">
                <img src={HOME_REFS_SECTION_BG} alt="" className="h-full w-full object-cover opacity-40 mix-blend-luminosity" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-transparent" />
              </div>
              <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-widest text-coral">{t("home.refsTag")}</p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl text-balance">{t("home.refsTitle")}</h2>
                  <p className="mt-4 text-mist/60 leading-relaxed max-w-lg">{t("home.refsSub")}</p>
                  <Link to="/realisations" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-lime transition hover:text-coral hover:underline">
                    {t("home.refsLink")} →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:w-full lg:max-w-md">
                  {(t("home.clients", { returnObjects: true }) as string[]).map((client, index) => (
                    <AnimateIn key={client} delay={index * 0.05}>
                      <div className="flex h-12 items-center justify-center rounded-xl border border-white/10 bg-ink/75 px-4 text-center text-sm font-medium text-mist/85 transition hover:border-white/30 hover:bg-ink/85 hover:text-mist">
                        {client}
                      </div>
                    </AnimateIn>
                  ))}
                </div>
              </div>
            </section>
          </AnimateIn>

          <AnimateIn>
            <section className="mt-20 relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              <img
                src={HOME_CTA_SECTION_BG}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-ink/95 via-ink/80 to-coral/20" />

              <div className="relative z-10 grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:items-center lg:p-16">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-coral">{t("home.ctaTag")}</p>
                  <h2 className="mt-3 font-display text-3xl font-bold text-mist sm:text-4xl lg:text-5xl text-balance">{t("home.ctaTitle")}</h2>
                  <p className="mt-6 text-lg text-mist/70 leading-relaxed">{t("home.ctaSub")}</p>
                  <div className="mt-10 flex flex-wrap gap-4">
                    <Link
                      to="/contact#contact"
                      className="btn-afrilex-primary px-8 py-4 text-sm shadow-lg shadow-coral/20"
                    >
                      {t("home.ctaBtn1")}
                    </Link>
                    <Link
                      to="/blog"
                      className="btn-afrilex-secondary px-8 py-4 text-sm"
                    >
                      {t("home.ctaBtn2")}
                    </Link>
                  </div>
                </div>

                <div className="hidden lg:block relative">
                  <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-coral/20 to-lime/20 opacity-60" />
                  <img
                    src={HOME_CTA_SIDE_IMAGES[0]}
                    alt=""
                    className="relative z-10 w-full rounded-2xl border border-white/10 shadow-2xl transform rotate-2 transition hover:rotate-0 duration-500 object-cover aspect-video"
                  />
                  <img
                    src={HOME_CTA_SIDE_IMAGES[1]}
                    alt=""
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
