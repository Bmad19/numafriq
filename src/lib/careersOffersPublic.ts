import { siteNodeFetch } from "./siteNodeApi";

export type PublicCareerOffer = {
  id: string;
  position_key: string;
  title_fr: string;
  title_en: string;
  meta_fr: string;
  meta_en: string;
  summary_fr: string;
  summary_en: string;
  detail_fr: string;
  detail_en: string;
  sort_order: number;
  published_at: string | null;
  updated_at: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Réponse offres emploi invalide (${res.status})`);
  }
}

export async function fetchPublicCareerOffers(
  signal?: AbortSignal
): Promise<PublicCareerOffer[]> {
  const res = await siteNodeFetch("/api/careers/offers", {
    signal,
    headers: { Accept: "application/json" },
  });
  const data = await parseJson<{ offers?: PublicCareerOffer[]; error?: string }>(
    res
  );
  if (!res.ok) throw new Error(data.error ?? `Offres ${res.status}`);
  return Array.isArray(data.offers) ? data.offers : [];
}
