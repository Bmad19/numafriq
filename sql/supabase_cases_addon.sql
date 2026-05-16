-- ══════════════════════════════════════════════════════════════════════════════
-- Afrilex Conseil — Module « Dossiers » (cabinet juridique)
--
-- À EXÉCUTER UNE FOIS dans Supabase Dashboard → SQL Editor → Run
-- (idempotent — peut être ré-exécuté sans risque)
--
-- Ajouts :
--   • Multi-clients par dossier  (table case_clients M2M)
--   • Champs juridiques sur projects (case_number, practice_area, current_phase, next_action)
--   • Étapes / jalons procéduraux (case_milestones)
--   • Audiences / RDV / échéances (case_events)
--   • Documents partagés bidirectionnels (case_documents en BYTEA)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Champs juridiques sur projects ────────────────────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS case_number       TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS practice_area     TEXT; -- ex: 'ohada', 'fiscal', 'social', 'penal_aff', 'civil', 'commercial', 'autre'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_phase     TEXT; -- libellé libre ex: 'Mise en état', 'Audience plaidoirie'
ALTER TABLE projects ADD COLUMN IF NOT EXISTS next_action       TEXT; -- prochaine action prévue
ALTER TABLE projects ADD COLUMN IF NOT EXISTS next_action_date  DATE;
CREATE UNIQUE INDEX IF NOT EXISTS projects_case_number_uq ON projects(case_number) WHERE case_number IS NOT NULL;

-- ── Multi-clients par dossier (M2M) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_clients (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id  BIGINT NOT NULL REFERENCES clients(id)  ON DELETE CASCADE,
  role       TEXT DEFAULT 'principal',               -- 'principal', 'co-mandant', 'representant', 'autre'
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  added_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, client_id)
);
CREATE INDEX IF NOT EXISTS case_clients_client_idx  ON case_clients(client_id);
CREATE INDEX IF NOT EXISTS case_clients_project_idx ON case_clients(project_id);

-- ── Migration : copier clients.project_id existant vers case_clients ──────────
INSERT INTO case_clients (project_id, client_id, role)
SELECT c.project_id, c.id, 'principal'
FROM clients c
WHERE c.project_id IS NOT NULL
ON CONFLICT (project_id, client_id) DO NOTHING;

-- ── Étapes / jalons d'un dossier ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_milestones (
  id                  BIGSERIAL PRIMARY KEY,
  project_id          BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  due_date            DATE,
  completed_at        TIMESTAMPTZ,
  completed_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'a_faire'
                      CHECK (status IN ('a_faire','en_cours','termine','reporte','annule')),
  order_index         INTEGER NOT NULL DEFAULT 0,
  visible_to_client   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_milestones_project_idx ON case_milestones(project_id, order_index);
CREATE INDEX IF NOT EXISTS case_milestones_due_idx     ON case_milestones(due_date);

-- ── Audiences / RDV / échéances ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_events (
  id                  BIGSERIAL PRIMARY KEY,
  project_id          BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type                TEXT NOT NULL DEFAULT 'rdv'
                      CHECK (type IN ('audience','rdv','echeance','depot_pieces','consultation','autre')),
  title               TEXT NOT NULL,
  location            TEXT,                          -- ex: 'TGI Ouagadougou — salle 3', 'Cabinet — visioconférence'
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration_minutes    INTEGER DEFAULT 60,
  notes_internal      TEXT,                          -- notes confidentielles équipe
  notes_client_facing TEXT,                          -- notes affichées au client
  visible_to_client   BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_sent       BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at        TIMESTAMPTZ,
  outcome             TEXT,                          -- compte-rendu post-événement
  created_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_events_project_idx   ON case_events(project_id, scheduled_at);
CREATE INDEX IF NOT EXISTS case_events_scheduled_idx ON case_events(scheduled_at);

-- ── Documents partagés (BYTEA — comme blog/CV) ────────────────────────────────
CREATE TABLE IF NOT EXISTS case_documents (
  id                  BIGSERIAL PRIMARY KEY,
  project_id          BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  kind                TEXT NOT NULL DEFAULT 'autre'
                      CHECK (kind IN ('preuve','contrat','jugement','conclusions','expertise','correspondance','identite','autre')),
  description         TEXT,
  filename            TEXT,
  mime                TEXT NOT NULL,
  size_bytes          INTEGER,
  data                BYTEA NOT NULL,
  uploaded_by_user_id   BIGINT REFERENCES users(id)   ON DELETE SET NULL, -- bureau
  uploaded_by_client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL, -- client
  visible_to_client   BOOLEAN NOT NULL DEFAULT TRUE,
  confidential        BOOLEAN NOT NULL DEFAULT FALSE,                     -- override : jamais visible client même si visible_to_client=true
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_documents_project_idx ON case_documents(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS case_documents_kind_idx    ON case_documents(kind);

-- ── Triggers updated_at ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_case_milestones_updated_at ON case_milestones;
CREATE TRIGGER trg_case_milestones_updated_at
  BEFORE UPDATE ON case_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_case_events_updated_at ON case_events;
CREATE TRIGGER trg_case_events_updated_at
  BEFORE UPDATE ON case_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS désactivé (l'API Express utilise la service_role_key) ─────────────────
ALTER TABLE case_clients      DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_milestones   DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_events       DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_documents    DISABLE ROW LEVEL SECURITY;

-- ── Vérification ──────────────────────────────────────────────────────────────
SELECT 'projects.case_number'    AS col, EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='case_number') AS present
UNION ALL SELECT 'projects.practice_area',     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='practice_area')
UNION ALL SELECT 'projects.current_phase',     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='current_phase')
UNION ALL SELECT 'projects.next_action_date',  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='next_action_date')
UNION ALL SELECT 'case_clients table',         EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_schema='public' AND table_name='case_clients')
UNION ALL SELECT 'case_milestones table',      EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_schema='public' AND table_name='case_milestones')
UNION ALL SELECT 'case_events table',          EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_schema='public' AND table_name='case_events')
UNION ALL SELECT 'case_documents table',       EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_schema='public' AND table_name='case_documents');
