-- ══════════════════════════════════════════════════════════════════════════════
-- NUMAFRIQ — Schéma Supabase (PostgreSQL)
-- Coller ce script dans : Supabase Dashboard → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Agents / Admins ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           BIGSERIAL PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,                     -- bcrypt hash
  full_name    TEXT NOT NULL,
  email        TEXT,
  role         TEXT NOT NULL DEFAULT 'agent'
               CHECK (role IN ('agent','admin','super_admin')),
  avatar       TEXT,
  first_login  BOOLEAN NOT NULL DEFAULT TRUE,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_login   TIMESTAMPTZ
);

-- ── Sessions bureau (tokens custom, pas Supabase Auth) ────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token);

-- ── Projets ───────────────────────────────────────────────────────────────────
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

-- ── Missions ──────────────────────────────────────────────────────────────────
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

-- ── Ressources Humaines ───────────────────────────────────────────────────────
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

-- ── Comptabilité ──────────────────────────────────────────────────────────────
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

-- ── Chat interne ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id         BIGSERIAL PRIMARY KEY,
  sender_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel    TEXT DEFAULT 'general',
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Retours clients ───────────────────────────────────────────────────────────
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

-- ── Clients (espace client) ────────────────────────────────────────────────────
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

-- ── Sessions clients ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_sessions (
  id         BIGSERIAL PRIMARY KEY,
  client_id  BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS client_sessions_token_idx ON client_sessions(token);

-- ── Messages clients ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_messages (
  id          BIGSERIAL PRIMARY KEY,
  client_id   BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client','agent')),
  sender_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,   -- agent qui répond
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Demandes de projet (formulaire contact) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  company     TEXT,
  service     TEXT,
  budget      TEXT,
  timeline    TEXT,
  message     TEXT NOT NULL,
  status      TEXT DEFAULT 'nouveau'
              CHECK (status IN ('nouveau','en_cours','converti','perdu','archive')),
  assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Candidatures (formulaire carrières — API Node /api/careers.php) ───────────
CREATE TABLE IF NOT EXISTS job_applications (
  id                      BIGSERIAL PRIMARY KEY,
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  email                   TEXT NOT NULL,
  phone                   TEXT,
  city_country            TEXT,
  linkedin_url            TEXT,
  position_applied        TEXT NOT NULL,
  contract_type           TEXT NOT NULL,
  availability            TEXT,
  experience_years        TEXT,
  education_level         TEXT,
  languages               TEXT,
  motivation              TEXT NOT NULL,
  cv_original_name        TEXT,
  cv_mime                 TEXT,
  cv_data                 BYTEA NOT NULL,
  locale                  TEXT NOT NULL DEFAULT 'fr',
  consent_data_processing BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS job_applications_position_idx ON job_applications(position_applied);
CREATE INDEX IF NOT EXISTS job_applications_created_idx ON job_applications(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS — updated_at automatique
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- L'API Express utilise la service_role_key qui bypass le RLS.
-- On désactive le RLS sur toutes les tables (la sécurité est dans Express).
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions        DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects        DISABLE ROW LEVEL SECURITY;
ALTER TABLE missions        DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_records      DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounting      DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages        DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback        DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients         DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads           DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════════════
-- DONNÉES INITIALES — Super admin
-- Le compte super admin bureau « sagnon » est créé au premier démarrage de bureau-api.cjs (hash bcrypt).
-- ══════════════════════════════════════════════════════════════════════════════
-- (Le seed est fait automatiquement par bureau-api.cjs au démarrage)

-- ══════════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION : lister les tables créées
-- ══════════════════════════════════════════════════════════════════════════════
SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
