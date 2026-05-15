-- ══════════════════════════════════════════════════════════════════════════════
-- Afrilex Conseil — Ajout : permissions granulaires par agent + comptes mail LWS
--
-- À EXÉCUTER UNE FOIS dans Supabase Dashboard → SQL Editor → Run
-- (idempotent, peut être ré-exécuté sans risque)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Permissions granulaires sur users ─────────────────────────────────────────
-- CSV des modules autorisés (ex: "leads,projects,assistant").
--   • Vide / NULL / "*" → aucune restriction (l'agent voit tout ce que son rôle permet).
--   • super_admin a TOUJOURS tout, peu importe le contenu de cette colonne.
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT;

COMMENT ON COLUMN users.permissions IS
  'CSV des modules autorisés. Vide/null/*=accès complet selon le rôle. Super_admin ignore cette colonne.';

-- ── Comptes mail LWS (consultés depuis le bureau, super_admin uniquement) ─────
CREATE TABLE IF NOT EXISTS mailbox_accounts (
  id              BIGSERIAL PRIMARY KEY,
  label           TEXT NOT NULL,                   -- ex : "Contact général"
  email           TEXT NOT NULL,                   -- ex : info@afrilexconseil.com (sert d'username IMAP/SMTP)
  imap_host       TEXT NOT NULL DEFAULT 'mail.lws-hosting.com',
  imap_port       INTEGER NOT NULL DEFAULT 993,
  imap_secure     BOOLEAN NOT NULL DEFAULT TRUE,
  smtp_host       TEXT,
  smtp_port       INTEGER,
  smtp_secure     BOOLEAN DEFAULT TRUE,
  password_enc    TEXT NOT NULL,                   -- AES-256-GCM : "iv_b64:tag_b64:cipher_b64"
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mailbox_accounts_email_idx ON mailbox_accounts(email);

DROP TRIGGER IF EXISTS trg_mailbox_accounts_updated_at ON mailbox_accounts;
CREATE TRIGGER trg_mailbox_accounts_updated_at
  BEFORE UPDATE ON mailbox_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE mailbox_accounts DISABLE ROW LEVEL SECURITY;

-- ── Vérification ──────────────────────────────────────────────────────────────
SELECT 'users.permissions' AS check_name, EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'permissions'
) AS present
UNION ALL
SELECT 'mailbox_accounts table', EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'mailbox_accounts'
);
