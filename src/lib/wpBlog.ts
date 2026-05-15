import { readRuntimeEnv } from "./runtimeEnv";
import { publicAssetUrl } from "./publicAssetUrl";

/** Base REST WordPress (live — secours dev ou si blog-feed.json absent). */
function wpRestBase(): string {
  return (
    readRuntimeEnv("VITE_WP_REST_BASE", "").replace(/\/$/, "") ||
    "https://www.afrilexconseil.com/wp-json"
  );
}

/** Origine du site WordPress (pour résoudre /wp-content/… dans le HTML des articles). */
function wpSiteOrigin(): string {
  try {
    const u = new URL(wpRestBase());
    return `${u.protocol}//${u.host}`;
  } catch {
    return "https://afrilexconseil.com";
  }
}

/** Résout chemins relatifs `/wp-content/…` dans le corps HTML WP. */
function fixRelativeWpMediaUrls(html: string): string {
  const origin = wpSiteOrigin();
  return html.replace(
    /\b(src|href)="\/(wp-content\/[^"]+)"/gi,
    (_, attr: string, path: string) => `${attr}="${origin}/${path}"`
  );
}

type WpRenderable = { rendered: string };

type WpTerm = {
  id: number;
  name: string;
  taxonomy: string;
};

export type NormalizedWpPost = {
  id: number;
  slug: string;
  title: string;
  excerptPlain: string;
  link: string;
  date: string;
  featuredImageUrl: string | null;
  categories: string[];
};

export type NormalizedWpPostDetail = NormalizedWpPost & {
  contentHtml: string;
};

type WpMedia = {
  source_url?: string;
  media_details?: {
    sizes?: Record<
      string,
      { source_url?: string; width?: number; height?: number }
    >;
  };
};

type WpRestPost = {
  id: number;
  slug: string;
  title: WpRenderable;
  excerpt: WpRenderable;
  content?: WpRenderable;
  date: string;
  link: string;
  _embedded?: {
    "wp:featuredmedia"?: WpMedia[];
    "wp:term"?: WpTerm[][];
  };
};

function pickFeaturedUrl(media: WpMedia | undefined): string | null {
  if (!media?.source_url) return null;
  const sizes = media.media_details?.sizes;
  const prefer = ["medium_large", "large", "medium", "thumbnail"] as const;
  for (const key of prefer) {
    const u = sizes?.[key]?.source_url;
    if (u) return u;
  }
  return media.source_url ?? null;
}

/** Texte depuis du HTML WP (titres peuvent contenir entités ou balises minimales). */
export function wpPlainText(html: string): string {
  if (!html) return "";
  const d = document.createElement("div");
  d.innerHTML = html;
  const t = d.textContent ?? "";
  return t.replace(/\s+/g, " ").trim();
}

function normalize(post: WpRestPost): NormalizedWpPost {
  const embeddedTerms = post._embedded?.["wp:term"] ?? [];
  const categories =
    embeddedTerms
      .flat()
      .filter((term) => term.taxonomy === "category")
      .map((term) => term.name) ?? [];

  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  const featuredImageUrl = pickFeaturedUrl(media);

  return {
    id: post.id,
    slug: post.slug,
    title: wpPlainText(post.title.rendered),
    excerptPlain: wpPlainText(post.excerpt.rendered),
    link: post.link,
    date: post.date,
    featuredImageUrl,
    categories,
  };
}

/** Fichier généré au build (`scripts/sync-blog-feed.mjs`). */
type BlogFeedFile = {
  version?: number;
  posts?: NormalizedWpPostDetail[];
  syncError?: string;
};

async function loadBundledFeed(signal?: AbortSignal): Promise<NormalizedWpPostDetail[] | null> {
  const live =
    typeof import.meta.env.VITE_BLOG_USE_LIVE_WP === "string"
      ? import.meta.env.VITE_BLOG_USE_LIVE_WP.trim()
      : "";
  if (live === "1" || /^true$/i.test(live)) return null;

  try {
    const res = await fetch(publicAssetUrl("blog-feed.json"), {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as BlogFeedFile;
    if (!Array.isArray(data.posts)) return null;
    if (data.posts.length === 0) return null;
    return data.posts;
  } catch {
    return null;
  }
}

/** Évite « WP 200 » silencieux quand le serveur renvoie index.html (SPA) au lieu du JSON WP. */
async function guardWpRestResponse(res: Response): Promise<void> {
  const ct = res.headers.get("content-type") || "";
  if (/\bjson\b/i.test(ct)) return;
  const clone = res.clone();
  const sample = (await clone.text()).slice(0, 120).trim();
  const looksLikeSpa =
    sample.startsWith("<!DOCTYPE") ||
    sample.startsWith("<html") ||
    sample.includes("<!DOCTYPE html");
  if (looksLikeSpa) {
    console.error(
      "[blog] REST renvoie du HTML. Lancez « npm run build » pour régénérer blog-feed.json, ou corrigez VITE_WP_REST_BASE."
    );
  }
  throw new Error(`WP ${res.status} — réponse non JSON (${ct || "sans Content-Type"})`);
}

async function fetchPostsLive(signal?: AbortSignal): Promise<NormalizedWpPost[]> {
  const qs = new URLSearchParams({
    per_page: "100",
    orderby: "date",
    order: "desc",
    _embed: "1",
  });
  const res = await fetch(`${wpRestBase()}/wp/v2/posts?${qs}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`WP ${res.status}`);
  await guardWpRestResponse(res);
  const data = (await res.json()) as WpRestPost[];
  return Array.isArray(data) ? data.map(normalize) : [];
}

async function fetchPostBySlugLive(
  slug: string,
  signal?: AbortSignal
): Promise<NormalizedWpPostDetail | null> {
  const qs = new URLSearchParams({
    slug,
    _embed: "1",
  });
  const res = await fetch(`${wpRestBase()}/wp/v2/posts?${qs}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`WP ${res.status}`);
  await guardWpRestResponse(res);
  const data = (await res.json()) as WpRestPost[];
  if (!Array.isArray(data) || data.length === 0) return null;
  const base = normalize(data[0]);
  const contentHtml = fixRelativeWpMediaUrls(data[0].content?.rendered ?? "");
  return { ...base, contentHtml };
}

export async function fetchAfrilexPosts(signal?: AbortSignal): Promise<NormalizedWpPost[]> {
  const bundled = await loadBundledFeed(signal);
  if (bundled !== null) {
    return bundled.map(({ contentHtml: _c, ...rest }) => rest);
  }
  return fetchPostsLive(signal);
}

export async function fetchAfrilexPostBySlug(
  slug: string,
  signal?: AbortSignal
): Promise<NormalizedWpPostDetail | null> {
  const bundled = await loadBundledFeed(signal);
  if (bundled !== null) {
    return bundled.find((p) => p.slug === slug) ?? null;
  }
  return fetchPostBySlugLive(slug, signal);
}
