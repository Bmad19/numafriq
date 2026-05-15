-- ══════════════════════════════════════════════════════════════════════════════
-- NUMAFRIQ — Schéma MySQL complet
-- À importer dans phpMyAdmin (LWS) ou via : mysql -u user -p numafriq_bureau < setup.sql
-- ══════════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- ── Bureau : Utilisateurs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `username`    VARCHAR(100) UNIQUE NOT NULL,
  `password`    VARCHAR(255) NOT NULL,
  `full_name`   VARCHAR(200) NOT NULL,
  `email`       VARCHAR(200),
  `role`        ENUM('agent','admin','super_admin') NOT NULL DEFAULT 'agent',
  `avatar`      VARCHAR(500),
  `first_login` TINYINT(1) NOT NULL DEFAULT 1,
  `active`      TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_login`  DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Bureau : Sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`    INT NOT NULL,
  `token`      VARCHAR(100) UNIQUE NOT NULL,
  `expires_at` DATETIME NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Bureau : Projets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `projects` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(300) NOT NULL,
  `client`      VARCHAR(200) NOT NULL,
  `description` TEXT,
  `status`      ENUM('en_cours','termine','en_pause','annule') DEFAULT 'en_cours',
  `priority`    ENUM('basse','normale','haute','urgente') DEFAULT 'normale',
  `budget`      DECIMAL(15,2) DEFAULT 0,
  `deadline`    DATE,
  `progress`    TINYINT DEFAULT 0,
  `assigned_to` INT,
  `created_by`  INT,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`)  REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Bureau : Missions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `missions` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `title`       VARCHAR(300) NOT NULL,
  `description` TEXT,
  `project_id`  INT,
  `assigned_to` INT NOT NULL,
  `assigned_by` INT NOT NULL,
  `status`      ENUM('a_faire','en_cours','termine') DEFAULT 'a_faire',
  `due_date`    DATE,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`)  REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Bureau : RH ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `hr_records` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`     INT NOT NULL,
  `type`        ENUM('conge','absence','retard','prime','note') NOT NULL,
  `title`       VARCHAR(300) NOT NULL,
  `description` TEXT,
  `date`        DATE NOT NULL,
  `amount`      DECIMAL(15,2),
  `status`      ENUM('en_attente','approuve','refuse') DEFAULT 'en_attente',
  `created_by`  INT,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Bureau : Comptabilité ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `accounting` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `type`        ENUM('recette','depense') NOT NULL,
  `category`    VARCHAR(100) NOT NULL,
  `amount`      DECIMAL(15,2) NOT NULL,
  `description` TEXT NOT NULL,
  `project_id`  INT,
  `date`        DATE NOT NULL,
  `created_by`  INT,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Bureau : Chat interne ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `messages` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `sender_id`  INT NOT NULL,
  `channel`    VARCHAR(100) DEFAULT 'general',
  `content`    TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Bureau : Retours clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `feedback` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `client_name` VARCHAR(200) NOT NULL,
  `project_id`  INT,
  `rating`      TINYINT,
  `comment`     TEXT,
  `category`    VARCHAR(100) DEFAULT 'satisfaction',
  `status`      ENUM('nouveau','traite','archive') DEFAULT 'nouveau',
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Espace Client ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clients` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(200) NOT NULL,
  `email`      VARCHAR(200) UNIQUE NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `company`    VARCHAR(200),
  `phone`      VARCHAR(50),
  `project_id` INT,
  `active`     TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `client_sessions` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `client_id`  INT NOT NULL,
  `token`      VARCHAR(100) UNIQUE NOT NULL,
  `expires_at` DATETIME NOT NULL,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `client_messages` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `client_id`   INT NOT NULL,
  `sender_type` ENUM('client','agent') NOT NULL,
  `sender_id`   INT,
  `content`     TEXT NOT NULL,
  `is_read`     TINYINT(1) DEFAULT 0,
  `created_at`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Demandes projets (formulaire public "Démarrer un projet") ─────────────────
CREATE TABLE IF NOT EXISTS `leads` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `name`         VARCHAR(200)  NOT NULL,
  `email`        VARCHAR(200)  NOT NULL,
  `phone`        VARCHAR(100)  DEFAULT NULL,
  `company`      VARCHAR(200)  DEFAULT NULL,
  `service`      VARCHAR(200)  DEFAULT NULL,
  `budget`       VARCHAR(100)  DEFAULT NULL,
  `timeline`     VARCHAR(100)  DEFAULT NULL,
  `message`      TEXT          NOT NULL,
  `status`       ENUM('nouveau','en_cours','converti','perdu','archive') NOT NULL DEFAULT 'nouveau',
  `assigned_to`  INT DEFAULT NULL,
  `notes`        TEXT DEFAULT NULL,
  `created_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `job_applications` (
  `id`                       INT AUTO_INCREMENT PRIMARY KEY,
  `first_name`               VARCHAR(120)   NOT NULL,
  `last_name`                VARCHAR(120)   NOT NULL,
  `email`                    VARCHAR(200)   NOT NULL,
  `phone`                    VARCHAR(100)   DEFAULT NULL,
  `city_country`             VARCHAR(200)   DEFAULT NULL,
  `linkedin_url`             VARCHAR(500)   DEFAULT NULL,
  `position_applied`         VARCHAR(80)    NOT NULL,
  `contract_type`            VARCHAR(40)    NOT NULL,
  `availability`             VARCHAR(160)   DEFAULT NULL,
  `experience_years`         VARCHAR(24)    DEFAULT NULL,
  `education_level`          VARCHAR(48)    DEFAULT NULL,
  `languages`                VARCHAR(400)   DEFAULT NULL,
  `reference_offer`          VARCHAR(64)    DEFAULT NULL,
  `sought_role_title`        VARCHAR(255)   DEFAULT NULL,
  `application_mode`         VARCHAR(24)    DEFAULT NULL,
  `motivation`               TEXT           NOT NULL,
  `cv_original_name`         VARCHAR(255)   NOT NULL,
  `cv_stored_path`           VARCHAR(500)   NOT NULL,
  `locale`                   VARCHAR(8)     DEFAULT 'fr',
  `consent_data_processing`  TINYINT(1)     NOT NULL DEFAULT 0,
  `status`                   ENUM('nouveau','examine','entretien','refuse','embauche','archive')
                             NOT NULL DEFAULT 'nouveau',
  `created_at`               DATETIME       DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_job_app_email` (`email`),
  INDEX `idx_job_app_status` (`status`),
  INDEX `idx_job_app_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ══════════════════════════════════════════════════════════════════════════════
-- DONNÉES INITIALES
-- ══════════════════════════════════════════════════════════════════════════════

-- Super admin bureau Afrilex (identifiant sagnon / mot de passe sagnon — à changer en production)
INSERT IGNORE INTO `users` (`username`, `password`, `full_name`, `email`, `role`, `first_login`)
VALUES (
  'sagnon',
  '$2b$12$fUcTgRI7dYuKENwO6Q4wueW4nLJOrMYI5WstZFJknkfpynZZTR0Wu',
  'Administrateur Afrilex',
  'cabinet@afrilexconseil.com',
  'super_admin',
  1
);

-- Données de démo (projets, comptabilité, retours)
INSERT IGNORE INTO `projects` (`id`, `name`, `client`, `description`, `status`, `priority`, `budget`, `progress`, `created_by`)
VALUES
  (1, 'Site vitrine Telecel', 'Telecel Faso', 'Refonte complète du site corporate', 'en_cours', 'haute', 850000, 65, 1),
  (2, 'E-commerce BarkaPro', 'BarkaPro', 'Boutique en ligne avec paiement mobile', 'en_cours', 'normale', 1200000, 40, 1),
  (3, 'Application RH StartupX', 'StartupX', 'Dashboard RH sur-mesure', 'termine', 'normale', 900000, 100, 1);

INSERT IGNORE INTO `accounting` (`type`, `category`, `amount`, `description`, `date`, `created_by`)
VALUES
  ('recette', 'Projet', 850000, 'Acompte Telecel Faso', '2026-04-01', 1),
  ('recette', 'Projet', 480000, 'Acompte BarkaPro', '2026-04-05', 1),
  ('depense', 'Logiciels', 45000, 'Abonnement Adobe CC', '2026-04-01', 1),
  ('depense', 'Hebergement', 25000, 'Serveur VPS mensuel', '2026-04-01', 1);

INSERT IGNORE INTO `feedback` (`client_name`, `rating`, `comment`, `category`, `status`)
VALUES
  ('Telecel Faso', 5, 'Équipe très professionnelle, délais respectés.', 'satisfaction', 'traite'),
  ('BarkaPro', 4, 'Bon travail, quelques ajustements nécessaires.', 'qualite', 'nouveau');

SET foreign_key_checks = 1;
