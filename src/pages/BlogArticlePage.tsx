import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "../components/animations/AnimateIn";
import { Seo } from "../components/Seo";
import { ArticleComments } from "../components/blog/ArticleComments";
import {
  fetchAfrilexPostBySlug,
  NormalizedWpPostDetail,
} from "../lib/wpBlog";
import {
  fetchBureauArticleBySlug,
  resolveBureauImageUrl,
  type PublicBureauArticleDetail,
} from "../lib/publicBlogApi";
import { BLOG_CARD_FALLBACK_IMAGE } from "../config/siteImagery";

type Loaded =
  | { kind: "wp"; post: NormalizedWpPostDetail }
  | { kind: "bureau"; article: PublicBureauArticleDetail };

export function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.startsWith("en");
  const locale = isEn ? "en-GB" : "fr-FR";

  const decodedSlug = slug ? decodeURIComponent(slug) : "";

  const [loaded, setLoaded] = useState<Loaded | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [refetchNonce, setRefetchNonce] = useState(0);

  useEffect(() => {
    if (!decodedSlug) {
      setLoaded(null);
      return;
    }
    const ac = new AbortController();
    setError(false);
    setLoaded(undefined);
    // 1) bureau d'abord (rapide, Supabase) — 2) sinon WordPress
    fetchBureauArticleBySlug(decodedSlug, ac.signal)
      .then((bureau) => {
        if (bureau) {
          setLoaded({ kind: "bureau", article: bureau });
          return;
        }
        return fetchAfrilexPostBySlug(decodedSlug, ac.signal).then((wp) => {
          if (wp) setLoaded({ kind: "wp", post: wp });
          else setLoaded(null);
        });
      })
      .catch((e: unknown) => {
        if ((e as { name?: string }).name === "AbortError") return;
        setLoaded(null);
        setError(true);
      });
    return () => ac.abort();
  }, [decodedSlug, refetchNonce]);

  const formatDate = useMemo(
    () => (iso: string) => {
      try {
        return new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [locale]
  );

  if (!decodedSlug) return <Navigate to="/blog" replace />;

  if (loaded === undefined && !error) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-32 sm:px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-coral" />
        <p className="mt-4 text-sm text-mist/72">{t("blog.loadingArticle")}</p>
      </div>
    );
  }

  if (loaded === null) {
    return (
      <>
        <Seo title={t("blog.notFound")} description={t("blog.seoDescription")} brandSuffix={t("blog.brand")} />
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-center font-medium text-mist">{t("blog.notFound")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/blog" className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-ink hover:brightness-110">
              {t("blog.backToListing")}
            </Link>
            {error ? (
              <button
                type="button"
                onClick={() => setRefetchNonce((n) => n + 1)}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-mist hover:bg-white/5"
              >
                {t("blog.retry")}
              </button>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  if (loaded.kind === "bureau") {
    const a = loaded.article;
    const title  = (isEn ? (a.title_en  ?? a.title_fr) : a.title_fr)  || a.title_fr;
    const excerpt= (isEn ? (a.excerpt_en?? a.excerpt_fr): a.excerpt_fr) || "";
    const html   = (isEn ? (a.content_html_en ?? a.content_html_fr) : a.content_html_fr) || a.content_html_fr;
    const cover  = resolveBureauImageUrl(a.cover_image_url) || BLOG_CARD_FALLBACK_IMAGE;
    const desc   = excerpt.length > 165 ? `${excerpt.slice(0, 162)}…` : excerpt;
    const dateIso= a.published_at ?? a.created_at ?? "";
    const cats   = (a.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    return (
      <>
        <Seo title={title} description={desc} brandSuffix={t("blog.brand")} />
        <article className="pb-24" lang={locale}>
          <div className="border-b border-white/10 bg-ink/40">
            <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
              <AnimateIn>
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-lime underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime/80"
                >
                  <span aria-hidden>← </span>{t("blog.backToListing")}
                </Link>
              </AnimateIn>

              <AnimateIn delay={0.06}>
                <div className="mt-8 flex flex-wrap items-center gap-2 gap-y-2 text-xs uppercase tracking-wide text-lime/75">
                  {cats.slice(0, 3).map((c) => (
                    <span key={c} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5">{c}</span>
                  ))}
                  {dateIso && (
                    <span className="ml-auto whitespace-nowrap text-mist/69 normal-case tracking-normal">
                      {formatDate(dateIso)}
                    </span>
                  )}
                </div>
                <h1 id="article-title" className="mt-4 font-display text-3xl font-extrabold leading-tight text-mist sm:text-4xl text-balance">
                  {title}
                </h1>
                {a.author_name && (
                  <p className="mt-3 text-sm text-mist/65">
                    <span className="text-mist/50">Par </span>
                    <span className="font-semibold text-mist/85">{a.author_name}</span>
                  </p>
                )}
              </AnimateIn>

              <AnimateIn delay={0.12}>
                <figure className="mt-10 overflow-hidden rounded-2xl border border-white/10">
                  <img
                    src={cover}
                    alt={t("blog.featuredImageAlt", { title })}
                    className="w-full object-cover aspect-[21/10] sm:aspect-[21/9]"
                    loading="eager"
                    decoding="async"
                  />
                </figure>
              </AnimateIn>
            </div>
          </div>

          <AnimateIn delay={0.06}>
            <div className="mx-auto max-w-3xl px-4 pt-14 sm:px-6 lg:px-8">
              <section
                id="article-body"
                aria-labelledby="article-title"
                className="prose prose-lg prose-invert max-w-none prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:font-bold prose-headings:text-mist prose-p:text-mist/95 prose-p:leading-[1.75] prose-li:text-mist/95 prose-strong:text-mist prose-a:text-lime prose-a:underline prose-a:decoration-lime/45 prose-a:underline-offset-[3px] hover:prose-a:decoration-lime prose-blockquote:border-lime/45 prose-img:rounded-xl prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/35 prose-hr:border-white/15 afrilex-wp-content pb-16"
                dangerouslySetInnerHTML={{ __html: html }}
              />
              <ArticleComments bureauArticleId={a.id} />
              <div className="h-16" aria-hidden />
            </div>
          </AnimateIn>
        </article>
      </>
    );
  }

  const post = loaded.post;
  const desc =
    post.excerptPlain.length > 165
      ? `${post.excerptPlain.slice(0, 162)}…`
      : post.excerptPlain;

  return (
    <>
      <Seo title={post.title} description={desc} brandSuffix={t("blog.brand")} />
      <article className="pb-24" lang={locale}>
        <div className="border-b border-white/10 bg-ink/40">
          <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <AnimateIn>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-sm font-semibold text-lime underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime/80"
              >
                <span aria-hidden>← </span>
                {t("blog.backToListing")}
              </Link>
            </AnimateIn>

            <AnimateIn delay={0.06}>
              <div className="mt-8 flex flex-wrap items-center gap-2 gap-y-2 text-xs uppercase tracking-wide text-lime/75">
                {post.categories.slice(0, 3).map((c) => (
                  <span
                    key={`${post.id}-${c}`}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5"
                  >
                    {c}
                  </span>
                ))}
                <span className="ml-auto whitespace-nowrap text-mist/69 normal-case tracking-normal">
                  {formatDate(post.date)}
                </span>
              </div>
              <h1
                id="article-title"
                className="mt-4 font-display text-3xl font-extrabold leading-tight text-mist sm:text-4xl text-balance"
              >
                {post.title}
              </h1>
              <div className="mt-8 flex flex-wrap gap-4 border-t border-white/10 pt-6">
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-mist/85 underline decoration-white/30 underline-offset-4 hover:text-lime hover:decoration-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime/70"
                >
                  {t("blog.openOriginal")}
                  <span className="sr-only"> ({t("blog.openOriginalNewTabHint")})</span>
                </a>
              </div>
            </AnimateIn>

            <AnimateIn delay={0.12}>
              <figure className="mt-10 overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={post.featuredImageUrl ?? BLOG_CARD_FALLBACK_IMAGE}
                  alt={t("blog.featuredImageAlt", { title: post.title })}
                  className="w-full object-cover aspect-[21/10] sm:aspect-[21/9]"
                  loading="eager"
                  decoding="async"
                />
              </figure>
            </AnimateIn>
          </div>
        </div>

        <AnimateIn delay={0.06}>
          <div className="mx-auto max-w-3xl px-4 pt-14 sm:px-6 lg:px-8">
            <section
              id="article-body"
              aria-labelledby="article-title"
              className="prose prose-lg prose-invert max-w-none prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:font-bold prose-headings:text-mist prose-p:text-mist/95 prose-p:leading-[1.75] prose-li:text-mist/95 prose-strong:text-mist prose-a:text-lime prose-a:underline prose-a:decoration-lime/45 prose-a:underline-offset-[3px] hover:prose-a:decoration-lime prose-blockquote:border-lime/45 prose-img:rounded-xl prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/35 prose-hr:border-white/15 afrilex-wp-content pb-16"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
            <p className="border-t border-white/10 pt-12 text-xs leading-relaxed text-mist/69">
              {t("blog.sourceFooter")}
            </p>

            <ArticleComments wpPostId={post.id} />

            <div className="h-16" aria-hidden />
          </div>
        </AnimateIn>
      </article>
    </>
  );
}
