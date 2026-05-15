import type { CareersPositionKey } from "./careersPositions";

/**
 * Offres affichées sur la page Recrutements.
 * Les `id` doivent être recopiés dans `api/careers.php` (`$OFFER_TO_POSITION`).
 */
export type JobOfferEntry = {
  id: string;
  positionKey: CareersPositionKey;
  /** Pastille « Nouveau » sur la carte */
  isNew: boolean;
};

export const JOB_OFFERS: readonly JobOfferEntry[] = [
  {
    id: "of_assistant_juridique_2026",
    positionKey: "paralegal",
    isNew: true,
  },
  {
    id: "of_juriste_entreprise_2026",
    positionKey: "legal_counsel",
    isNew: true,
  },
  {
    id: "of_charge_rh_gestion_2026",
    positionKey: "hr_talent_management",
    isNew: true,
  },
];
