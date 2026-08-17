# Checklist de mise en production — NEXORA ECONOMAT

Ce document liste ce qui a été corrigé dans le code et ce qu'il **reste à faire manuellement** (serveur, secrets) avant la bascule en production.

## 1. Corrigé dans le code (déjà fait)

- **Anti-force brute** : les routes `/login`, `/lookup`, `/login/verify-otp` sont désormais limitées à 10 tentatives/minute (`throttle:10,1`). Protège les mots de passe et le code OTP à 6 chiffres.
- **Trésorerie** : les écritures (création/modif/suppression de comptes de caisse, mouvements, transferts) sont passées de `treasury.view` (lecture) à une nouvelle permission `treasury.manage`. Un rôle en lecture seule ne peut plus déplacer d'argent. La permission est accordée à Directeur, Comptable et Économe.
- **Isolation par établissement** : les modèles `Student` (T_ETUDIANT) et `Versement` (T_VERSEMENT) filtrent maintenant aussi par établissement (colonnes `Site` / `CODEETABLISSEMENT`), de façon tolérante (les lignes héritées non rattachées restent visibles). Voir §4 pour l'isolation stricte.
- **CORS** : `config/cors.php` est piloté par `FRONTEND_URL` (+ `CORS_EXTRA_ORIGINS`). Les origines `localhost` ne sont ajoutées qu'en dehors de la production. `supports_credentials` passé à `false` (auth par jeton Bearer, sans cookie).
- **Secret retiré du dépôt** : le fichier `backend/.env.backup_econ` (qui contenait un mot de passe SQL et l'APP_KEY) a été supprimé et retiré du suivi git. Le `.gitignore` couvre désormais tous les `.env.*` sauf les modèles `.env.example`.
- **Modèles de configuration prod** ajoutés : `backend/.env.production.example` et `frontend/.env.production.example`.
- **Erreurs SQL** : un gestionnaire global renvoie un message propre en JSON au lieu d'exposer les traces SQL (déjà en place).

## 2. À FAIRE sur le serveur avant production (obligatoire)

1. **Faire tourner l'APP_KEY et le mot de passe SQL** (ils ont été exposés dans un fichier suivi par git) :
   - `php artisan key:generate --force`
   - Changer le mot de passe du compte SQL Server.
2. **Créer un compte SQL à privilèges limités** (ne pas utiliser `sa`) ayant accès uniquement à la base `dbmasterbacou`, et le mettre dans `DB_USERNAME` / `DB_PASSWORD`.
3. **Configurer le `.env` de production** (à partir de `.env.production.example`) :
   - `APP_ENV=production`, `APP_DEBUG=false`, `LOG_LEVEL=error`
   - `FRONTEND_URL=https://<domaine-du-front>`
   - `APP_URL=https://<domaine-de-l-api>`
4. **Build front** : définir `frontend/.env.production` avec `VITE_API_URL=https://<domaine-de-l-api>` puis `npm run build`. Sans ça, le front pointe vers `http://localhost:8000`.
5. **HTTPS/TLS obligatoire** sur l'API et le front (jetons Bearer transmis en clair sinon).
6. **Optimisations Laravel** : `php artisan config:cache route:cache view:cache` (et `optimize`).
7. **Purger l'historique git** du secret si le dépôt est partagé (le retrait du fichier n'efface pas l'historique) : réécriture d'historique (`git filter-repo`) ou rotation des secrets (déjà en §2.1).

## 3. Recommandé (bonnes pratiques)

- **Stockage du jeton** : le front conserve le jeton dans `localStorage`. Les en-têtes de contexte (`X-Role`, `X-Etablissement`, `X-Societe`) sont **revalidés côté serveur** contre les droits réels de l'utilisateur (anti-usurpation en place). Pour durcir davantage, envisager un cookie httpOnly.
- **Réinitialisation de mot de passe** : les endpoints admin renvoient le nouveau mot de passe en clair (affichage unique). À n'utiliser que sur HTTPS ; idéalement basculer vers un lien de réinitialisation.
- **Modèles `$guarded = []`** (`Application`, `FeeType`, `Societe`, `Prerequis`) : non exploitables aujourd'hui (les contrôleurs passent des données validées). Ne jamais introduire de `create($request->all())` sur ces modèles.
- **Endpoint `/up`** (health check) : le restreindre au monitoring si l'hôte est public.
- **Rôle caissier** : vérifier que les caissiers ont accès aux listes nécessaires (caisses) pour l'ouverture de caisse ; sinon ajuster les permissions.

## 4. Isolation stricte multi-établissements (si plusieurs établissements par société)

Le filtrage par établissement laisse passer les lignes dont la colonne établissement est vide (pour ne pas masquer les données héritées). Pour une séparation stricte :

1. Renseigner la colonne `Site` (élèves) et `CODEETABLISSEMENT` (versements) sur **toutes** les lignes existantes.
2. Retirer le `orWhereNull(...)` dans `scopeForTenant` de `Student` et `Versement`.

## 5. Liaisons front ↔ back

Audit réalisé : **aucun lien cassé**. Tous les appels API du front correspondent à une route back définie. Quelques routes back ne sont pas encore appelées par le front (non bloquant).
