# ──────────────────────────────────────────────────────
# DÉPLOIEMENT — Formulaire de contact NUMAFRIQ
# Mail de réception : baguianmahamadi@gmail.com
# ──────────────────────────────────────────────────────
# Aucun service externe requis. Fonctionne avec la
# fonction mail() native de PHP sur votre hébergeur cPanel.
# ──────────────────────────────────────────────────────

## ÉTAPE 1 — Builder le site
npm run build

## ÉTAPE 2 — Uploader sur cPanel
Uploadez le contenu du dossier dist/ + le dossier api/ :

  dist/           → public_html/ (ou le dossier de votre domaine)
  api/contact.php → public_html/api/contact.php

## ÉTAPE 3 — Vérifier les permissions
chmod 644 public_html/api/contact.php

## ✅ C'est tout !
Soumettez le formulaire sur votre site.
Vous recevrez :
  1. Un email de notification sur baguianmahamadi@gmail.com
     avec toutes les infos du projet (nom, email, service, budget, message)
  2. Le visiteur reçoit automatiquement un email de confirmation

## ℹ️ Note sur PHP mail()
La fonction mail() est activée par défaut sur la majorité des hébergeurs cPanel.
Si les emails ne sont pas reçus, vérifiez :
  - Le dossier spam / courrier indésirable
  - Que votre hébergeur n'a pas désactivé mail() (rare)
  - Configurez SPF/DKIM dans cPanel pour une meilleure délivrabilité
