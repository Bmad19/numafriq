import { blogCommentsApiOrigin } from "./blogApiOrigin";

export type PublicBureauArticle = {
  id: number;
  slug: string;
  title_fr: string;
  title_en?: string | null;
  excerpt_fr?: string | null;
  excerpt_en?: string | null;
  cover_image_url?: string | null;
  categories?: string | null;
  author_name?: string | null;
  published_at?: string | null;
  created_at?: string;
};

export type PublicBureauArticleDetail = PublicBureauArticle & {
  content_html_fr: string;
  content_html_en?: string | null;
};

function articlesUrl(path: string): string {
  const origin = blogCommentsApiOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}

export function resolveBureauImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) {
    const origin = blogCommentsApiOrigin();
    return origin ? `${origin}${path}` : path;
  }
  return path;
}

export async function fetchBureauArticles(signal?: AbortSignal): Promise<PublicBureauArticle[]> {
  try {
    const res = await fetch(articlesUrl("/api/blog/articles"), {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { articles?: PublicBureauArticle[] };
    return Array.isArray(data.articles) ? data.articles : [];
  } catch {
    return [];
  }
}

export async function fetchBureauArticleBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<PublicBureauArticleDetail | null> {
  try {
    const res = await fetch(articlesUrl(`/api/blog/articles/${encodeURIComponent(slug)}`), {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as { article?: PublicBureauArticleDetail };
    return data.article ?? null;
  } catch {
    return null;
  }
}
