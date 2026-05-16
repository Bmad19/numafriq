-- ══════════════════════════════════════════════════════════════════════════════
-- Afrilex Conseil — Phase 3 : signatures électroniques + templates de dossier
-- À EXÉCUTER UNE FOIS dans Supabase Dashboard → SQL Editor → Run
-- (idempotent)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Signatures électroniques ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_signatures (
  id              BIGSERIAL PRIMARY KEY,
  project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  document_id     BIGINT REFERENCES case_documents(id) ON DELETE SET NULL, -- optionnel : signature attachée à un document
  client_id       BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content_text    TEXT NOT NULL,                -- texte affiché au client (clauses, déclarations…)
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','signed','refused','cancelled','expired')),
  signed_at       TIMESTAMPTZ,
  signed_name     TEXT,                         -- nom complet typé par le client (= signature)
  signed_ip       TEXT,                         -- IP au moment de la signature
  signed_user_agent TEXT,                       -- navigateur (preuve)
  signed_hash     TEXT,                         -- SHA-256 de (content_text + signed_name + signed_at) — preuve d'intégrité
  refused_at      TIMESTAMPTZ,
  refused_reason  TEXT,
  expires_at      TIMESTAMPTZ,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_signatures_project_idx ON case_signatures(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS case_signatures_client_idx  ON case_signatures(client_id, status);
CREATE INDEX IF NOT EXISTS case_signatures_status_idx  ON case_signatures(status);

DROP TRIGGER IF EXISTS trg_case_signatures_updated_at ON case_signatures;
CREATE TRIGGER trg_case_signatures_updated_at
  BEFORE UPDATE ON case_signatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE case_signatures DISABLE ROW LEVEL SECURITY;

-- ── Templates de dossier (modèles pré-remplis) ────────────────────────────────
CREATE TABLE IF NOT EXISTS case_templates (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  practice_area   TEXT,
  default_status  TEXT NOT NULL DEFAULT 'en_cours',
  default_priority TEXT NOT NULL DEFAULT 'normale',
  milestones_json JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{title, description, due_offset_days, order_index, visible_to_client}]
  events_json     JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{type, title, location, scheduled_offset_days, duration_minutes, visible_to_client}]
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_templates_active_idx ON case_templates(is_active, name);

DROP TRIGGER IF EXISTS trg_case_templates_updated_at ON case_templates;
CREATE TRIGGER trg_case_templates_updated_at
  BEFORE UPDATE ON case_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE case_templates DISABLE ROW LEVEL SECURITY;

-- ── Templates initiaux (exemples) ────────────────────────────────────────────
INSERT INTO case_templates (name, description, practice_area, milestones_json) VALUES
('Création SARL OHADA',
 'Modèle pour création de SARL selon l''Acte Uniforme OHADA — 7 étapes types.',
 'ohada',
 '[
   {"title": "Réception infos client", "description": "Collecte capital, associés, statuts envisagés, objet social", "due_offset_days": 1, "order_index": 10, "visible_to_client": true},
   {"title": "Rédaction projet de statuts", "description": "Brouillon des statuts conformes AUSCGIE", "due_offset_days": 5, "order_index": 20, "visible_to_client": true},
   {"title": "Validation associés", "description": "Tour de table, intégration des remarques", "due_offset_days": 8, "order_index": 30, "visible_to_client": true},
   {"title": "Signature des statuts", "description": "Signature en présence d''un notaire ou par voie privée", "due_offset_days": 12, "order_index": 40, "visible_to_client": true},
   {"title": "Dépôt RCCM", "description": "Dépôt au greffe du tribunal de commerce", "due_offset_days": 15, "order_index": 50, "visible_to_client": true},
   {"title": "Insertion légale (JO)", "description": "Publication dans un journal d''annonces légales", "due_offset_days": 20, "order_index": 60, "visible_to_client": true},
   {"title": "Remise immatriculation", "description": "Remise du RCCM et IFU au client", "due_offset_days": 25, "order_index": 70, "visible_to_client": true}
 ]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO case_templates (name, description, practice_area, milestones_json) VALUES
('Contentieux civil — 1ère instance',
 'Modèle de procédure civile devant le tribunal de 1ère instance — phases standards.',
 'civil',
 '[
   {"title": "Réception saisine + analyse dossier", "description": "Étude des pièces, constitution dossier", "due_offset_days": 3, "order_index": 10, "visible_to_client": true},
   {"title": "Rédaction assignation/requête", "description": "Acte introductif d''instance", "due_offset_days": 10, "order_index": 20, "visible_to_client": true},
   {"title": "Signification par huissier", "description": "Délivrance officielle de l''assignation", "due_offset_days": 15, "order_index": 30, "visible_to_client": true},
   {"title": "Mise en état", "description": "Échanges conclusions, communication pièces", "due_offset_days": 60, "order_index": 40, "visible_to_client": true},
   {"title": "Audience de plaidoirie", "description": "Présentation du dossier devant le tribunal", "due_offset_days": 90, "order_index": 50, "visible_to_client": true},
   {"title": "Délibéré", "description": "Mise en délibéré par le tribunal", "due_offset_days": 100, "order_index": 60, "visible_to_client": true},
   {"title": "Jugement", "description": "Notification de la décision", "due_offset_days": 120, "order_index": 70, "visible_to_client": true},
   {"title": "Voies de recours / exécution", "description": "Appel éventuel ou exécution de la décision", "due_offset_days": 150, "order_index": 80, "visible_to_client": true}
 ]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO case_templates (name, description, practice_area, milestones_json) VALUES
('Contrôle fiscal',
 'Accompagnement client lors d''un contrôle fiscal sur place ou sur pièces.',
 'fiscal',
 '[
   {"title": "Avis de vérification reçu", "description": "Analyse de l''avis et des droits du contribuable", "due_offset_days": 1, "order_index": 10, "visible_to_client": true},
   {"title": "Préparation des pièces", "description": "Rassemblement comptable, justificatifs, contrats", "due_offset_days": 7, "order_index": 20, "visible_to_client": true},
   {"title": "Phase contradictoire", "description": "Échanges avec l''administration fiscale", "due_offset_days": 30, "order_index": 30, "visible_to_client": true},
   {"title": "Notification de redressement", "description": "Réception et analyse de la proposition", "due_offset_days": 60, "order_index": 40, "visible_to_client": true},
   {"title": "Réponse motivée", "description": "Observations détaillées sur le redressement", "due_offset_days": 90, "order_index": 50, "visible_to_client": true},
   {"title": "Décision finale / contentieux", "description": "Acceptation ou contentieux fiscal", "due_offset_days": 120, "order_index": 60, "visible_to_client": true}
 ]'::jsonb)
ON CONFLICT DO NOTHING;

-- ── Vérification ──────────────────────────────────────────────────────────────
SELECT 'case_signatures' AS tbl, EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='case_signatures') AS present
UNION ALL SELECT 'case_templates', EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='case_templates')
UNION ALL SELECT 'templates seed (3)', (SELECT count(*) >= 3 FROM case_templates);
