-- Afrilex blog — lecteurs peuvent commenter depuis le site SPA (pas via l’API WP).
-- À exécuter dans SQL Editor Supabase (ou migrations), une seule fois.
-- Référencée par scripts/bureau-api.cjs (/api/blog/comments).

create table if not exists public.afrilex_blog_comments (
  id uuid primary key default gen_random_uuid(),
  wp_post_id bigint not null check (wp_post_id > 0),
  author_name text not null check (char_length(author_name) between 2 and 120),
  author_email text not null check (char_length(author_email) between 5 and 254),
  body text not null check (char_length(body) between 3 and 4000),
  created_at timestamptz not null default now()
);

comment on table public.afrilex_blog_comments is 'Commentaires publics SPA Afrilex ; wp_post_id = ID REST WordPress de l''article.';
comment on column public.afrilex_blog_comments.wp_post_id is 'posts.id depuis https://afrilexconseil.com/wp-json/wp/v2/posts';

create index if not exists afrilex_blog_comments_wp_post_created_idx
  on public.afrilex_blog_comments (wp_post_id, created_at);
