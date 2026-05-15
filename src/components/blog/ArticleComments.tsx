import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimateIn } from "../animations/AnimateIn";
import {
  ArticleTarget,
  BlogPublicComment,
  fetchBlogComments,
  postBlogComment,
} from "../../lib/blogCommentsApi";

type ArticleCommentsProps =
  | { wpPostId: number; bureauArticleId?: never }
  | { wpPostId?: never; bureauArticleId: number };

export function ArticleComments(props: ArticleCommentsProps) {
  const target: ArticleTarget = useMemo(
    () =>
      "bureauArticleId" in props && props.bureauArticleId
        ? { kind: "bureau", bureauArticleId: props.bureauArticleId }
        : { kind: "wp", wpPostId: (props as { wpPostId: number }).wpPostId },
    [props],
  );
  const targetKey = target.kind === "wp" ? `wp:${target.wpPostId}` : `ba:${target.bureauArticleId}`;
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? "en-GB" : "fr-FR";

  const [comments, setComments] = useState<BlogPublicComment[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [text, setText] = useState("");
  /** Pot de miel : laisser vide (masqué). */
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancel = false;
    const ac = new AbortController();
    setLoadingList(true);
    fetchBlogComments(target, ac.signal)
      .then((list) => {
        if (!cancel) setComments(list);
      })
      .catch(() => {
        if (!cancel) setComments([]);
      })
      .finally(() => {
        if (!cancel) setLoadingList(false);
      });
    return () => {
      cancel = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const fmtDate = useMemo(
    () => (iso: string) => {
      try {
        return new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [locale]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormMsg(null);
    setSubmitting(true);
    const r = await postBlogComment({
      target,
      author_name: name.trim(),
      author_email: email.trim(),
      text: text.trim(),
      website: honeypot,
    });
    setSubmitting(false);
    if (r.ok && r.comment) {
      setComments((prev) => [...prev, r.comment!]);
      setName("");
      setEmail("");
      setText("");
      setHoneypot("");
      setFormMsg({ kind: "ok", text: t("blog.comments.success") });
      return;
    }
    setFormMsg({
      kind: "err",
      text:
        r.status === 429
          ? t("blog.comments.rateLimit")
          : r.error ?? t("blog.comments.error"),
    });
  }

  return (
    <section className="border-t border-white/10 pt-14" aria-labelledby="comments-heading">
      <AnimateIn>
        <h2
          id="comments-heading"
          className="font-display text-2xl font-bold text-mist sm:text-3xl text-balance"
        >
          {t("blog.comments.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist/77">
          {t("blog.comments.subtitle")}
        </p>
      </AnimateIn>

      <div className="mt-10 space-y-6">
        {loadingList ? (
          <div className="flex items-center gap-3 text-sm text-mist/72">
            <div className="h-5 w-5 animate-spin rounded-full border border-white/15 border-t-lime" />
            {t("blog.comments.loadingList")}
          </div>
        ) : comments.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6 text-sm text-mist/78">
            {t("blog.comments.empty")}
          </p>
        ) : (
          <ul className="space-y-5">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4"
              >
                <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                  <span className="font-semibold text-mist">{c.author_name}</span>
                  <time className="text-xs text-mist/64" dateTime={c.created_at}>
                    {fmtDate(c.created_at)}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-mist/90">
                  {c.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnimateIn delay={0.05}>
        <form
          onSubmit={onSubmit}
          className="relative mt-12 space-y-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-6 sm:p-8"
          noValidate
        >
          <p className="text-sm font-medium text-mist">{t("blog.comments.formTitle")}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="sr-only">
                {t("blog.comments.name")}
              </label>
              <input
                id="c-name"
                name="author_name"
                type="text"
                autoComplete="name"
                required
                maxLength={120}
                placeholder={t("blog.comments.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-sm text-mist outline-none placeholder:text-mist/57 focus:border-lime/50"
              />
            </div>
            <div>
              <label htmlFor="c-email" className="sr-only">
                {t("blog.comments.email")}
              </label>
              <input
                id="c-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder={t("blog.comments.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-sm text-mist outline-none placeholder:text-mist/57 focus:border-lime/50"
              />
            </div>
          </div>

          {/* Masqué : anti-bot */}
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0" aria-hidden>
            <label htmlFor="c-site">Website</label>
            <input
              id="c-site"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="c-body" className="sr-only">
              {t("blog.comments.message")}
            </label>
            <textarea
              id="c-body"
              name="comment"
              required
              rows={5}
              maxLength={4000}
              placeholder={t("blog.comments.message")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="styled-scrollbar w-full resize-y rounded-xl border border-white/15 bg-ink/60 px-4 py-3 text-sm leading-relaxed text-mist outline-none placeholder:text-mist/57 focus:border-lime/50 min-h-[120px]"
            />
            <p className="mt-2 text-xs text-mist/64">{t("blog.comments.hintModeration")}</p>
          </div>

          {formMsg ? (
            <div
              role="status"
              className={`rounded-xl px-4 py-3 text-sm ${
                formMsg.kind === "ok"
                  ? "border border-lime/30 bg-lime/10 text-mist"
                  : "border border-coral/30 bg-coral/10 text-mist"
              }`}
            >
              {formMsg.text}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-coral px-8 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? t("blog.comments.sending") : t("blog.comments.submit")}
          </button>
        </form>
      </AnimateIn>
    </section>
  );
}
