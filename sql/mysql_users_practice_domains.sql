-- À exécuter une fois sur une base sans la colonne (anciennes installations Afrilex)
ALTER TABLE `users`
  ADD COLUMN `practice_domains` VARCHAR(512) DEFAULT NULL
  COMMENT 'Domaines rattachement, ex.: juridique,fiscal (* = tous)' AFTER `email`;
