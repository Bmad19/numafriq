<?php
// ── NUMAFRIQ Bureau — Utilise MySQL via config.php ────────────────────────────
require_once __DIR__ . '/../config.php';

function db_init(): void {
    // Tables créées via sql/setup.sql — voir DEPLOY.md
    static $done = false; if ($done) return; $done = true;
    return;
    $db = get_db();
    $db->exec("
        CREATE TABLE IF NOT EXISTS users (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            username     TEXT UNIQUE NOT NULL,
            password     TEXT NOT NULL,
            full_name    TEXT NOT NULL,
            email        TEXT,
            role         TEXT NOT NULL DEFAULT 'agent',
            avatar       TEXT,
            first_login  INTEGER NOT NULL DEFAULT 1,
            active       INTEGER NOT NULL DEFAULT 1,
            created_at   TEXT DEFAULT (NOW()),
            last_login   TEXT
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            token      TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS projects (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            client      TEXT NOT NULL,
            description TEXT,
            status      TEXT DEFAULT 'en_cours',
            priority    TEXT DEFAULT 'normale',
            budget      REAL DEFAULT 0,
            deadline    TEXT,
            progress    INTEGER DEFAULT 0,
            assigned_to INTEGER,
            created_by  INTEGER,
            created_at  TEXT DEFAULT (NOW()),
            updated_at  TEXT DEFAULT (NOW()),
            FOREIGN KEY(assigned_to) REFERENCES users(id),
            FOREIGN KEY(created_by)  REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS missions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            description TEXT,
            project_id  INTEGER,
            assigned_to INTEGER NOT NULL,
            assigned_by INTEGER NOT NULL,
            status      TEXT DEFAULT 'a_faire',
            due_date    TEXT,
            created_at  TEXT DEFAULT (NOW()),
            FOREIGN KEY(project_id)  REFERENCES projects(id),
            FOREIGN KEY(assigned_to) REFERENCES users(id),
            FOREIGN KEY(assigned_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS hr_records (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            type        TEXT NOT NULL,
            title       TEXT NOT NULL,
            description TEXT,
            date        TEXT NOT NULL,
            amount      REAL,
            status      TEXT DEFAULT 'en_attente',
            created_by  INTEGER,
            created_at  TEXT DEFAULT (NOW()),
            FOREIGN KEY(user_id)    REFERENCES users(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS accounting (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            type        TEXT NOT NULL,
            category    TEXT NOT NULL,
            amount      REAL NOT NULL,
            description TEXT NOT NULL,
            project_id  INTEGER,
            date        TEXT NOT NULL,
            created_by  INTEGER,
            created_at  TEXT DEFAULT (NOW()),
            FOREIGN KEY(project_id) REFERENCES projects(id),
            FOREIGN KEY(created_by) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id   INTEGER NOT NULL,
            channel     TEXT DEFAULT 'general',
            content     TEXT NOT NULL,
            created_at  TEXT DEFAULT (NOW()),
            FOREIGN KEY(sender_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS feedback (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            project_id  INTEGER,
            rating      INTEGER,
            comment     TEXT,
            category    TEXT DEFAULT 'satisfaction',
            status      TEXT DEFAULT 'nouveau',
            created_at  TEXT DEFAULT (NOW()),
            FOREIGN KEY(project_id) REFERENCES projects(id)
        );
    ");

    // Seed: super admin dinar (must change password on first login)
    $exists = $db->query("SELECT COUNT(*) FROM users WHERE username='dinar'")->fetchColumn();
    if (!$exists) {
        $hash = password_hash('dinar', PASSWORD_BCRYPT, ['cost' => 12]);
        $db->prepare("
            INSERT INTO users (username, password, full_name, email, role, first_login)
            VALUES ('dinar', ?, 'Super Administrateur', 'admin@numafriq.com', 'super_admin', 1)
        ")->execute([$hash]);

        // Demo data
        $db->exec("
            INSERT INTO projects (name,client,description,status,priority,budget,progress,created_by)
            VALUES
                ('Site vitrine Telecel','Telecel Faso','Refonte complète du site corporate','en_cours','haute',850000,65,1),
                ('E-commerce BarkaPro','BarkaPro','Boutique en ligne avec paiement mobile','en_cours','normale',1200000,40,1),
                ('Application RH StartupX','StartupX','Dashboard RH sur-mesure','termine','normale',900000,100,1);
            INSERT INTO accounting (type,category,amount,description,date,created_by)
            VALUES
                ('recette','Projet','850000','Acompte Telecel Faso','2026-04-01',1),
                ('recette','Projet','480000','Acompte BarkaPro','2026-04-05',1),
                ('depense','Logiciels','45000','Abonnement Adobe CC','2026-04-01',1),
                ('depense','Hebergement','25000','Serveur VPS mensuel','2026-04-01',1);
            INSERT INTO feedback (client_name,rating,comment,category,status)
            VALUES
                ('Telecel Faso',5,'Équipe très professionnelle, délais respectés.','satisfaction','traite'),
                ('BarkaPro',4,'Bon travail, quelques ajustements nécessaires.','qualite','nouveau');
        ");
    }
}
