import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "../components/animations/AnimateIn";
import { PageHero } from "../components/PageHero";
import { Seo } from "../components/Seo";
import {
  fetchAfrilexPosts,
  NormalizedWpPost,
} from "../lib/wpBlog";
import {
  fetchBureauArticles,
  resolveBureauImageUrl,
  type PublicBureauArticle,
} from "../lib/publicBlogApi";
import {
  BLOG_CARD_FALLBACK_IMAGE,
  BLOG_PAGE_HERO_IMAGE,
  BLOG_PAGE_HERO_IMAGE_POSITION,
} from "../config/siteImagery";

/** Carte unifiée : article WP ou article bureau. */
type BlogCard = {
  key: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  cover: string | null;
  categories: string[];
  source: "wp" | "bureau";
};

export function BlogPage() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.startsWith("en");
  const locale = isEn ? "en-GB" : "fr-FR";

  const [posts, setPosts] = useState<NormalizedWpPost[] | null>(null);
  const [bureauArticles, setBureauArticles] = useState<PublicBureauArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchNonce, setRefetchNonce] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      fetchAfrilexPosts(ac.signal).catch((e: unknown) => {
        if ((e as { name?: string }).name === "AbortError") throw e;
        return null;
      }),
      fetchBureauArticles(ac.signal),
    ])
      .then(([wp, bureau]) => {
        setPosts(wp);
        setBureauArticles(bureau);
        if (wp === null && bureau.length === 0) setError(t("blog.loadError"));
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === "AbortError") return;
        setError(t("blog.loadError"));
        setPosts(null);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [t, refetchNonce]);

  const cards = useMemo<BlogCard[]>(() => {
    const fromWp: BlogCard[] = (posts ?? []).map((p) => ({
      key: `wp-${p.id}`,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerptPlain,
      date: p.date,
      cover: p.featuredImageUrl,
      categories: p.categories,
      source: "wp",
    }));
    const fromBureau: BlogCard[] = bureauArticles.map((a) => ({
      key: `ba-${a.id}`,
      slug: a.slug,
      title: (isEn ? (a.title_en ?? a.title_fr) : a.title_fr) || a.title_fr,
      excerpt: (isEn ? (a.excerpt_en ?? a.excerpt_fr) : a.excerpt_fr) || "",
      date: a.published_at ?? a.created_at ?? "",
      cover: resolveBureauImageUrl(a.cover_image_url) || null,
      categories: a.categories ? a.categories.split(",").map((s) => s.trim()).filter(Boolean) : [],
      source: "bureau",
    }));
    return [...fromBureau, ...fromWp].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [posts, bureauArticles, isEn]);

  const formatDate = useMemo(
    () => (iso: string) => {
      try {
        const d = new Date(iso);
        return new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(d);
      } catch {
        return iso;
      }
    },
    [locale]
  );

  return (
    <>
      <Seo
        title={t("nav.blog")}
        description={t("blog.seoDescription")}
        brandSuffix={t("blog.brand")}
      />
      <PageHero
        eyebrow={t("blog.heroEyebrow")}
        title={t("blog.heroTitle")}
        description={t("blog.heroDescription")}
        image={BLOG_PAGE_HERO_IMAGE}
        imageObjectPosition={BLOG_PAGE_HERO_IMAGE_POSITION}
        primaryLabel={t("blog.ctaExplore")}
        primaryTo="/blog#liste-articles"
        tertiaryLabel={t("nav.contact")}
        tertiaryTo="/contact"
      />

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <AnimateIn delay={0.08}>
          <p className="mb-12 max-w-2xl text-sm leading-relaxed text-mist/90">
            {t("blog.sourceDisclaimer")}
          </p>
        </AnimateIn>

        {loading ? (
          <div
            id="liste-articles"
            className="grid scroll-mt-[7rem] gap-8 sm:grid-cols-2 lg:grid-cols-3"
            tabIndex={-1}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
              >
                <div className="aspect-[16/10] animate-pulse bg-white/10" />
                <div className="space-y-3 p-6">
                  <div className="h-4 w-1/4 animate-pulse rounded bg-white/10" />
                  <div className="h-5 w-full animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-full animate-pulse rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            id="liste-articles"
            className="scroll-mt-[7rem] rounded-2xl border border-coral/30 bg-coral/5 px-6 py-10 text-center"
            tabIndex={-1}
          >
            <p className="font-medium text-mist">{error}</p>
            <button
              type="button"
              onClick={() => setRefetchNonce((n) => n + 1)}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-lime px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-lime/90"
            >
              {t("blog.retry")}
            </button>
          </div>
        ) : cards.length === 0 ? (
          <p id="liste-articles" className="scroll-mt-[7rem] text-center text-mist/78">
            {t("blog.empty")}
          </p>
        ) : (
          <div
            id="liste-articles"
            className="grid scroll-mt-[7rem] gap-8 sm:grid-cols-2 lg:grid-cols-3"
            tabIndex={-1}
          >
            {cards.map((card) => (
              <article
                key={card.key}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition duration-300 hover:border-lime/25 hover:shadow-xl hover:shadow-lime/[0.04]"
              >
                <Link
                  to={`/blog/${encodeURIComponent(card.slug)}`}
                  className="relative block aspect-[16/10] shrink-0 overflow-hidden bg-white/10"
                  aria-label={card.title}
                >
                  <img
                    src={card.cover ?? BLOG_CARD_FALLBACK_IMAGE}
                    alt=""
                    aria-hidden
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink via-ink/70 to-transparent" />
                </Link>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 gap-y-1 text-xs uppercase tracking-wide text-lime/80">
                    {card.categories.slice(0, 2).map((c) => (
                      <span
                        key={`${card.key}-${c}`}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5"
                      >
                        {c}
                      </span>
                    ))}
                    <span className="ml-auto whitespace-nowrap text-mist/64 normal-case tracking-normal">
                      {card.date ? formatDate(card.date) : ""}
                    </span>
                  </div>

                  <h2 className="font-display text-lg font-bold leading-snug text-mist transition group-hover:text-lime md:text-xl text-balance">
                    <Link
                      to={`/blog/${encodeURIComponent(card.slug)}`}
                      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                    >
                      {card.title}
                    </Link>
                  </h2>

                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-mist/90">
                    {card.excerpt}
                  </p>

                  <Link
                    to={`/blog/${encodeURIComponent(card.slug)}`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-lime hover:underline"
                  >
                    {t("blog.readArticle")}
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
