# ══════════════════════════════════════════════════════════════════════════════
# NUMAFRIQ — Guide de déploiement LWS
# ══════════════════════════════════════════════════════════════════════════════

## ÉTAPE 1 — Préparer la base de données MySQL (cPanel LWS)

1. Connectez-vous à votre cPanel LWS
2. Allez dans **MySQL Databases** (ou Bases de données MySQL)
3. Créez une base de données : `numafriq_bureau`
4. Créez un utilisateur MySQL avec un mot de passe fort
5. Accordez **tous les privilèges** à cet utilisateur sur `numafriq_bureau`

6. Allez dans **phpMyAdmin**
7. Sélectionnez la base `numafriq_bureau`
8. Cliquez sur **Importer** → importez le fichier `sql/setup.sql`
   ✅ Toutes les tables sont créées + super admin `dinar`

## ÉTAPE 2 — Configurer api/config.php

Ouvrez `api/config.php` et remplissez :
```php
define('DB_HOST',  'localhost');              // Toujours localhost sur LWS
define('DB_NAME',  'votreid_numafriq_bureau');// Préfixé par votre ID LWS
define('DB_USER',  'votreid_mysql_user');     // Idem
define('DB_PASS',  'VotreMotDePasseMySQL');
```

Le nom exact est visible dans cPanel → MySQL Databases.

## ÉTAPE 3 — Builder le site React

```bash
npm run build
```
→ Génère le dossier `dist/`

## ÉTAPE 4 — Uploader sur LWS (FTP ou Gestionnaire de fichiers)

Arborescence cible sur le serveur LWS :
```
public_html/           ← Contenu du dossier dist/
public_html/api/       ← Dossier api/ complet (PHP)
public_html/sql/       ← Dossier sql/ (pour référence)
```

**Fichiers à uploader :**
```
dist/*              → public_html/
api/                → public_html/api/
sql/                → public_html/sql/
```

> ⚠️ Le fichier `public/.htaccess` est inclus dans `dist/` automatiquement.
> Si ce n'est pas le cas, uploadez `public/.htaccess` → `public_html/.htaccess`

## ÉTAPE 5 — Vérifier les permissions

Dans le gestionnaire de fichiers cPanel :
- `api/` → chmod 755
- `api/*.php` → chmod 644
- `api/bureau/*.php` → chmod 644
- `api/client/*.php` → chmod 644

## ÉTAPE 6 — Configurer WhatsApp (optionnel)

Dans `api/whatsapp.php` :
```php
define('META_ACCESS_TOKEN', 'votre_token');    // depuis developers.facebook.com
define('META_PHONE_NUMBER_ID', 'votre_id');
```

## ÉTAPE 7 — Tester

1. Allez sur `https://votredomaine.com`
   → Le site s'affiche ✅

2. Testez le chat IA : `https://votredomaine.com` → bouton chat
   → L'IA NUMA répond ✅

3. Espace agents : `https://votredomaine.com/bureau`
   → Login : `dinar` / `dinar` → changement de mot de passe ✅

4. Espace client : `https://votredomaine.com/espace-client`
   → Inscription → tableau de bord ✅

## DÉPANNAGE FRÉQUENT

### "Erreur de connexion à la base de données"
→ Vérifiez les valeurs dans `api/config.php` (préfixes LWS)

### "L'IA ne répond pas"
→ Vérifiez que `cURL` est activé dans phpinfo()
→ Vérifiez la clé Groq dans `api/chat.php`

### "Les routes React donnent 404"
→ Vérifiez que le `.htaccess` est bien à la racine de `public_html/`

### "L'espace bureau n'est pas accessible"
→ Vérifiez que `api/bureau/auth.php` est accessible via `https://votredomaine.com/api/bureau/auth.php`

## STRUCTURE FINALE public_html/

```
public_html/
├── index.html              ← React SPA
├── assets/                 ← JS/CSS bundlés
├── numafriq-logo-adapted.png
├── .htaccess               ← Réécriture SPA + CORS
└── api/
    ├── config.php          ← 🔑 Configuration MySQL
    ├── chat.php            ← IA NUMA (Groq)
    ├── contact.php         ← Formulaire de contact
    ├── whatsapp.php        ← Notifications WhatsApp
    ├── bureau/
    │   ├── auth.php
    │   ├── users.php
    │   ├── projects.php
    │   ├── missions.php
    │   ├── hr.php
    │   ├── accounting.php
    │   ├── messages.php
    │   └── feedback.php
    └── client/
        ├── auth.php
        └── messages.php
```
