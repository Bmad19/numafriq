import { blogCommentsApiOrigin } from "./blogApiOrigin";

function commentsUrl(pathAndQuery: string): string {
  const origin = blogCommentsApiOrigin();
  const p = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return origin ? `${origin}${p}` : p;
}

export type BlogPublicComment = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};

/** Source d'un article : article WordPress (wp_post_id) OU article publié depuis le bureau Afrilex (bureau_article_id). */
export type ArticleTarget =
  | { kind: "wp"; wpPostId: number }
  | { kind: "bureau"; bureauArticleId: number };

function targetQuery(target: ArticleTarget): string {
  if (target.kind === "wp") return `wp_post_id=${encodeURIComponent(String(target.wpPostId))}`;
  return `bureau_article_id=${encodeURIComponent(String(target.bureauArticleId))}`;
}

function targetBody(target: ArticleTarget): Record<string, number> {
  if (target.kind === "wp") return { wp_post_id: target.wpPostId };
  return { bureau_article_id: target.bureauArticleId };
}

export async function fetchBlogComments(
  target: ArticleTarget | number,
  signal?: AbortSignal
): Promise<BlogPublicComment[]> {
  const t: ArticleTarget = typeof target === "number" ? { kind: "wp", wpPostId: target } : target;
  const res = await fetch(
    commentsUrl(`/api/blog/comments?${targetQuery(t)}`),
    { signal, headers: { Accept: "application/json" } }
  );
  let data: { comments?: BlogPublicComment[]; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    return [];
  }
  return Array.isArray(data.comments) ? data.comments : [];
}

export async function postBlogComment(body: {
  /** Pour rétrocompatibilité — ignoré si `target` est fourni. */
  wp_post_id?: number;
  target?: ArticleTarget;
  author_name: string;
  author_email: string;
  text: string;
  website?: string;
}): Promise<{
  ok: boolean;
  comment?: BlogPublicComment;
  error?: string;
  status?: number;
}> {
  const target: ArticleTarget =
    body.target ?? { kind: "wp", wpPostId: body.wp_post_id ?? 0 };
  const res = await fetch(commentsUrl("/api/blog/comments"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      ...targetBody(target),
      author_name: body.author_name,
      author_email: body.author_email,
      body: body.text,
      website: body.website ?? "",
    }),
  });
  if (res.status === 204)
    return { ok: false, error: "Requête ignorée.", status: 204 };

  let data = {} as {
    ok?: boolean;
    comment?: BlogPublicComment;
    error?: string;
  };
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: `Erreur réseau (${res.status})`, status: res.status };
  }

  if (!res.ok)
    return { ok: false, error: data.error ?? `Erreur ${res.status}`, status: res.status };
  if (data.ok && data.comment) return { ok: true, comment: data.comment };
  return { ok: false, error: data.error ?? "Réponse invalide", status: res.status };
}
