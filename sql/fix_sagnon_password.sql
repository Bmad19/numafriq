-- Corrige le hash du compte bureau « sagnon » (mot de passe en clair : sagnon — à changer en production).
-- À exécuter dans l’éditeur SQL Supabase si la connexion locale / bureau échoue avec des identifiants pourtant corrects.

UPDATE users
SET password = '$2b$12$u1yQGuA2VXCQqUZF45QeC.VahY.e6znjjaFea0toj64wy5mKgrb6.'
WHERE username = 'sagnon';
