-- Migration MySQL NUMAFRIQ — alignement leads (statuts bureau + assignment)
-- Exécuter une fois si la base a été créée avec l’ancien schéma (vu/traite, sans colonnes métier).

SET NAMES utf8mb4;

UPDATE `leads` SET `status` = 'en_cours' WHERE `status` IN ('vu', 'traite');

ALTER TABLE `leads`
  MODIFY `status` ENUM('nouveau','en_cours','converti','perdu','archive') NOT NULL DEFAULT 'nouveau';

ALTER TABLE `leads`
  ADD COLUMN `assigned_to` INT DEFAULT NULL AFTER `status`;
ALTER TABLE `leads`
  ADD CONSTRAINT `fk_leads_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL;

ALTER TABLE `leads`
  ADD COLUMN `notes` TEXT DEFAULT NULL AFTER `assigned_to`;

ALTER TABLE `leads`
  ADD COLUMN `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;
