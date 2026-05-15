import { HeroSlide } from "../components/HeroSlider";
import { SLIDER_BACKDROPS, type SliderPageKey } from "../config/siteImagery";

type RawSlide = {
  tag: string;
  eyebrow: string;
  title: string;
  sub: string;
  cta: string;
  ctaSecondary: string;
};

const META: Record<
  SliderPageKey,
  {
    accents: string[];
    ctas: string[];
    ctaSecondaries: string[];
  }
> = {
  services: {
    accents: ["from-lime/45 to-transparent", "from-coral/45 to-transparent", "from-violet/40 to-transparent"],
    ctas: ["/contact", "/contact", "/contact"],
    ctaSecondaries: ["/realisations", "/blog", "/apropos"],
  },
  work: {
    accents: ["from-lime/45 to-transparent", "from-coral/45 to-transparent", "from-violet/40 to-transparent"],
    ctas: ["/contact", "/contact", "/contact"],
    ctaSecondaries: ["/services", "/blog", "/apropos"],
  },
  pricing: {
    accents: ["from-lime/45 to-transparent", "from-coral/45 to-transparent", "from-violet/40 to-transparent"],
    ctas: ["/contact", "/contact", "/contact"],
    ctaSecondaries: ["/services", "/apropos", "/realisations"],
  },
  about: {
    accents: ["from-coral/45 to-transparent", "from-lime/45 to-transparent", "from-violet/40 to-transparent"],
    ctas: ["/contact", "/contact", "/contact"],
    ctaSecondaries: ["/realisations", "/services", "/blog"],
  },
  contact: {
    accents: ["from-coral/45 to-transparent", "from-lime/45 to-transparent", "from-violet/40 to-transparent"],
    ctas: ["#contact", "#contact", "#contact"],
    ctaSecondaries: ["/blog", "/services", "/realisations"],
  },
  careers: {
    accents: ["from-lime/45 to-transparent", "from-coral/45 to-transparent", "from-violet/40 to-transparent"],
    ctas: ["#postuler", "#postuler", "#postuler"],
    ctaSecondaries: ["/apropos", "/contact", "/blog"],
  },
};

export function buildSlides(raws: RawSlide[], page: SliderPageKey): HeroSlide[] {
  const backdrops = SLIDER_BACKDROPS[page];
  const meta = META[page];
  const list = Array.isArray(raws) ? raws : [];
  const fallback = backdrops[0];
  return list.map((s, i) => {
    const bd = backdrops[i] ?? fallback;
    return {
      tag: s.tag,
      eyebrow: s.eyebrow,
      title: s.title,
      sub: s.sub,
      image: bd.image,
      imagePosition: bd.imagePosition,
      imageFit: bd.imageFit,
      accent: meta.accents[i % meta.accents.length],
      cta: { label: s.cta, to: meta.ctas[i % meta.ctas.length] },
      ctaSecondary: { label: s.ctaSecondary, to: meta.ctaSecondaries[i % meta.ctaSecondaries.length] },
    };
  });
}
