-- NUMAFRIQ / bureau cabinet (Afrilex) — passe le compte de démo de « dinar » à « sagnon »
-- À exécuter sur MySQL uniquement si vous aviez déjà importé setup.sql avec « dinar ».
-- Sinon : nouvel import de setup.sql inclut déjà « sagnon ».

UPDATE `users`
SET
  `username`  = 'sagnon',
  `password`  = '$2b$12$fUcTgRI7dYuKENwO6Q4wueW4nLJOrMYI5WstZFJknkfpynZZTR0Wu',
  `full_name` = 'Administrateur Afrilex',
  `email`     = 'cabinet@afrilexconseil.com',
  `role`      = 'super_admin'
WHERE `username` = 'dinar'
LIMIT 1;

-- Si aucune ligne « dinar » mais besoin de forcer le mot de passe de « sagnon » :
-- UPDATE users SET password = '$2b$12$fUcTgRI7dYuKENwO6Q4wueW4nLJOrMYI5WstZFJknkfpynZZTR0Wu' WHERE username = 'sagnon' LIMIT 1;
