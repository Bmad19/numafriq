-- ══════════════════════════════════════════════════════════════════════════════
-- Afrilex Conseil — Schéma Supabase / PostgreSQL  (script unique, ré-exécutable)
--
-- Mode d'emploi :
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Coller TOUT ce fichier → Run
--   3. Vérifier en bas la liste des tables et la ligne « sagnon » (super_admin)
--
-- Idempotent : peut être ré-exécuté sans casser une base déjà créée.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE users — agents, admins, super_admin du bureau
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id                BIGSERIAL PRIMARY KEY,
  username          TEXT UNIQUE NOT NULL,
  password          TEXT NOT NULL,                     -- bcrypt hash
  full_name         TEXT NOT NULL,
  email             TEXT,
  role              TEXT NOT NULL DEFAULT 'agent'
                    CHECK (role IN ('agent','admin','super_admin')),
  avatar            TEXT,
  practice_domains  TEXT,                              -- CSV ; '*' = tous
  first_login       BOOLEAN NOT NULL DEFAULT TRUE,
  active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  last_login        TIMESTAMPTZ
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS practice_domains TEXT;

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE sessions — tokens bureau (custom, hors Supabase Auth)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sessions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_token_idx   ON sessions(token);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE projects — dossiers cabinet
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS projects (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  client      TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'en_cours'
              CHECK (status IN ('en_cours','termine','en_pause','annule')),
  priority    TEXT DEFAULT 'normale'
              CHECK (priority IN ('basse','normale','haute','urgente')),
  budget      NUMERIC DEFAULT 0,
  deadline    DATE,
  progress    INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE missions — tâches assignées aux agents
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS missions (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  project_id  BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  assigned_to BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'a_faire'
              CHECK (status IN ('a_faire','en_cours','termine')),
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE hr_records — RH (congés, absences, primes…)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hr_records (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL
              CHECK (type IN ('conge','absence','retard','prime','note')),
  title       TEXT NOT NULL,
  description TEXT,
  date        DATE NOT NULL,
  amount      NUMERIC DEFAULT 0,
  status      TEXT DEFAULT 'en_attente'
              CHECK (status IN ('en_attente','approuve','refuse')),
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE accounting — comptabilité cabinet
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS accounting (
  id          BIGSERIAL PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('recette','depense')),
  category    TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  description TEXT NOT NULL,
  project_id  BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE messages — chat interne agents
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messages (
  id         BIGSERIAL PRIMARY KEY,
  sender_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel    TEXT DEFAULT 'general',
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE feedback — retours clients (note + commentaire)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
  id           BIGSERIAL PRIMARY KEY,
  client_name  TEXT NOT NULL,
  project_id   BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  category     TEXT DEFAULT 'satisfaction',
  status       TEXT DEFAULT 'nouveau'
               CHECK (status IN ('nouveau','traite','archive')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE clients + client_sessions + client_messages — espace client
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clients (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,            -- bcrypt hash
  company    TEXT,
  phone      TEXT,
  project_id BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_sessions (
  id         BIGSERIAL PRIMARY KEY,
  client_id  BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS client_sessions_token_idx     ON client_sessions(token);
CREATE INDEX IF NOT EXISTS client_sessions_client_id_idx ON client_sessions(client_id);

CREATE TABLE IF NOT EXISTS client_messages (
  id          BIGSERIAL PRIMARY KEY,
  client_id   BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client','agent')),
  sender_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS client_messages_client_id_idx ON client_messages(client_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE leads — demandes de projet (formulaire contact public)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leads (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  company     TEXT,
  service     TEXT,
  domain      TEXT DEFAULT 'non_classe',
  budget      TEXT,
  timeline    TEXT,
  source      TEXT DEFAULT 'contact_web',
  message     TEXT NOT NULL,
  status      TEXT DEFAULT 'nouveau',
  assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS domain      TEXT DEFAULT 'non_classe';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source      TEXT DEFAULT 'contact_web';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL;
UPDATE leads SET source = COALESCE(NULLIF(trim(source), ''), 'contact_web');
UPDATE leads SET domain = COALESCE(NULLIF(trim(domain), ''), 'non_classe');

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('nouveau','en_cours','converti','perdu','archive'));

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE job_offers — offres publiées depuis le bureau, affichées sur /recrutement
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS job_offers (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  position_key    TEXT,                                  -- aligné avec careers_positions (formulaire candidature)
  title_fr        TEXT NOT NULL,
  title_en        TEXT,
  summary_fr      TEXT NOT NULL,
  summary_en      TEXT,
  meta_fr         TEXT,                                  -- ex : "CDD · Ouagadougou · démarrage immédiat"
  meta_en         TEXT,
  content_fr      TEXT,                                  -- description longue (HTML simple)
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
CREATE INDEX IF NOT EXISTS job_offers_published_idx ON job_offers(is_published, sort_order, published_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE blog_articles — articles publiés depuis le bureau, affichés sur /blog
-- (en complément des articles WordPress importés via blog-feed.json)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS blog_articles (
  id                BIGSERIAL PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,
  title_fr          TEXT NOT NULL,
  title_en          TEXT,
  excerpt_fr        TEXT,
  excerpt_en        TEXT,
  content_html_fr   TEXT NOT NULL,
  content_html_en   TEXT,
  cover_image_url   TEXT,                                -- URL externe OU /api/blog/images/<id>
  categories        TEXT,                                -- CSV
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  author_name       TEXT,
  created_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS blog_articles_published_idx ON blog_articles(is_published, published_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE blog_article_images — images uploadées (BYTEA, servies via /api/blog/images/:id)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS blog_article_images (
  id          BIGSERIAL PRIMARY KEY,
  article_id  BIGINT REFERENCES blog_articles(id) ON DELETE CASCADE,
  filename    TEXT,
  mime        TEXT NOT NULL,
  data        BYTEA NOT NULL,
  size_bytes  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS blog_article_images_article_idx ON blog_article_images(article_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE afrilex_blog_comments — commentaires (WP + articles bureau)
-- wp_post_id = ID REST WordPress  OU  bureau_article_id = blog_articles.id
-- (exactement l'un des deux est rempli)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.afrilex_blog_comments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_post_id         BIGINT,
  bureau_article_id  BIGINT,
  author_name        TEXT NOT NULL CHECK (char_length(author_name)  BETWEEN 2 AND 120),
  author_email       TEXT NOT NULL CHECK (char_length(author_email) BETWEEN 5 AND 254),
  body               TEXT NOT NULL CHECK (char_length(body)         BETWEEN 3 AND 4000),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
CREATE INDEX IF NOT EXISTS afrilex_blog_comments_wp_post_created_idx
  ON public.afrilex_blog_comments (wp_post_id, created_at);
CREATE INDEX IF NOT EXISTS afrilex_blog_comments_bureau_idx
  ON public.afrilex_blog_comments (bureau_article_id, created_at);

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS — updated_at automatique sur projects et leads
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_job_offers_updated_at ON job_offers;
CREATE TRIGGER trg_job_offers_updated_at
  BEFORE UPDATE ON job_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_blog_articles_updated_at ON blog_articles;
CREATE TRIGGER trg_blog_articles_updated_at
  BEFORE UPDATE ON blog_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — désactivé (l'API Express utilise la service_role_key
-- qui bypass le RLS ; la sécurité applicative est dans Express).
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE users                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE missions                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_records                DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounting                DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions           DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages           DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE afrilex_blog_comments     DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers                DISABLE ROW LEVEL SECURITY;
ALTER TABLE blog_articles             DISABLE ROW LEVEL SECURITY;
ALTER TABLE blog_article_images       DISABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════════════
-- COMPTE SUPER ADMIN — login : SAGNON  /  password : SAGNON
-- (hash bcrypt $2b$12$… correspondant au mot de passe « SAGNON » exact, casse comprise)
-- À CHANGER EN PRODUCTION via l'écran « Profil » du bureau dès la première connexion.
--
-- Règle d'auth bureau-api.cjs : le username saisi est mis en minuscule avant la
-- requête → on stocke « sagnon » en base, et le formulaire accepte SAGNON ou sagnon.
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO users (username, password, full_name, email, role, first_login, active, practice_domains)
VALUES (
  'sagnon',
  '$2b$12$neroZBVpVUyy9dg0Wvnaau7jpfjn/IViI9p6EO8xKZ.Tatfqyp8pS',
  'Administrateur Afrilex',
  'cabinet@afrilexconseil.com',
  'super_admin',
  FALSE,
  TRUE,
  '*'
)
ON CONFLICT (username) DO UPDATE
  SET password    = EXCLUDED.password,
      role        = 'super_admin',
      active      = TRUE,
      first_login = FALSE,
      practice_domains = COALESCE(users.practice_domains, '*');

-- ══════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATIONS — la sortie doit afficher la liste des tables et la ligne sagnon
-- ══════════════════════════════════════════════════════════════════════════════
SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT id, username, full_name, role, active, first_login
FROM users
WHERE username = 'sagnon';
