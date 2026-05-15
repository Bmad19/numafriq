-- ══════════════════════════════════════════════════════════════════════════════
-- Afrilex Conseil — Ajout : modules « Offres d'emploi » + « Blog » publiables
--                          depuis le bureau (super_admin / admin)
--
-- À EXÉCUTER UNE FOIS dans Supabase Dashboard → SQL Editor → New query → Run
-- (idempotent, peut être ré-exécuté sans risque)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Offres d'emploi publiables ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_offers (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  position_key    TEXT,
  title_fr        TEXT NOT NULL,
  title_en        TEXT,
  summary_fr      TEXT NOT NULL,
  summary_en      TEXT,
  meta_fr         TEXT,
  meta_en         TEXT,
  content_fr      TEXT,
  content_en      TEXT,
  contract_type   TEXT DEFAULT 'cdd',
  location        TEXT,
  is_new          BOOLEAN NOT NULL DEFAULT TRUE,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  published_at    TIMESTAMPTZ,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS job_offers_published_idx
  ON job_offers(is_published, sort_order, published_at DESC);

-- ── Articles blog publiables ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_articles (
  id                BIGSERIAL PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  title_fr          TEXT NOT NULL,
  title_en          TEXT,
  excerpt_fr        TEXT,
  excerpt_en        TEXT,
  content_html_fr   TEXT NOT NULL,
  content_html_en   TEXT,
  cover_image_url   TEXT,
  categories        TEXT,
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  author_name       TEXT,
  created_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS blog_articles_published_idx
  ON blog_articles(is_published, published_at DESC);

-- ── Images uploadées (BYTEA, servies via /api/blog/images/:id) ────────────────
CREATE TABLE IF NOT EXISTS blog_article_images (
  id          BIGSERIAL PRIMARY KEY,
  article_id  BIGINT REFERENCES blog_articles(id) ON DELETE CASCADE,
  filename    TEXT,
  mime        TEXT NOT NULL,
  data        BYTEA NOT NULL,
  size_bytes  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS blog_article_images_article_idx
  ON blog_article_images(article_id);

-- ── Triggers updated_at ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_job_offers_updated_at ON job_offers;
CREATE TRIGGER trg_job_offers_updated_at
  BEFORE UPDATE ON job_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_blog_articles_updated_at ON blog_articles;
CREATE TRIGGER trg_blog_articles_updated_at
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Commentaires : ajout du support « article bureau » (compatible WP) ────────
ALTER TABLE public.afrilex_blog_comments ALTER COLUMN wp_post_id DROP NOT NULL;
ALTER TABLE public.afrilex_blog_comments ADD COLUMN IF NOT EXISTS bureau_article_id BIGINT;
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.afrilex_blog_comments
      ADD CONSTRAINT afrilex_blog_comments_bureau_article_id_fkey
      FOREIGN KEY (bureau_article_id) REFERENCES blog_articles(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
ALTER TABLE public.afrilex_blog_comments DROP CONSTRAINT IF EXISTS comment_target_one_of;
ALTER TABLE public.afrilex_blog_comments ADD CONSTRAINT comment_target_one_of CHECK (
  (wp_post_id IS NOT NULL AND bureau_article_id IS NULL)
  OR (wp_post_id IS NULL AND bureau_article_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS afrilex_blog_comments_bureau_idx
  ON public.afrilex_blog_comments (bureau_article_id, created_at);

-- ── RLS désactivé (l'API Express utilise la service_role_key) ─────────────────
ALTER TABLE job_offers           DISABLE ROW LEVEL SECURITY;
ALTER TABLE blog_articles        DISABLE ROW LEVEL SECURITY;
ALTER TABLE blog_article_images  DISABLE ROW LEVEL SECURITY;

-- ── Vérification : doit lister les 3 nouvelles tables sans erreur ─────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('job_offers', 'blog_articles', 'blog_article_images')
ORDER BY table_name;
