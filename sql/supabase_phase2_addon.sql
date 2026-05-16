-- ══════════════════════════════════════════════════════════════════════════════
-- Afrilex Conseil — Phase 2 dossiers : honoraires, paiements, demandes RDV, diligences
--
-- À EXÉCUTER UNE FOIS dans Supabase Dashboard → SQL Editor → Run
-- (idempotent — peut être ré-exécuté sans risque)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Honoraires (factures émises) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_invoices (
  id              BIGSERIAL PRIMARY KEY,
  project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invoice_number  TEXT,                        -- ex : FAC-2026-042 (UNIQUE plus bas, nullable pour brouillons)
  title           TEXT NOT NULL,
  description     TEXT,
  amount          NUMERIC NOT NULL DEFAULT 0,  -- montant TTC (FCFA)
  currency        TEXT NOT NULL DEFAULT 'XOF', -- FCFA UEMOA
  status          TEXT NOT NULL DEFAULT 'brouillon'
                  CHECK (status IN ('brouillon','envoyee','partiellement_payee','payee','annulee')),
  due_date        DATE,
  sent_at         TIMESTAMPTZ,
  paid_amount     NUMERIC NOT NULL DEFAULT 0,
  paid_at         TIMESTAMPTZ,                 -- date du dernier paiement (ou complet)
  notes_internal  TEXT,
  notes_client    TEXT,                        -- visible par le client
  visible_to_client BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS case_invoices_number_uq ON case_invoices(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS case_invoices_project_idx ON case_invoices(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS case_invoices_status_idx  ON case_invoices(status);

-- ── Paiements (peut être partiel, plusieurs paiements par facture) ────────────
CREATE TABLE IF NOT EXISTS case_payments (
  id          BIGSERIAL PRIMARY KEY,
  invoice_id  BIGINT NOT NULL REFERENCES case_invoices(id) ON DELETE CASCADE,
  amount      NUMERIC NOT NULL,
  paid_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  method      TEXT NOT NULL DEFAULT 'autre'
              CHECK (method IN ('especes','virement','mobile_money','cheque','carte','autre')),
  reference   TEXT,                            -- ex : numéro de chèque, ID transaction MoMo
  notes       TEXT,
  recorded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_payments_invoice_idx ON case_payments(invoice_id, paid_at);

-- ── Demandes de RDV par le client (workflow validation) ───────────────────────
CREATE TABLE IF NOT EXISTS case_event_requests (
  id                  BIGSERIAL PRIMARY KEY,
  project_id          BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id           BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type                TEXT NOT NULL DEFAULT 'rdv'
                      CHECK (type IN ('audience','rdv','consultation','autre')),
  title               TEXT NOT NULL,
  proposed_date       TIMESTAMPTZ NOT NULL,
  alternative_date    TIMESTAMPTZ,             -- une 2e date proposée par le client
  message             TEXT,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','accepted','rescheduled','refused','cancelled')),
  decided_at          TIMESTAMPTZ,
  decided_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
  decided_message     TEXT,
  scheduled_event_id  BIGINT REFERENCES case_events(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_event_requests_status_idx  ON case_event_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS case_event_requests_project_idx ON case_event_requests(project_id);
CREATE INDEX IF NOT EXISTS case_event_requests_client_idx  ON case_event_requests(client_id);

-- ── Diligences / time-tracking interne ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_activities (
  id                BIGSERIAL PRIMARY KEY,
  project_id        BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id           BIGINT REFERENCES users(id) ON DELETE SET NULL, -- auteur
  kind              TEXT NOT NULL DEFAULT 'autre'
                    CHECK (kind IN ('consultation','redaction','audience','recherche','rdv','expertise','telephone','email','autre')),
  title             TEXT NOT NULL,
  description       TEXT,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes  INTEGER NOT NULL DEFAULT 0,
  billable          BOOLEAN NOT NULL DEFAULT TRUE,
  hourly_rate       NUMERIC,                   -- FCFA/heure (optionnel)
  amount            NUMERIC,                   -- montant calculé ou saisi (FCFA)
  invoice_id        BIGINT REFERENCES case_invoices(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_activities_project_idx ON case_activities(project_id, date DESC);
CREATE INDEX IF NOT EXISTS case_activities_user_idx    ON case_activities(user_id, date DESC);
CREATE INDEX IF NOT EXISTS case_activities_billable    ON case_activities(billable, invoice_id);

-- ── Triggers updated_at ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_case_invoices_updated_at ON case_invoices;
CREATE TRIGGER trg_case_invoices_updated_at
  BEFORE UPDATE ON case_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_case_activities_updated_at ON case_activities;
CREATE TRIGGER trg_case_activities_updated_at
  BEFORE UPDATE ON case_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS désactivé (l'API Express utilise la service_role_key) ─────────────────
ALTER TABLE case_invoices         DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_payments         DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_event_requests   DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_activities       DISABLE ROW LEVEL SECURITY;

-- ── Vérification ──────────────────────────────────────────────────────────────
SELECT 'case_invoices'        AS tbl, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='case_invoices')        AS present
UNION ALL SELECT 'case_payments',         EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='case_payments')
UNION ALL SELECT 'case_event_requests',   EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='case_event_requests')
UNION ALL SELECT 'case_activities',       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='case_activities');
