-- ════════════════════════════════════════════════════════════════════════════
-- Supabase / Postgres — Mise à jour « leads » (domaine, archive, source)
-- À exécuter une fois sur une base où la table existe déjà.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE leads ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'non_classe';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'contact_web';

UPDATE leads SET source = COALESCE(NULLIF(trim(source), ''), 'contact_web');
UPDATE leads SET domain = COALESCE(NULLIF(trim(domain), ''), 'non_classe');

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('nouveau','en_cours','converti','perdu','archive'));
