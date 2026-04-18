export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  quickReplies?: string[];
}

interface Intent {
  patterns: RegExp[];
  response: () => Response;
}

interface Response {
  text: string;
  quickReplies?: string[];
}

// ─── Knowledge base ────────────────────────────────────────────────────────────

const KB = {
  services: `Chez **NUMAFRIQ**, on propose 6 services principaux :
• 🌐 **Sites & landing pages** — pages rapides, SEO-first, orientées conversion
• 🛒 **E-commerce** — boutiques fluides, paiement multi-devises
• 🎨 **Identité visuelle & UI** — design system, direction artistique
• ⚡ **Performance & SEO** — Core Web Vitals, accessibilité WCAG
• 💻 **Applications web sur-mesure** — SaaS, dashboards, portails clients
• 🛡️ **Maintenance & accompagnement** — support, mises à jour, évolutions

Vous voulez en savoir plus sur l'un d'eux ?`,

  pricing: `Nos tarifs sont transparents :
• **Landing page** → à partir de **1 500 €**
• **Site vitrine** → à partir de **3 000 €**
• **E-commerce** → à partir de **5 000 €**
• **Application sur-mesure** → devis sur mesure

💡 On établit un devis détaillé après un appel découverte gratuit de 30 min — sans engagement.

Voulez-vous réserver un créneau ?`,

  timeline: `Nos délais types :
• **Landing page** → 2 à 3 semaines
• **Site vitrine complet** → 4 à 6 semaines
• **E-commerce** → 6 à 10 semaines
• **Application sur-mesure** → 8 à 16 semaines

Le délai dépend de la complexité et de votre réactivité sur les validations. On commence toujours dans la semaine suivant la signature.`,

  process: `Notre méthode en 5 étapes :
1. **Immersion** — atelier discovery pour comprendre vos enjeux
2. **Wireframes** — architecture et prototypes validés ensemble
3. **Design** — interfaces haute-fidélité dans Figma
4. **Développement** — React/Next.js, performance, accessibilité
5. **Mise en ligne** — déploiement + 30 jours d'accompagnement inclus

À chaque étape, vous validez avant qu'on passe à la suivante.`,

  about: `**NUMAFRIQ** est une agence web & identité digitale fondée sur un principe simple : créativité africaine, standards internationaux.

On est une petite équipe senior (pas de stagiaires sur vos projets), avec un process transparent et des livraisons régulières.

On travaille avec des marques en **Afrique francophone**, en **France**, en **Belgique** et au **Canada**.`,

  contact: `Vous pouvez nous joindre de plusieurs façons :
• 📧 **Email** : info@numafriq.com
• 💬 **Ce chat** — je transmets votre message à l'équipe
• 📅 **Appel découverte** gratuit de 30 min (sans engagement)

On répond sous **24h ouvrées**. Voulez-vous qu'on vous recontacte ?`,

  stack: `On travaille principalement avec :
**Front-end** : React, Next.js, TypeScript, Tailwind CSS
**CMS** : Sanity, Contentful, WordPress headless
**E-commerce** : Shopify, WooCommerce, solutions custom
**Back-end** : Node.js, Supabase, Firebase
**Design** : Figma, Framer
**Déploiement** : Vercel, Netlify, OVH

On choisit la stack adaptée à vos besoins, pas à nos habitudes.`,

  maintenance: `Nos forfaits maintenance mensuelle incluent :
• Mises à jour de sécurité & CMS
• Corrections de bugs
• Petites évolutions (jusqu'à 2h/mois)
• Support technique prioritaire (réponse < 4h)
• Rapport mensuel de performance

Tarifs à partir de **150 €/mois**. On peut discuter d'un forfait adapté à votre projet.`,

  portfolio: `Parmi nos réalisations récentes :
• **Maison Atlas** (Luxe & retail) — refonte e-commerce, +40% de conversions
• **Pulse Fitness** (Sport & app) — dashboard client, −60% taux de rebond
• **Studio Nord** (Créatif) — portfolio animé, ×3 trafic organique
• **Greenline** (Impact RSE) — landing lead gen, 1 200 leads/mois

Chaque projet est accompagné d'un case study détaillé. Lequel vous intéresse ?`,
};

// ─── Intents ───────────────────────────────────────────────────────────────────

const intents: Intent[] = [
  {
    patterns: [/bonjour|salut|hello|bonsoir|hi|coucou/i],
    response: () => ({
      text: `Bonjour ! 👋 Je suis **NUMA**, l'assistant IA de NUMAFRIQ.

Je peux vous renseigner sur nos services, tarifs, délais, ou simplement vous mettre en contact avec l'équipe.

Comment puis-je vous aider ?`,
      quickReplies: ["Nos services", "Tarifs & devis", "Voir des réalisations", "Parler à l'équipe"],
    }),
  },
  {
    patterns: [/service|offre|prestati|fait quoi|proposez/i],
    response: () => ({ text: KB.services, quickReplies: ["Combien ça coûte ?", "Délais ?", "Votre process ?"] }),
  },
  {
    patterns: [/prix|tarif|cout|coût|budget|combien|€|euro/i],
    response: () => ({ text: KB.pricing, quickReplies: ["Délais de livraison ?", "Votre process ?", "Prendre contact"] }),
  },
  {
    patterns: [/délai|delai|temps|durée|duree|semaine|livraison|rapide/i],
    response: () => ({ text: KB.timeline, quickReplies: ["Comment vous travaillez ?", "Voir les tarifs", "Démarrer un projet"] }),
  },
  {
    patterns: [/process|méthode|comment.*travail|étape|etape|procédure/i],
    response: () => ({ text: KB.process, quickReplies: ["Voir les tarifs", "Voir des réalisations", "Démarrer un projet"] }),
  },
  {
    patterns: [/qui.*vous|agence|equipe|équipe|numafriq|à propos|about/i],
    response: () => ({ text: KB.about, quickReplies: ["Vos services ?", "Voir des réalisations", "Nous contacter"] }),
  },
  {
    patterns: [/contact|joindre|appel|rdv|rendez-vous|réunion|reunion/i],
    response: () => ({ text: KB.contact, quickReplies: ["Envoyer un message", "Voir les tarifs", "Vos services ?"] }),
  },
  {
    patterns: [/techno|stack|react|next|wordpress|shopify|figma|langage|outil/i],
    response: () => ({ text: KB.stack, quickReplies: ["Voir les services", "Délais ?", "Tarifs ?"] }),
  },
  {
    patterns: [/maintenance|support|après.*livraison|apres.*livraison|suivi|mise.*jour/i],
    response: () => ({ text: KB.maintenance, quickReplies: ["Tarifs maintenance", "Démarrer un projet", "Nous contacter"] }),
  },
  {
    patterns: [/réalisation|realisation|portfolio|projet|travaux|exemple|client|cas|case/i],
    response: () => ({ text: KB.portfolio, quickReplies: ["Démarrer mon projet", "Voir les tarifs", "Votre process ?"] }),
  },
  {
    patterns: [/devis|audit|gratuit|découverte|decouverte|estim/i],
    response: () => ({
      text: `Notre **audit découverte** de 30 min est 100% gratuit et sans engagement.

On y aborde :
• Vos objectifs business
• L'état de votre présence digitale actuelle
• Les quick wins identifiés
• Un premier chiffrage indicatif

Pour réserver, il vous suffit de nous envoyer un message via le formulaire de contact ou à **info@numafriq.com** — on revient vers vous sous 24h.`,
      quickReplies: ["Envoyer un message", "Voir les tarifs", "Votre process ?"],
    }),
  },
  {
    patterns: [/seo|référencement|referencement|google|visibilité|visibilite/i],
    response: () => ({
      text: `Notre offre **Performance & SEO** couvre :
• Audit technique complet
• Optimisation Core Web Vitals (LCP, CLS, FID)
• Structure de données Schema.org
• Rédaction et optimisation du contenu
• Suivi GA4 & Search Console
• Accessibilité WCAG 2.1 AA

Un bon SEO, ça se construit dès le design — c'est pourquoi on l'intègre dès le départ dans chaque projet.`,
      quickReplies: ["Tarifs SEO", "Voir les réalisations", "Démarrer un projet"],
    }),
  },
  {
    patterns: [/ecommerce|e-commerce|boutique|shopify|woocommerce|vente.*ligne/i],
    response: () => ({
      text: `Notre offre **E-commerce** comprend :
• Conception UX du tunnel d'achat
• Intégration Shopify, WooCommerce ou solution custom
• Paiement multi-devises (Stripe, PayPal, Mobile Money)
• Gestion des stocks et des variantes
• Interface d'administration simple
• SEO e-commerce natif

Les projets e-commerce démarrent à partir de **5 000 €** et sont livrés en 6 à 10 semaines.`,
      quickReplies: ["Voir un exemple", "Délais ?", "Prendre contact"],
    }),
  },
  {
    patterns: [/merci|thank|super|parfait|nickel|excellent|top|génial|genial/i],
    response: () => ({
      text: `Avec plaisir ! 😊 N'hésitez pas si vous avez d'autres questions.

Si vous souhaitez avancer sur un projet, l'équipe est disponible à **info@numafriq.com** ou via le formulaire de contact.`,
      quickReplies: ["Démarrer un projet", "Autre question"],
    }),
  },
  {
    patterns: [/au revoir|bye|à bientôt|bientot|ciao|tchao/i],
    response: () => ({
      text: `À bientôt ! 👋 On espère vous accompagner sur votre prochain projet digital.

N'oubliez pas : **info@numafriq.com** pour toute question.`,
    }),
  },
];

// ─── Fallback ──────────────────────────────────────────────────────────────────

const fallbacks = [
  `Je ne suis pas sûr d'avoir bien compris votre question. 🤔 Voici ce que je peux vous dire :`,
  `Bonne question ! Laissez-moi vous orienter vers ce qui pourrait vous aider :`,
  `Je transmettrai votre question à l'équipe si besoin. En attendant, voici quelques infos utiles :`,
];

const fallbackQuickReplies = ["Nos services", "Tarifs", "Réalisations", "Contacter l'équipe"];

// ─── Engine ────────────────────────────────────────────────────────────────────

export function getResponse(input: string): Response {
  const trimmed = input.trim().toLowerCase();

  for (const intent of intents) {
    if (intent.patterns.some((p) => p.test(trimmed))) {
      return intent.response();
    }
  }

  const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return {
    text: `${fallback}\n\nVous pouvez me demander nos **services**, nos **tarifs**, nos **délais**, notre **process**, ou directement **démarrer un projet**.`,
    quickReplies: fallbackQuickReplies,
  };
}

export function getWelcomeMessage(): Message {
  return {
    id: "welcome",
    role: "assistant",
    timestamp: new Date(),
    text: `Bonjour ! 👋 Je suis **NUMA**, votre assistant digital NUMAFRIQ.

Je peux répondre à toutes vos questions sur nos services, tarifs, délais et bien plus.

Comment puis-je vous aider ?`,
    quickReplies: ["Nos services", "Tarifs & devis", "Voir des réalisations", "Démarrer un projet"],
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
