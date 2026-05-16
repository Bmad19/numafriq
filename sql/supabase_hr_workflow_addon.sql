-- ══════════════════════════════════════════════════════════════════════════════
-- Afrilex Conseil — RH workflow à 2 niveaux (agent → admin → super_admin)
--
-- À EXÉCUTER UNE FOIS dans Supabase Dashboard → SQL Editor → Run
-- (idempotent — peut être ré-exécuté sans risque)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Dates de début/fin pour congés et absences ────────────────────────────────
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS end_date   DATE;

-- ── Décisions du workflow ─────────────────────────────────────────────────────
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS admin_decision         TEXT;
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS admin_decision_at      TIMESTAMPTZ;
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS admin_decision_by      BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS admin_comment          TEXT;

ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS super_admin_decision    TEXT;
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS super_admin_decision_at TIMESTAMPTZ;
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS super_admin_decision_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS super_admin_comment     TEXT;

-- ── Workflow toggle (true pour conge/absence/retard demandés par agent) ──────
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS requires_workflow BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE hr_records ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMPTZ DEFAULT NOW();

-- ── Mise à jour des statuts autorisés ─────────────────────────────────────────
-- Workflow complet : en_attente → valide_admin → approuve (ou refuse à n'importe quelle étape)
ALTER TABLE hr_records DROP CONSTRAINT IF EXISTS hr_records_status_check;
ALTER TABLE hr_records ADD CONSTRAINT hr_records_status_check
  CHECK (status IN ('en_attente','valide_admin','refuse_admin','approuve','refuse'));

ALTER TABLE hr_records DROP CONSTRAINT IF EXISTS hr_records_admin_decision_check;
ALTER TABLE hr_records ADD CONSTRAINT hr_records_admin_decision_check
  CHECK (admin_decision IS NULL OR admin_decision IN ('valide','refuse'));

ALTER TABLE hr_records DROP CONSTRAINT IF EXISTS hr_records_super_admin_decision_check;
ALTER TABLE hr_records ADD CONSTRAINT hr_records_super_admin_decision_check
  CHECK (super_admin_decision IS NULL OR super_admin_decision IN ('approuve','refuse'));

-- ── Migration douce : pour les enregistrements existants, copier date → start_date/end_date ───
UPDATE hr_records SET start_date = date WHERE start_date IS NULL AND date IS NOT NULL;
UPDATE hr_records SET end_date   = date WHERE end_date   IS NULL AND date IS NOT NULL;

-- ── Index utiles pour le filtrage par statut + dates ──────────────────────────
CREATE INDEX IF NOT EXISTS hr_records_status_idx       ON hr_records(status, created_at DESC);
CREATE INDEX IF NOT EXISTS hr_records_user_idx         ON hr_records(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hr_records_workflow_idx     ON hr_records(requires_workflow, status);
CREATE INDEX IF NOT EXISTS hr_records_dates_idx        ON hr_records(start_date, end_date);

-- ── Vérification ──────────────────────────────────────────────────────────────
SELECT 'hr_records.start_date'           AS col, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_records' AND column_name='start_date') AS present
UNION ALL SELECT 'hr_records.end_date',            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_records' AND column_name='end_date')
UNION ALL SELECT 'hr_records.admin_decision',      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_records' AND column_name='admin_decision')
UNION ALL SELECT 'hr_records.super_admin_decision',EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_records' AND column_name='super_admin_decision')
UNION ALL SELECT 'hr_records.requires_workflow',   EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hr_records' AND column_name='requires_workflow');
