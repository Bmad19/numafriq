-- À exécuter une fois si la table `job_applications` existe déjà sans ces colonnes (Afrilex).
ALTER TABLE `job_applications`
  ADD COLUMN `reference_offer`   VARCHAR(64)  DEFAULT NULL AFTER `languages`,
  ADD COLUMN `sought_role_title` VARCHAR(255) DEFAULT NULL AFTER `reference_offer`,
  ADD COLUMN `application_mode`  VARCHAR(24) DEFAULT NULL AFTER `sought_role_title`;
