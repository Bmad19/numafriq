-- ══════════════════════════════════════════════════════════════════════════════
-- Afrilex Conseil — Module Boîte de réception (leads + candidatures unifiées)
--
-- À EXÉCUTER UNE FOIS dans Supabase Dashboard → SQL Editor → Run
-- (idempotent — peut être ré-exécuté sans risque)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Table job_applications (candidatures CV) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  id                       BIGSERIAL PRIMARY KEY,
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  email                    TEXT NOT NULL,
  phone                    TEXT,
  city_country             TEXT,
  linkedin_url             TEXT,
  position_applied         TEXT NOT NULL,
  contract_type            TEXT NOT NULL,
  availability             TEXT,
  experience_years         TEXT,
  education_level          TEXT,
  languages                TEXT,
  motivation               TEXT NOT NULL,
  application_mode         TEXT,                       -- offer / profile_pool / spontaneous
  job_offer_ref            TEXT,                       -- slug ou id de l'offre visée
  sought_role_title        TEXT,                       -- pour le mode profil ouvert
  cv_original_name         TEXT,
  cv_mime                  TEXT,
  cv_data                  BYTEA NOT NULL,
  cv_size_bytes            INTEGER,
  locale                   TEXT NOT NULL DEFAULT 'fr',
  consent_data_processing  BOOLEAN NOT NULL DEFAULT TRUE,
  status                   TEXT NOT NULL DEFAULT 'nouveau',
  notes                    TEXT,
  assigned_to              BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── Colonnes ajoutées si déjà présentes (migration sûre) ──────────────────────
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS application_mode  TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS job_offer_ref     TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS sought_role_title TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cv_size_bytes     INTEGER;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'nouveau';
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS notes             TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS assigned_to       BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE job_applications ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('nouveau','examine','entretien','refuse','embauche','archive'));

CREATE INDEX IF NOT EXISTS job_applications_position_idx ON job_applications(position_applied);
CREATE INDEX IF NOT EXISTS job_applications_status_idx   ON job_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS job_applications_created_idx  ON job_applications(created_at DESC);

DROP TRIGGER IF EXISTS trg_job_applications_updated_at ON job_applications;
CREATE TRIGGER trg_job_applications_updated_at
  BEFORE UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY;

-- ── Vérification ──────────────────────────────────────────────────────────────
SELECT 'job_applications table' AS check_name, EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'job_applications'
) AS present
UNION ALL
SELECT 'job_applications.status', EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'job_applications' AND column_name = 'status'
)
UNION ALL
SELECT 'job_applications.assigned_to', EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'job_applications' AND column_name = 'assigned_to'
);
