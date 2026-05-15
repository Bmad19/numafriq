-- ═══════════════════════════════════════════════════════════════════════════
-- Afrilex Conseil — Mise à jour bureau : leads (domaines, assignment, workflow)
-- Exécuter sur la base déjà créée après setup.sql
-- ═══════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;

-- Anciens statuts → nouveaux
UPDATE leads SET status = 'en_cours' WHERE status IN ('vu');
UPDATE leads SET status = 'converti' WHERE status IN ('traite');

-- Adapter la colonne status
ALTER TABLE leads
  MODIFY COLUMN status ENUM(
    'nouveau','en_cours','converti','perdu','archive'
  ) NOT NULL DEFAULT 'nouveau';

-- Nouvelles colonnes (ignorer erreur si déjà appliqué une fois — import manuel)
ALTER TABLE leads
  ADD COLUMN domain ENUM(
    'juridique','fiscal','comptabilite','structuration','investissement','autre','non_classe'
  ) NOT NULL DEFAULT 'non_classe' AFTER service;

ALTER TABLE leads
  ADD COLUMN source VARCHAR(64) NOT NULL DEFAULT 'contact_web' AFTER timeline;

ALTER TABLE leads
  ADD COLUMN assigned_to INT NULL AFTER status;

ALTER TABLE leads
  ADD COLUMN notes TEXT NULL AFTER message;

ALTER TABLE leads
  ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE leads
  ADD CONSTRAINT fk_leads_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- Compte administrateur demandé pour l’accès bureau (mot de passe : sagnon — à changer après 1ère connexion)
INSERT IGNORE INTO `users` (`username`, `password`, `full_name`, `email`, `role`, `first_login`)
VALUES (
  'sagnon',
  '$2b$12$5HhxQfDJ4DDhn2.FZXYEpuX85qeQoYqf9741FZOQHqxKVpuYmx2pC',
  'Administrateur Afrilex',
  'cabinet@afrilexconseil.com',
  'super_admin',
  0
);
