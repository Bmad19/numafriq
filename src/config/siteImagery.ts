/**
 * Visuels Unsplash (+ fichiers locaux pour les bandeaux « pôles » sur la page Expertises).
 *
 * Hero sliders : accueil (`HOME_HERO_SLIDES`) + pages Expertises, Organisation, À propos, Contact
 * (`SLIDER_BACKDROPS`) — chaque tableau suit l’ordre des entrées i18n `*Slides` (3 slides).
 * Voir les commentaires au-dessus de chaque export pour la correspondance texte → image.
 *
 * Règle : personnages visibles = personnes noires (Afririque & diaspora). URLs Unsplash validées.
 * Licence : https://unsplash.com/license
 */

/** Image recadrée (hero, cartes, sections pleine largeur). */
export function imgCrop(id: string, w: number, q = 85) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

/** Recadrage directionnel (ex. portrait issu d’une photo groupe). */
export function imgCropDirection(id: string, w: number, h: number, crop: "left" | "right" | "center", q = 85) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=${crop}&w=${w}&h=${h}&q=${q}`;
}

/** Petits portraits cercle (équipe / confiance formulaire). */
export function imgPortrait(id: string, px = 112) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${px}&h=${px}&q=82`;
}

/** Métadonnée pour slider / hero (image + point focal visage). */
export type HeroBackdrop = {
  image: string;
  imagePosition: string;
  /** `contain` = voir tout le visuel (ex. balance) sans recadrage agressif. */
  imageFit?: "cover" | "contain";
};

function backdrop(id: string, w: number, imagePosition: string): HeroBackdrop {
  return { image: imgCrop(id, w), imagePosition };
}

/* ── Référentiel portraits — personnes noires, cabinet & conseil ── */

/** Homme — costume, portrait signature (Tyler Nix). */
const P_MAN_SUIT_CLASSIC = "1560250097-0b93528c311a";
/** Femme — bras croisés, attitude conseil. */
const P_WOMAN_ARMS_CROSSED = "1531746020798-e6953c6e8e04";

/** Femme — série portraits professionnels (recherche Unsplash « black businesswoman »). */
const P_WOMAN_PRO_A = "1563132337-f159f484226c";
const P_WOMAN_PRO_B = "1591305097470-0fad344325aa";
const P_WOMAN_PRO_C = "1606596556957-f6566cc865a9";
const P_WOMAN_PRO_D = "1649705334412-b51e97c38248";
const P_WOMAN_PRO_E = "1649705556717-1f05fbda21ce";
const P_WOMAN_PRO_F = "1655720357761-f18ea9e5e7e6";
const P_WOMAN_PRO_G = "1655720357872-ce227e4164ba";
const P_WOMAN_PRO_H = "1696242595562-965d7bc08f36";
const P_WOMAN_PRO_I = "1739300293504-234817eead52";

/** Homme — série portraits professionnels (« black businessman portrait »). */
const P_MAN_PRO_A = "1582015752624-e8b1c75e3711";
const P_MAN_PRO_B = "1645736593731-4eef033ac37a";
const P_MAN_PRO_C = "1645736593932-2c877741fd6c";
const P_MAN_PRO_D = "1656399910081-238ccfa10acb";

/** Femme noire — portrait professionnel Afrique / diaspora (sourcing Unsplash « African businesswoman portrait », CDN vérifié). */
const P_WOMAN_BLACK_AFRICAN_LEADER = "1643488448207-cea4ca335830";

/** Réunion d’équipe au bureau — femmes noires professionnelles autour d’une table (Christina Morillo / Women of Tech). */
const P_TEAM_BLACK_JURISTS_MEETING = "1573166364839-1bfe9196c23e";

/** Image de carte article lorsque WordPress ne fournit pas d’illustration — portrait éditorial cohérent. */
export const BLOG_CARD_FALLBACK_IMAGE = imgCrop(P_WOMAN_PRO_D, 1600);

/**
 * ── Page ACCUEIL (`homeSlides`) — ordre = slide 1 → 3 ─────────────────────────
 * 1 « Sécurisez vos projets… » expertise intégrée → visuel local `public/home-hero-slide-1.png` (équipe + stratégie RH).
 * 2 « Téléphone et WhatsApp » premier échange → homme pro. accessible (visuel distinct du triplet Contact).
 * 3 « Afrique de l’Ouest » référence régionale → femme leader Afrique / diaspora.
 */
export const HOME_HERO_SLIDES = [
  {
    image: "/home-hero-slide-1.png",
    /** Graphique dense à droite : ancrer le cadrage à gauche pour la lisibilité du texte hero. */
    imagePosition: "38% center",
    imageFit: "cover",
  },
  backdrop(P_MAN_PRO_B, 1920, "48% 26%"),
  backdrop(P_WOMAN_BLACK_AFRICAN_LEADER, 1920, "46% 28%"),
] as const;

/** Compat : URLs seules si un composant n’a besoin que de la chaîne. */
export const HOME_HERO_IMAGES = HOME_HERO_SLIDES.map((s) => s.image) as readonly string[];

/**
 * Cartes « Comment pouvons-nous vous accompagner » (`home.need`) — ordre = carte 1 → 3.
 * Visuels locaux : juridique / contrats numériques → optimisation & conseil (équipe) → investisseurs & Afrique.
 */
export const HOME_NEED_CARD_IMAGES = [
  "/home-need-card-1.png",
  "/home-need-card-2.png",
  "/home-need-card-3.png",
] as const;

/** Valeurs — portraits sobres. */
export const HOME_VALUE_CARD_IMAGES = [
  imgCrop(P_WOMAN_PRO_B, 900),
  imgCrop(P_WOMAN_PRO_D, 900),
  imgCrop(P_WOMAN_PRO_G, 900),
] as const;

/** Fonds de section (portraits léger flou implicite via overlay sur la page). */
export const HOME_VALUES_SECTION_BG = imgCrop(P_WOMAN_PRO_A, 1920);
export const HOME_REFS_SECTION_BG = imgCrop(P_WOMAN_PRO_I, 1920);
export const HOME_CTA_SECTION_BG = imgCrop(P_MAN_PRO_A, 1920);

/** Bloc CTA — deux portraits. */
export const HOME_CTA_SIDE_IMAGES = [
  imgCrop(P_WOMAN_PRO_F, 900),
  imgCropDirection(P_MAN_PRO_D, 780, 980, "center"),
] as const;

/**
 * Sliders par page (buildSlides + i18n `servicesSlides`, `workSlides`, etc.).
 *
 * EXPERTISES (`servicesSlides`)
 * 1 « Sept domaines / compétences complémentaires » → équipe pluridisciplinaire autour de la table.
 * 2 « Optimisation fiscale / structuration » → visuel local `services-hero-slide-2` (transformation & systèmes d’information).
 * 3 « Investisseurs national & international » → visuel local `services-hero-slide-3` (Afrique, infrastructures & projets).
 *
 * ORGANISATION (`workSlides`, route Réalisations)
 * 1 « Structure pensée pour l’excellence » → `organisation-work-slide-1.webp` (équipe autour de la table).
 * 2 « Clarté, rigueur » → `organisation-work-slide-2.jpg` (séance juridique, balance).
 * 3 « Au service du développement » → `organisation-work-slide-3.jpg` (duo, revue de dossier).
 *
 * À PROPOS (`aboutSlides`)
 * 1 « Institution / sept pôles » → visuel local `about-slide-1.webp` (réunion & données).
 * 2 « Valeurs / mission » → `about-slide-2.jpg` (collaboration stratégique).
 * 3 « Proximité · Afrique » → `about-slide-3.jpg` (transformation digitale & inclusion).
 *
 * CONTACT (`contactSlides`)
 * 1 « Écrivez-nous ou appelez » → `contact-slide-1.png` (accord / poignée de main).
 * 2 « Partenaire Ouagadougou » → `contact-slide-2.jpg` (conseil — équipe autour du bureau).
 * 3 « Interlocuteur dédié » → `contact-slide-3.jpg` (symboles justice — illustration locale).
 *
 * CARRIÈRES (`careersSlides`)
 * Visuels locaux `careers-slide-1.png` → `careers-slide-3.png` (legal tech / droit numérique — uploads utilisateur).
 */
export const SLIDER_BACKDROPS = {
  services: [
    backdrop(P_TEAM_BLACK_JURISTS_MEETING, 1920, "52% 38%"),
    {
      image: "/services-hero-slide-2.jpg",
      /** Partie « avant » bureau à gauche ; texte hero lisible à gauche. */
      imagePosition: "38% 50%",
    },
    {
      image: "/services-hero-slide-3.jpg",
      imagePosition: "50% 46%",
    },
  ],
  work: [
    { image: "/organisation-work-slide-1.webp", imagePosition: "52% 42%" },
    { image: "/organisation-work-slide-2.jpg", imagePosition: "48% 48%" },
    { image: "/organisation-work-slide-3.jpg", imagePosition: "50% 38%" },
  ],
  pricing: [
    backdrop(P_MAN_PRO_C, 1920, "50% 26%"),
    backdrop(P_WOMAN_PRO_A, 1920, "50% 34%"),
    backdrop(P_WOMAN_PRO_G, 1920, "50% 28%"),
  ],
  about: [
    { image: "/about-slide-1.webp", imagePosition: "52% 42%" },
    { image: "/about-slide-2.jpg", imagePosition: "48% 38%" },
    { image: "/about-slide-3.jpg", imagePosition: "50% 46%" },
  ],
  contact: [
    { image: "/contact-slide-1.png", imagePosition: "50% 46%" },
    { image: "/contact-slide-2.jpg", imagePosition: "50% 42%" },
    {
      image: "/contact-slide-3.jpg",
      imagePosition: "50% 50%",
      /** Illustration centrée : éviter un recadrage trop serré sur le motif circulaire. */
      imageFit: "contain",
    },
  ],
  careers: [
    { image: "/careers-slide-1.png", imagePosition: "56% 48%" },
    { image: "/careers-slide-2.png", imagePosition: "50% 46%" },
    {
      image: "/careers-slide-3.png",
      imagePosition: "50% 50%",
      imageFit: "cover",
    },
  ],
} as const;

export type SliderPageKey = keyof typeof SLIDER_BACKDROPS;

/** @deprecated préférez SLIDER_BACKDROPS (positions focales incluses). */
export const SLIDER_IMAGES = {
  services: SLIDER_BACKDROPS.services.map((s) => s.image),
  work: SLIDER_BACKDROPS.work.map((s) => s.image),
  pricing: SLIDER_BACKDROPS.pricing.map((s) => s.image),
  about: SLIDER_BACKDROPS.about.map((s) => s.image),
  contact: SLIDER_BACKDROPS.contact.map((s) => s.image),
} as const;

/** Bandeau pôle 1 (droit des affaires & contentieux) — contrat, balance & poignée de main (visuel local). */
const SERVICES_POLE1_BUSINESS_IMAGE = `${import.meta.env.BASE_URL}pole1-droit-affaires-contentieux.jpg`;
/** Bandeau pôle 2 (fiscalité / comptabilité / conformité) — visuel éditorial local. */
const SERVICES_POLE2_FISCAL_IMAGE = `${import.meta.env.BASE_URL}pole2-fiscal-compta-conformite.webp`;
/** Bandeau pôle 3 (montage financier / structuration) — visuel éditorial local. */
const SERVICES_POLE3_PROJECT_IMAGE = `${import.meta.env.BASE_URL}pole3-montage-financier-analyse.png`;
/** Bandeau pôle 4 (mines / carrières / énergie / ressources) — visuel éditorial local. */
const SERVICES_POLE4_MINING_IMAGE = `${import.meta.env.BASE_URL}pole4-mines-carrieres-energie.png`;
/** Bandeau pôle 5 (innovation / formation / accompagnement stratégique) — visuel éditorial local. */
const SERVICES_POLE5_INNOVATION_IMAGE = `${import.meta.env.BASE_URL}pole5-innovation-formation-atelier.png`;
/** Bandeau pôle 6 (droit du travail / risques sociaux) — visuel éditorial local. */
const SERVICES_POLE6_EMPLOYMENT_IMAGE = `${import.meta.env.BASE_URL}pole6-droit-travail-protection-sociale.png`;
/** Bandeau pôle 7 (résilience / gestion de crise / risques organisationnels) — illustration locale. */
const SERVICES_POLE7_RESILIENCE_IMAGE = `${import.meta.env.BASE_URL}pole7-resilience-crise-risques.png`;

/** Bandeaux pôles services — un visuel par pôle (recadrage dédié). */
export const SERVICES_POLE_BANNERS = [
  { src: SERVICES_POLE1_BUSINESS_IMAGE, objectPosition: "48% 48%" },
  { src: SERVICES_POLE2_FISCAL_IMAGE, objectPosition: "50% 42%" },
  { src: SERVICES_POLE3_PROJECT_IMAGE, objectPosition: "50% 48%" },
  { src: SERVICES_POLE4_MINING_IMAGE, objectPosition: "50% 42%" },
  { src: SERVICES_POLE5_INNOVATION_IMAGE, objectPosition: "50% 38%" },
  { src: SERVICES_POLE6_EMPLOYMENT_IMAGE, objectPosition: "50% 50%" },
  { src: SERVICES_POLE7_RESILIENCE_IMAGE, objectPosition: "50% 48%" },
] as const;

/** @deprecated préférez SERVICES_POLE_BANNERS pour le recadrage par pôle */
export const SERVICES_POLE_IMAGES = SERVICES_POLE_BANNERS.map((b) => b.src);

/** Mentions légales — portrait conseil (plus de symbole seul). */
export const LEGAL_PAGE_HERO_IMAGE = imgCrop(P_MAN_SUIT_CLASSIC, 1920);
export const LEGAL_PAGE_HERO_IMAGE_POSITION = "50% 22%" as const;

/** Blog — portrait éditorial. */
export const BLOG_PAGE_HERO_IMAGE = imgCrop(P_WOMAN_PRO_C, 1920);
export const BLOG_PAGE_HERO_IMAGE_POSITION = "50% 28%" as const;

/** À propos — parallax : [0] équipe en réunion ; [1] conseil aux dirigeants ; [2] maîtrise documentaire (visuels locaux). */
export const ABOUT_PARALLAX_IMAGE_URLS = [
  imgCrop(P_TEAM_BLACK_JURISTS_MEETING, 1800),
  "/about-strip-dirigeants.jpg",
  "/about-strip-documentaire.jpg",
] as const;

/** Recadrage — carte « Conseil aux dirigeants » (visite terrain / pilotage), format 16∶10. */
export const ABOUT_STRIP_LEADERSHIP_OBJECT_POSITION = "50% 42%" as const;

/** Recadrage du visuel principal À propos (photo groupe / table). */
export const ABOUT_MAIN_PARALLAX_OBJECT_POSITION = "50% 38%" as const;

/** @deprecated préférez ABOUT_PARALLAX_IMAGE_URLS */
export const ABOUT_BODY_PARALLAX_IMAGE = ABOUT_PARALLAX_IMAGE_URLS[0];

/** Avatars cercle bloc confiance (contact). */
export const CONTACT_TEAM_PORTRAITS_IDS = [P_WOMAN_PRO_E, P_WOMAN_PRO_G, P_MAN_PRO_C] as const;
