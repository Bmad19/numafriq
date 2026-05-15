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

const KB = {
  services: `**Afrilex Conseil** accompagne entreprises et institutions sur :
• **Droit des affaires et contrats** — rédaction, relecture, négociation
• **Fiscalité** — optimisation licite, déclarations, relations avec les administrations
• **Comptabilité et référentiels OHADA** — mise en conformité, diagnostic de dossiers
• **Contentieux et médiation** — stratégie et représentation lorsque pertinent
• **Investissement et structuration** — montages pour projets en Afrique de l'Ouest, autres pays OHADA et diaspora
• **Conformité et gouvernance** — bonnes pratiques et documents utiles aux organes sociaux

Indiquez votre secteur ou la nature de votre dossier pour orienter la réponse.`,

  pricing: `Les **honoraires** dépendent de chaque mission (complexité, urgence, enjeux).

• Premier contact ou demande d'orientation : par email ou WhatsApp (+226 52 20 91 91).
• Toute mission est précédée d'une **proposition écrite** (forfait ou temps passé) avant engagement.

Pour une estimation indicative : **info@afrilexconseil.com** ou le formulaire du site.`,

  timeline: `Les délais varient selon la nature du dossier :
• **Actes ponctuels** (lettres, revues simples) — quelques jours ouvrés après réception des pièces
• **Missions récurrentes** (tenue, fiscalité) — calendrier convenu avec vous
• **Contentieux ou dossiers volumineux** — échéances fixées avec vous selon la procédure

Une fois les éléments clarifiés et la mission formalisée, le cabinet vous communique un planning réaliste.`,

  process: `Notre méthode type :
1. **Qualification** — compréhension du besoin et des pièces disponibles
2. **Proposition** — périmètre, livrables, honoraires et délais
3. **Mission** — exécution avec points d'étape lorsque nécessaire
4. **Transmission** — restitution documentée et recommandations

Le secret professionnel et la confidentialité s'appliquent à chaque étape.`,

  about: `**Afrilex Conseil** est un cabinet d'**assistance juridique, fiscale et comptable**, basé à **Ouagadougou** et intervenant en **Afrique de l'Ouest**, dans les **autres pays OHADA** et auprès de la **diaspora**.

Nous privilégions la clarté des missions, la proximité avec les directions et une approche conforme aux standards internationaux comme aux cadres régionaux (dont OHADA lorsque pertinent).`,

  contact: `Vous pouvez nous joindre :
• 📧 **Email** : info@afrilexconseil.com
• 💬 **WhatsApp** : +226 52 20 91 91
• 📝 **Formulaire** sur la page Contact du site

Nous vous répondons en général sous **24 à 48 h ouvrées**. Souhaitez-vous être rappelé(e) ?`,

  confidentiality: `Le cabinet applique le **secret professionnel** et des mesures de **confidentialité** adaptées aux dossiers qui nous sont confiés.

Les échanges via ce chat sont une aide générale ; ils **ne constituent pas un conseil juridique personnalisé** tant qu'une mission formelle n'est pas ouverte.`,

  ohada: `Lorsque votre dossier relève du périmètre **OHADA**, nous pouvons vous accompagner sur les aspects comptables et juridiques articulés avec les **Actes uniformes** applicables, dans la mesure du mandat qui nous est confié.

Pour une analyse précise, il nous faut le contexte factuel et les documents pertinents.`,

  litigation: `Pour tout **contentieux** ou risque de litige, la première étape est une synthèse des faits et des pièces. Le cabinet peut alors proposer une stratégie (négociation, médiation, voies juridictionnelles selon les cas).

Contact préférentiel : **info@afrilexconseil.com** avec un résumé de la situation.`,
};

const intents: Intent[] = [
  {
    patterns: [/bonjour|salut|hello|bonsoir|hi|coucou/i],
    response: () => ({
      text: `Bonjour ! Je suis l'**assistant Afrilex Conseil**.

Je peux vous orienter sur nos domaines d'expertise, les modalités de mission ou les contacts du cabinet.

Comment puis-je vous aider ?`,
      quickReplies: ["Domaines d'expertise", "Honoraires", "Prendre rendez-vous", "OHADA / conformité"],
    }),
  },
  {
    patterns: [/service|offre|prestation|domaine|expertise|assistance/i],
    response: () => ({ text: KB.services, quickReplies: ["Honoraires", "Délais", "Confidentialité"] }),
  },
  {
    patterns: [/prix|tarif|honoraire|budget|combien|fcfa|€|euro|facture/i],
    response: () => ({ text: KB.pricing, quickReplies: ["Envoyer un email", "Délais", "Première prise de contact"] }),
  },
  {
    patterns: [/délai|delai|temps|durée|duree|urgence|rapide/i],
    response: () => ({ text: KB.timeline, quickReplies: ["Voir les honoraires", "Comment vous travaillez ?", "Contact"] }),
  },
  {
    patterns: [/process|méthode|comment.*travail|étape|etape|mandat/i],
    response: () => ({ text: KB.process, quickReplies: ["Honoraires", "Contact", "OHADA"] }),
  },
  {
    patterns: [/qui.*vous|cabinet|equipe|équipe|afrilex|à propos|about/i],
    response: () => ({ text: KB.about, quickReplies: ["Vos domaines", "Nous contacter", "Honoraires"] }),
  },
  {
    patterns: [/contact|joindre|email|whatsapp|tel|téléphone|telephone/i],
    response: () => ({ text: KB.contact, quickReplies: ["Honoraires", "Domaines d'expertise", "OHADA"] }),
  },
  {
    patterns: [/secret|confidential|données|donnee|rgpd/i],
    response: () => ({ text: KB.confidentiality, quickReplies: ["Contact", "Honoraires"] }),
  },
  {
    patterns: [/ohada|acte uniforme|syscohada/i],
    response: () => ({ text: KB.ohada, quickReplies: ["Services", "Contact"] }),
  },
  {
    patterns: [/contentieux|litige|tribunal|assignation|médiation|mediation/i],
    response: () => ({ text: KB.litigation, quickReplies: ["Contact", "Honoraires"] }),
  },
  {
    patterns: [/rdv|rendez-vous|appel|visio|réunion|reunion/i],
    response: () => ({
      text: `Pour fixer un **rendez-vous**, envoyez un court récapitulatif de votre besoin à **info@afrilexconseil.com** ou utilisez le formulaire Contact.

Le cabinet vous proposera un créneau et, le cas échéant, les pièces à préparer.`,
      quickReplies: ["Honoraires", "Domaines d'expertise"],
    }),
  },
  {
    patterns: [/merci|thank|super|parfait|nickel|excellent|top|génial|genial/i],
    response: () => ({
      text: `Avec plaisir. Pour toute suite utile : **info@afrilexconseil.com** ou WhatsApp **+226 52 20 91 91**.`,
      quickReplies: ["Autre question", "Honoraires"],
    }),
  },
  {
    patterns: [/au revoir|bye|à bientôt|bientot|ciao|tchao/i],
    response: () => ({
      text: `À bientôt. **Afrilex Conseil** reste disponible via **info@afrilexconseil.com**.`,
    }),
  },
];

const fallbacks = [
  `Je ne suis pas certain d'avoir bien compris votre demande.`,
  `Pour être précis sur votre situation, le cabinet peut reprendre contact avec vous.`,
];

const fallbackQuickReplies = ["Domaines d'expertise", "Honoraires", "Contact"];

export function getResponse(input: string): Response {
  const trimmed = input.trim().toLowerCase();

  for (const intent of intents) {
    if (intent.patterns.some((p) => p.test(trimmed))) {
      return intent.response();
    }
  }

  const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return {
    text: `${fallback}\n\nPosez une question sur nos **domaines**, les **honoraires**, les **délais**, **OHADA**, ou demandez comment **prendre contact**.`,
    quickReplies: fallbackQuickReplies,
  };
}

export function getWelcomeMessage(): Message {
  return {
    id: "welcome",
    role: "assistant",
    timestamp: new Date(),
    text: `Bonjour ! Je suis l'assistant **Afrilex Conseil**.

Je réponds aux questions générales sur le cabinet (domaines, modalités de mission, contacts).

Comment puis-je vous aider ?`,
    quickReplies: ["Domaines d'expertise", "Honoraires", "Prendre rendez-vous", "Politique de confidentialité"],
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
