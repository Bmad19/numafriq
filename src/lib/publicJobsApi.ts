import { blogCommentsApiOrigin } from "./blogApiOrigin";

export type PublicJobOffer = {
  id: number;
  slug: string;
  position_key?: string | null;
  title_fr: string;
  title_en?: string | null;
  summary_fr: string;
  summary_en?: string | null;
  meta_fr?: string | null;
  meta_en?: string | null;
  content_fr?: string | null;
  content_en?: string | null;
  contract_type?: string | null;
  location?: string | null;
  is_new: boolean;
  sort_order: number;
  published_at?: string | null;
};

function jobsUrl(): string {
  const origin = blogCommentsApiOrigin();
  return origin ? `${origin}/api/jobs/published` : "/api/jobs/published";
}

export async function fetchPublishedJobOffers(signal?: AbortSignal): Promise<PublicJobOffer[]> {
  try {
    const res = await fetch(jobsUrl(), {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { offers?: PublicJobOffer[] };
    return Array.isArray(data.offers) ? data.offers : [];
  } catch {
    return [];
  }
}
