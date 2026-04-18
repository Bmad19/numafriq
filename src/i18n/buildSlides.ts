import { HeroSlide } from "../components/HeroSlider";

type RawSlide = {
  tag: string; eyebrow: string; title: string; sub: string;
  cta: string; ctaSecondary: string;
};

const CONFIGS: Record<string, {
  images: string[];
  accents: string[];
  ctas: string[];
  ctaSecondaries: string[];
}> = {
  services: {
    images:  ["https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1920&q=80"],
    accents: ["from-lime/50 to-emerald-500/0","from-coral/50 to-orange-500/0","from-violet/50 to-purple-500/0"],
    ctas: ["/contact","/contact","/contact"],
    ctaSecondaries: ["/tarifications","/realisations","/tarifications"],
  },
  work: {
    images:  ["https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1556761175-5973dc0f32b7?auto=format&fit=crop&w=1920&q=80"],
    accents: ["from-lime/50 to-emerald-500/0","from-coral/50 to-orange-500/0","from-violet/50 to-purple-500/0"],
    ctas: ["/contact","/contact","/contact"],
    ctaSecondaries: ["/services","/tarifications","/services"],
  },
  pricing: {
    images:  ["https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1573167243872-43c6433b9d40?auto=format&fit=crop&w=1920&q=80"],
    accents: ["from-lime/50 to-emerald-500/0","from-coral/50 to-orange-500/0","from-violet/50 to-purple-500/0"],
    ctas: ["/contact","/contact","/contact"],
    ctaSecondaries: ["/services","/contact","/realisations"],
  },
  about: {
    images:  ["https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1531496730074-83b638c0a7ac?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1573164574397-dd250bc8a598?auto=format&fit=crop&w=1920&q=80"],
    accents: ["from-coral/50 to-orange-500/0","from-lime/50 to-emerald-500/0","from-violet/50 to-purple-500/0"],
    ctas: ["/contact","/contact","/contact"],
    ctaSecondaries: ["/realisations","/services","/tarifications"],
  },
  contact: {
    images:  ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1573164574511-73c773193279?auto=format&fit=crop&w=1920&q=80","https://images.unsplash.com/photo-1531123414780-f74242c2b052?auto=format&fit=crop&w=1920&q=80"],
    accents: ["from-coral/50 to-orange-500/0","from-lime/50 to-emerald-500/0","from-violet/50 to-purple-500/0"],
    ctas: ["#contact","#contact","#contact"],
    ctaSecondaries: ["/tarifications","/services","/realisations"],
  },
};

export function buildSlides(raws: RawSlide[], page: keyof typeof CONFIGS): HeroSlide[] {
  const cfg = CONFIGS[page];
  return raws.map((s, i) => ({
    tag:    s.tag,
    eyebrow:s.eyebrow,
    title:  s.title,
    sub:    s.sub,
    image:  cfg.images[i],
    accent: cfg.accents[i],
    cta:    { label: s.cta,           to: cfg.ctas[i] },
    ctaSecondary: { label: s.ctaSecondary, to: cfg.ctaSecondaries[i] },
  }));
}
