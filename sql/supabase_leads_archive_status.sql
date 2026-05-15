-- Étendre le statut archive sur une table leads existante (Supabase / Postgres).
-- Si DROP CONSTRAINT échoue (nom différent sur votre DB), lister les contraintes :
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'public.leads'::regclass AND contype = 'c';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('nouveau','en_cours','converti','perdu','archive'));
