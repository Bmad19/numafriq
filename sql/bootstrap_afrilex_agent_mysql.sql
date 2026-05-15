-- Compte bureau secours Afrilex (MySQL / hébergement PHP — api/bureau/auth.php).
-- Identifiant : afrilex_agent  |  Mot de passe : AfrilexBureau2026!
-- À exécuter dans phpMyAdmin si vous n'utilisez pas l'API Node (Supabase).
-- CHANGEZ CE MOT DE PASSE EN PRODUCTION.

INSERT IGNORE INTO `users` (`username`, `password`, `full_name`, `email`, `role`, `first_login`, `active`)
VALUES (
  'afrilex_agent',
  '$2b$12$10Pkk3gCJOHWmt8mKnJjuuuCEOvSEJL7J/pwGKNCtMndn5X68NRMG',
  'Agent bureau Afrilex',
  'agent@afrilexconseil.com',
  'super_admin',
  0,
  1
);
