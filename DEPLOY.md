# NUMAFRIQ / Afrilex Conseil — Déploiement en ligne

Ce site est une **SPA React**. Les données bureau / clients / leads passent par une **API Node** (`npm start`) reliée à **Supabase**. Suivez les étapes **dans l’ordre** ci‑dessous.

> **Copie sur votre bureau :** si vous travaillez depuis **`C:\Users\HP\Desktop\afrilex`**, utilisez le fichier **`DEPLOY.md`** dans ce dossier **afrilex** : il est rédigé pour ce chemin et le dépôt **Afrilex Conseil**.

---

## Guide pas à pas (à suivre dans l’ordre)

Cochez mentalement chaque point avant de passer au suivant.

### Phase A — Supabase (base de données)

| # | Action | Détail |
|---|--------|--------|
| **A1** | Créer un compte et un projet | [supabase.com](https://supabase.com) → **New project** → choisissez région + mot de passe DB (notez‑le au besoin). |
| **A2** | Noter l’URL et la clé serveur | **Project Settings → API** : copiez **`Project URL`** et la clé **`service_role`** (section *Project API keys* — **secret**, à ne jamais mettre dans le site React ni sur GitHub public). |
| **A3** | Créer les tables | **SQL Editor → New query** → ouvrez le fichier **`sql/supabase-setup.sql`** dans votre projet → collez tout le contenu → **Run**. Attendez « Success » sans erreur rouge. |
| **A3b** | Table candidatures *(bases déjà créées)* | Si le projet Supabase existait **avant** l’ajout de **`job_applications`**, exécutez **`sql/supabase_job_applications.sql`**. Sinon **A3** suffit. |
| **A4** *(optionnel)* | Commentaires blog Afrilex | Si vous utilisez les commentaires SPA sur les articles WordPress : exécutez aussi **`scripts/sql/afrilex_blog_comments.sql`** dans SQL Editor. |

À ce stade la base est prête ; il n’y a pas encore d’utilisateur : le compte bureau **`sagnon`** / **`sagnon`** (ou **`SAGNON`** / **`SAGNON`** — la casse de l’identifiant est ignorée) sera créé ou migré au **premier démarrage réussi** de l’API (étape B).

---

### Phase B — API Node sur Internet (ex. Render)

| # | Action | Détail |
|---|--------|--------|
| **B1** | Pousser le code sur Git | GitHub / GitLab / Bitbucket — Render (ou Railway) doit pouvoir cloner le dépôt **NUMAFRIQ**. |
| **B2** | Créer le service web | **Render** : [dashboard.render.com](https://dashboard.render.com) → **New +** → **Blueprint** → connectez le dépôt → Render détecte **`render.yaml`** **ou** **New → Web Service** (Node) avec *Root Directory* = racine du repo. |
| **B3** | Build / Start | **Build command** : `npm ci` — **Start command** : `npm start`. Runtime **Node 20** (déjà indiqué dans `package.json` et `render.yaml`). |
| **B4** | Variables d’environnement | Dans **Environment** du service, ajoutez au minimum : **`SUPABASE_URL`** (URL du projet), **`SUPABASE_SERVICE_ROLE_KEY`** (clé service_role). Ajoutez **`GROQ_API_KEY`** pour le chat et l’assistant (sinon le chat renverra une erreur). |
| **B5** | Déployer et copier l’URL | Lancez le déploiement. Une fois « Live », copiez l’URL publique du service, par ex. `https://numafriq-api-xxxx.onrender.com` (**sans** slash à la fin). |
| **B6** | Test santé | Dans le navigateur ouvrez : **`https://VOTRE-URL/api/bureau/health`**. Vous devez voir du JSON du type **`{"ok":true}`**. Si **`issues`** avec `sessions` ou `users`, refaites **A3** correctement. |

**Optionnel Render — fichier déjà dans le repo :** `render.yaml` décrit un service Web Node avec healthcheck sur `/api/bureau/health`. Les secrets (`SUPABASE_*`, `GROQ_API_KEY`) sont à renseigner à la main dans le tableau Environment après création du Blueprint.

---

### Phase C — Site statique (build sur votre PC)

| # | Action | Détail |
|---|--------|--------|
| **C1** | Node.js | Installez **Node 20+** ([nodejs.org](https://nodejs.org)). |
| **C2** | Fichier `.env.production` | À la racine du projet : copiez **`.env.production.example`** vers **`.env.production`** (vous pouvez faire « Copier coller » du fichier sous ce nom). |
| **C3** | Remplacer l’URL API | Dans **`.env.production`**, remplacez **`https://VOTRE-API.example.com`** par **exactement** l’URL du **B5** (les **quatre** lignes `VITE_*` doivent pointer vers cette même base). Pas de slash final. |
| **C4** | Blog WordPress *(optionnel)* | Décommentez **`VITE_WP_REST_BASE`** avec la **racine** REST : `https://…/wp-json` (**sans** `/wp/v2` à la fin — le code l’ajoute). Si `/wp-json` est réécrit vers la SPA (`index.html`), les articles échouent : WordPress doit répondre en JSON sur ce préfixe (exception serveur ou URL WordPress réelle). |
| **C5** | Installer et builder | Dans un terminal à la racine du projet : |

```bash
npm ci
npm run build
```

**`npm run build`** vérifie d’abord que **`.env.production`** ne contient plus le placeholder, puis lance **`vite build`** (`build:prod` est un alias identique).

| **C6** | Résultat | Le dossier **`dist/`** contient tout le site à mettre en ligne. |

---

### Phase D — Hébergement du site (LWS, o2switch, etc.)

| # | Action | Détail |
|---|--------|--------|
| **D1** | Connexion FTP ou gestionnaire de fichiers | Ouvrez **`public_html`** (ou le dossier du domaine **afrilexconseil.com** / **numafriq.com**). |
| **D2** | Upload | **Videz** l’ancien contenu du site si c’est une refonte, puis **uploadez tout le contenu** de **`dist/`** (fichiers et dossiers, y compris **`assets/`** et **`.htaccess`**). |
| **D3** | Vérifier `.htaccess` | Il doit être **à la racine** du site (même niveau que `index.html`). Il vient du build depuis `public/.htaccess` (routes React). |
| **D4** | Pas besoin de `api/` PHP | Avec Supabase + API Node, vous **n’êtes pas obligé** d’uploader le dossier **`api/`** pour le bureau ; le front appelle uniquement les URLs **`VITE_*`**. |

---

### Phase E — Vérifications finales

| # | Test | Résultat attendu |
|---|------|------------------|
| **E1** | Ouvrir votre domaine | La page d’accueil s’affiche. |
| **E2** | Onglet **Réseau** (F12) sur Contact / Chat | Pas d’erreur **CORS** vers l’URL Render ; réponses **200** ou **401** contrôlées, pas **blocked**. |
| **E3** | **/bureau** | Connexion **`SAGNON`** / **`SAGNON`** ou **`sagnon`** / **`sagnon`** (identifiant sans casse). Publiez des articles (**Blog site**) et des offres (**Offres emploi** → **`/bureau/recrutement`**). Changez le mot de passe en production dès la première connexion. |
| **E4** | Formulaire contact | Lead reçu (et notification WhatsApp si vous avez configuré Meta côté API). |

Si **CORS** bloque : sur Render, ajoutez **`CORS_ORIGINS`** avec l’URL **exacte** du site (`https://www.votredomaine.com` **et** `https://votredomaine.com` si les deux existent).

---

## Rappels importants

- **`SUPABASE_SERVICE_ROLE_KEY`** : uniquement sur le serveur Node (Render), jamais dans le code React ni dans `.env.production`.
- **`sagnon` / `sagnon`** : compte technique initial (**`SAGNON`** accepté en identifiant) ; changez le mot de passe dès que le bureau fonctionne.
- Fichiers utiles dans le repo : **`env.example`** (variables expliquées), **`render.yaml`** (Blueprint Render), **`scripts/verify-production-env.mjs`** (vérif avant build).

---

## Architecture recommandée (Supabase)

```
Navigateur → https://afrilexconseil.com (ou numafriq.com)  →  fichiers statiques (dist/)
                ↓ fetch JSON (VITE_*)
           https://votre-api.onrender.com  →  bureau-api.cjs  →  Supabase (service_role)
```

---

## Référence rapide — Scripts SQL

| Ordre | Fichier | Rôle |
|-------|---------|------|
| 1 | `sql/supabase-setup.sql` | Schéma complet (inclut **`job_applications`** si vous repartez d’une base neuve). |
| 2 | `sql/supabase_job_applications.sql` | **Bases existantes** — ajoute uniquement la table candidatures. |
| 3 | `scripts/sql/afrilex_blog_comments.sql` | **Optionnel** — commentaires blog SPA. |

Si une ancienne base bloque sur le statut `archive` des leads : **`sql/supabase_leads_archive_status.sql`**.

---

## Référence rapide — Variables serveur (API Node)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `SUPABASE_URL` | Oui | URL du projet Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui | Clé **service_role** (backend uniquement). |
| `GROQ_API_KEY` | Fortement conseillé | Chat + assistant IA. |
| `CORS_ORIGINS` | Si besoin | Domaines front supplémentaires, séparés par des virgules. |
| `BLOG_STORE_PATH` | Non | Chemin absolu du JSON articles (défaut : `data/blog-store.json` côté API). |
| `CAREERS_OFFERS_PATH` | Non | Chemin absolu du JSON offres emploi (défaut : `data/careers-offers.json`). |
| `WA_PHONE`, `META_ACCESS_TOKEN`, `META_PHONE_ID` | Optionnel | WhatsApp. |

---

## Dépannage

| Symptôme | Piste |
|----------|--------|
| Erreur CORS dans la console | `CORS_ORIGINS` ; même schéma `https://` ; `www` vs sans `www`. |
| Bureau / login 500 | Logs Render ; **`GET .../api/bureau/health`** ; réexécuter **`sql/supabase-setup.sql`**. |
| Chat ou contact sans réponse | **`GROQ_API_KEY`** définie sur le service Node. |
| Routes React → 404 Apache | **`.htaccess`** à la racine du site ; `mod_rewrite` activé. |
| `npm run build` refuse | `.env.production` manquant ou encore **`VOTRE-API.example.com`**. |
| Candidature (carrières) en erreur 500 | Table **`job_applications`** : exécutez **`sql/supabase_job_applications.sql`** ; le formulaire POST doit cibler **`…/api/careers.php`** sur l’API Node. |

---

## Annexe — Ancienne méthode MySQL + PHP (sans Node)

Si vous hébergez **sans** Node et **avec** PHP + MySQL sur LWS :

1. Créez la base MySQL, importez **`sql/setup.sql`** (pas Supabase).
2. Configurez **`api/config.php`**.
3. Uploadez **`dist/`** + dossier **`api/`** vers `public_html`.

La pile « bureau complet » avec ce dépôt reste **Supabase + API Node** ci‑dessus.
