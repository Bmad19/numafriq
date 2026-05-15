# Guide pas à pas — Supabase puis Render (Afrilex)

Tout se fait dans l’ordre : **d’abord Supabase** (la base), **ensuite Render** (l’API Node). Gardez ce document ouvert à côté du navigateur.

**Prérequis :** projet sur votre PC dans `C:\Users\HP\Desktop\afrilex` avec le fichier `sql/supabase-setup.sql`.

---

## Partie 1 — Supabase (base de données PostgreSQL)

### Étape S1 — Créer un compte et un projet

1. Allez sur **https://supabase.com**
2. Cliquez sur **Start your project** ou **Sign in** (GitHub / Google / email).
3. Une fois connecté, cliquez sur **New project** (bouton vert ou **+**).
4. Renseignez :
   - **Name** : par ex. `afrilex-prod`
   - **Database password** : choisissez un **mot de passe fort** et **notez-le** (récupération possible via reset Supabase mais plus simple de le garder).
   - **Region** : choisissez une région proche des utilisateurs (ex. **Frankfurt** pour l’Europe).
5. Cliquez sur **Create new project**.
6. Attendez **1 à 3 minutes** jusqu’à ce que le tableau de bord affiche le projet comme prêt (plus d’animation « Setting up »).

---

### Étape S2 — Récupérer l’URL et la clé secrète (pour Render)

1. Dans le menu de gauche, cliquez sur **Project Settings** (icône engrenage en bas du menu).
2. Allez dans **Data API** ou **API** (selon la version de l’interface : section **Project API keys**).
3. Notez dans un fichier texte **local** (pas sur le web) :
   - **Project URL** — ressemble à `https://xxxxxxxx.supabase.co`  
     → ce sera **`SUPABASE_URL`** sur Render.
   - **service_role** — clé **très longue** (secret). Cliquez **Reveal** si besoin.  
     → ce sera **`SUPABASE_SERVICE_ROLE_KEY`** sur Render.

⚠️ **Ne commitez jamais** la clé `service_role` sur GitHub. Ne la mettez **pas** dans `.env.production` du site React (seulement sur Render).

---

### Étape S3 — Créer les tables (script SQL)

1. Dans le menu de gauche du projet Supabase, cliquez sur **SQL Editor**.
2. Cliquez sur **New query**.
3. Sur votre PC, ouvrez le fichier :  
   `C:\Users\HP\Desktop\afrilex\sql\supabase-setup.sql`
4. Sélectionnez **tout** le contenu (Ctrl+A), copiez (Ctrl+C).
5. Collez dans l’éditeur SQL Supabase.
6. Cliquez sur **Run** (ou raccourci indiqué en bas).
7. Vérifiez que le résultat est **sans message d’erreur rouge**. Un tableau de liste de tables en fin de script est normal.

**Optionnel — commentaires blog :** nouvelle requête → coller le contenu de  
`C:\Users\HP\Desktop\afrilex\scripts\sql\afrilex_blog_comments.sql` → **Run**.

À ce stade, Supabase est prêt côté schéma. Le compte bureau **`sagnon`** sera créé au **premier démarrage réussi** de l’API sur Render (étape R7–R8).

---

## Partie 2 — Render (héberger l’API Node)

### Étape R1 — Mettre le code sur GitHub (ou GitLab)

Render déploie depuis un **dépôt Git**, pas depuis un dossier local seul.

1. Créez un **nouveau dépôt** vide sur **https://github.com** (sans README si vous initialisez depuis le PC).
2. Sur votre PC, dans PowerShell :

```powershell
cd C:\Users\HP\Desktop\afrilex
git init
git add .
git commit -m "Afrilex — déploiement"
git branch -M main
git remote add origin https://github.com/VOTRE-UTILISATEUR/VOTRE-REPO.git
git push -u origin main
```

(Remplacez l’URL par celle de **votre** dépôt.)

Si le dépôt existe déjà, un simple `git push` suffit après commit.

---

### Étape R2 — Créer un compte Render et lier GitHub

1. Allez sur **https://render.com** et créez un compte.
2. Lorsqu’on vous le propose, **connectez votre compte GitHub** et **autorisez** Render à voir vos dépôts (au moins le dépôt **afrilex**).

---

### Étape R3 — Créer le service Web (méthode simple : Web Service)

1. Dans le tableau de bord Render, cliquez **New +** puis **Web Service**.
2. **Connect** le dépôt qui contient le dossier **afrilex** (même racine que `package.json` et `render.yaml`).
3. Remplissez :
   - **Name** : par ex. `afrilex-api`
   - **Region** : proche de vous (ex. **Frankfurt**)
   - **Branch** : `main` (ou votre branche)
   - **Root Directory** : laissez **vide** si `package.json` est à la racine du repo.
   - **Runtime** : **Node**
   - **Build Command** : `npm ci`
   - **Start Command** : `npm start`
4. Choisissez le plan (**Free** possible ; le service peut « s’endormir » après inactivité).

---

### Étape R4 — Variables d’environnement (obligatoire)

Toujours **avant** le premier déploiement ou dans l’onglet **Environment** du service :

Cliquez **Add Environment Variable** et ajoutez :

| Clé | Valeur |
|-----|--------|
| `SUPABASE_URL` | L’URL copiée à l’étape **S2** (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | La clé **service_role** copiée à l’étape **S2** |
| `GROQ_API_KEY` | Votre clé Groq ([console.groq.com](https://console.groq.com)) — nécessaire pour le **chat** et l’**assistant** |

Optionnel :

| Clé | Valeur |
|-----|--------|
| `CORS_ORIGINS` | Si le site est sur un domaine précis : `https://www.afrilexconseil.com,https://afrilexconseil.com` (adaptez, sans espaces après les virgules). |

---

### Étape R5 — Health check (recommandé)

Dans les **Advanced** du service (ou après création, dans **Settings**), si le champ existe :

- **Health Check Path** : `/api/bureau/health`

(Si vous avez utilisé un **Blueprint** avec le fichier `render.yaml`, ce chemin peut déjà être défini.)

---

### Étape R6 — Déployer

1. Cliquez sur **Create Web Service** (ou **Save Changes** puis déclenchez un deploy).
2. Attendez la fin des logs : statut **Live** en vert.

---

### Étape R7 — Tester l’API

1. En haut de la page du service, copiez l’URL publique :  
   `https://afrilex-api-xxxx.onrender.com` (exemple — le vôtre sera affiché par Render).
2. Ouvrez dans le navigateur :  
   **`https://VOTRE-URL.onrender.com/api/bureau/health`**
3. Vous devez voir un JSON du type : `{"ok":true}`  
   - Si vous voyez `"ok":false` et `"issues"` : vérifiez que l’étape **S3** (script SQL) a bien été exécutée sur **le même** projet Supabase que les variables **R4**.

---

### Étape R8 — Lier le site React (sur votre PC)

1. Dans `C:\Users\HP\Desktop\afrilex`, copiez **`.env.production.example`** vers **`.env.production`**.
2. Remplacez **`VOTRE-API.example.com`** par **le domaine Render sans slash final**, sur **les 4 lignes** `VITE_BUREAU_API`, `VITE_CLIENT_API`, `VITE_CHAT_API_URL`, `VITE_API_URL`  
   (ex. `https://afrilex-api-xxxx.onrender.com`).
3. Puis :

```powershell
cd C:\Users\HP\Desktop\afrilex
npm ci
npm run build:prod
```

4. Uploadez le contenu du dossier **`dist/`** sur votre hébergement (LWS, etc.) comme indiqué dans **`DEPLOY.md`**.

---

## Ordre récapitulatif (à ne pas inverser)

1. **Supabase** : projet → copier URL + service_role → SQL Editor → `supabase-setup.sql` → Run  
2. **GitHub** : pousser le dossier **afrilex**  
3. **Render** : Web Service → `npm ci` / `npm start` → variables **SUPABASE_*** + **GROQ_API_KEY** → déployer  
4. Tester **`/api/bureau/health`**  
5. **`.env.production`** avec l’URL Render → **`npm run build:prod`** → upload **`dist/`**

---

## Problèmes fréquents

| Symptôme | Que faire |
|----------|-----------|
| Render : build échoue | Vérifier que la racine du repo contient bien `package.json` ; logs Render ligne par ligne. |
| `/api/bureau/health` → `issues` avec `sessions` | Refaire **S3** sur le bon projet ; ou typo dans **SUPABASE_URL** / clé sur Render. |
| Site affiche erreur CORS | Ajouter **`CORS_ORIGINS`** avec l’URL **exacte** du site (`https://` + domaine, avec ou sans `www` selon ce que vous utilisez). |
| Chat ne répond pas | **`GROQ_API_KEY`** manquante ou invalide sur Render. |

Pour le guide complet (phases A–E + hébergement statique), voir **`DEPLOY.md`** dans le même dossier.
