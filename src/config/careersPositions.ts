/** Clés synchronisées avec `api/careers.php` (`$POSITIONS`). */
export const CAREERS_POSITION_KEYS = [
  "hr_talent_management",
  "lawyer_associate",
  "legal_counsel",
  "paralegal",
  "tax_accounting",
  "trainee_internship",
  "office_operations",
  "communication",
  "spontaneous",
] as const;

export type CareersPositionKey = (typeof CAREERS_POSITION_KEYS)[number];
