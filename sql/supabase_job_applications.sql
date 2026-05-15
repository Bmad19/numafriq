-- ══════════════════════════════════════════════════════════════════════════════
-- Migration — table job_applications (candidatures via API Node Render)
-- Supabase → SQL Editor → Run (si le projet existait avant l’ajout au setup.sql)
-- ══════════════════════════════════════════════════════════════════════════════

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

ALTER TABLE job_applications DISABLE ROW LEVEL SECURITY;
