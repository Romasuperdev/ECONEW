# Economat — Plateforme SaaS de Gestion Financière des Établissements Scolaires

Plateforme **SaaS multi-tenant** de gestion financière des écoles : frais de scolarité, paiements, factures, dépenses, trésorerie et tableau de bord décisionnel. Une console **Super Administrateur** pilote l'ensemble des établissements, leurs abonnements et leurs licences ; chaque école ne voit que ses propres données.

- **Backend** : API REST Laravel 11 + Sanctum, base de données **Microsoft SQL Server** (dossier `backend/`)
- **Frontend** : React 18 + Vite + Tailwind CSS + Recharts (dossier `frontend/`)

## Fonctionnalités

- Gestion des élèves, classes et années scolaires
- Types de frais (inscription, scolarité, cantine, transport, uniforme) et grille tarifaire par classe
- Facturation automatique avec numérotation (FACT-AAAA-NNNN) et lignes de frais
- Encaissement des paiements avec reçus (RECU-AAAA-NNNN), modes multiples (espèces, mobile money, virement, chèque, carte)
- Suivi des impayés et soldes par facture (calcul automatique du statut)
- Gestion des dépenses, catégories et fournisseurs
- Tableau de bord : recettes, dépenses, solde, impayés, taux de recouvrement, évolution sur 6 mois, répartition par type de frais
- Authentification par token et rôles (super_admin, admin, directeur, comptable, caissier)

## Architecture SaaS

- **Multi-tenant (base partagée)** : isolation automatique par `school_id` via le trait `BelongsToSchool` (global scope Eloquent). Chaque requête d'un utilisateur d'école est filtrée sur son établissement ; le Super Admin n'est pas filtré.
- **Console Super Administrateur** (`/super`) : gestion des établissements (création avec compte admin + abonnement, activation/suspension/suppression), formules d'abonnement, attribution/renouvellement des licences, tableau de bord global (nb écoles, élèves, revenus, croissance) et journal d'audit.
- **Abonnements & licences** : formules (Gratuit, Standard, Premium, Entreprise) avec quotas (élèves, utilisateurs, stockage) ; blocage automatique de l'accès école si l'abonnement est expiré ou l'établissement suspendu (middleware `active_subscription`).
- **Journal d'audit** : connexions, créations, modifications, suppressions horodatées avec IP.

## Prérequis

- PHP >= 8.2 avec les extensions **`sqlsrv`** et **`pdo_sqlsrv`** activées
- **Microsoft ODBC Driver 17/18 for SQL Server** installé sur la machine
- Composer
- **Microsoft SQL Server** (Express, Developer ou Standard) en cours d'exécution
- Node.js >= 18

> Installation des extensions PHP sous Windows : téléchargez `php_sqlsrv` et `php_pdo_sqlsrv`
> correspondant à votre version de PHP (thread-safe), placez les `.dll` dans `ext/`,
> puis ajoutez `extension=php_sqlsrv` et `extension=php_pdo_sqlsrv` dans `php.ini`.
> Vérifiez avec `php -m | findstr sqlsrv`.

## Démarrage — Backend

```bash
cd backend
composer install
cp .env.example .env          # déjà présent, ajustez la connexion SQL Server
php artisan key:generate
# Créez la base 'econew' dans SQL Server (SSMS ou sqlcmd) :
#   CREATE DATABASE econew;
php artisan migrate --seed
php artisan serve             # http://localhost:8000
```

### Configuration SQL Server (`.env`)

```env
DB_CONNECTION=sqlsrv
DB_HOST=localhost              # ou VOTRE-PC\SQLEXPRESS pour une instance nommée
DB_PORT=1433                   # laisser vide si instance nommée
DB_DATABASE=econew
DB_USERNAME=sa
DB_PASSWORD=VotreMotDePasse
DB_ENCRYPT=yes
DB_TRUST_SERVER_CERTIFICATE=true   # nécessaire en local sans certificat valide
```

> **Instance nommée** (ex. `SQLEXPRESS`) : mettez `DB_HOST=localhost\SQLEXPRESS`,
> laissez `DB_PORT` vide, et assurez-vous que le service **SQL Server Browser** est démarré.
>
> **Compatibilité** : les migrations ont été conçues pour SQL Server, qui interdit les
> chemins de suppression en cascade multiples. Les suppressions en cascade sont limitées
> à la relation facture → (lignes, échéances, paiements) ; les autres clés étrangères
> sont en NO ACTION ou SET NULL. Ne modifiez pas ces règles sans en tenir compte.

## Démarrage — Frontend

```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm run dev                   # http://localhost:5173
```

## Comptes de démonstration (après `--seed`)

| Rôle            | Email                  | Mot de passe |
|-----------------|------------------------|--------------|
| Super Admin     | super@economat.app     | password     |
| Admin école     | admin@econew.ci        | password     |
| Comptable       | comptable@econew.ci    | password     |
| Caissier        | caissier@econew.ci     | password     |

> Le Super Admin est redirigé vers la console plateforme `/super` ; les autres vers l'espace école.

Les données de démo incluent une école, une année scolaire, 6 classes, une grille tarifaire, 40 élèves avec factures/paiements et 20 dépenses.

## Structure de l'API (préfixe `/api`)

| Méthode | Endpoint                | Description                         |
|---------|-------------------------|-------------------------------------|
| POST    | `/login`                | Connexion (retourne un token)       |
| GET     | `/me`                   | Utilisateur courant                 |
| POST    | `/logout`               | Déconnexion                         |
| GET     | `/dashboard`            | Indicateurs et graphiques           |
| —       | `/students`             | CRUD élèves                         |
| —       | `/school-classes`       | CRUD classes                        |
| —       | `/academic-years`       | CRUD années scolaires               |
| —       | `/fee-types`            | CRUD types de frais                 |
| —       | `/fee-structures`       | CRUD grille tarifaire               |
| —       | `/invoices`             | CRUD factures (avec lignes)         |
| —       | `/payments`             | Encaissements (create/list/delete)  |
| —       | `/expenses`             | CRUD dépenses                       |
| —       | `/suppliers`            | CRUD fournisseurs                   |
| —       | `/expense-categories`   | CRUD catégories de dépenses         |
| —       | `/users`                | CRUD utilisateurs de l'école        |
| GET     | `/my-subscription`      | Abonnement de l'école courante      |

### API Super Admin (préfixe `/api/super`, rôle super_admin)

| Méthode | Endpoint                     | Description                          |
|---------|------------------------------|--------------------------------------|
| GET     | `/super/dashboard`           | Statistiques globales de la plateforme |
| —       | `/super/schools`             | CRUD établissements (+ admin & abonnement) |
| PATCH   | `/super/schools/{id}/status` | Activer / suspendre un établissement |
| —       | `/super/plans`               | CRUD formules d'abonnement           |
| —       | `/super/subscriptions`       | Attribuer / renouveler les licences  |
| GET     | `/super/users`               | Comptes administrateurs des écoles   |
| POST    | `/super/users/{id}/reset-password` | Réinitialiser un mot de passe  |
| GET     | `/super/audit-logs`          | Journal d'audit                      |

Toutes les routes (sauf `/login`) requièrent l'en-tête `Authorization: Bearer <token>`.

## Notes techniques

- Le statut d'une facture (`impayee`/`partielle`/`payee`) est recalculé automatiquement à chaque paiement via `Invoice::refreshTotals()`.
- Un paiement ne peut pas dépasser le solde restant de la facture.
- CORS et Sanctum sont préconfigurés pour `http://localhost:5173`.
- Devise par défaut : XOF (franc CFA), modifiable par établissement.
- Multi-tenant : l'isolation est appliquée automatiquement (global scope) ; inutile de filtrer manuellement par école dans le code métier.
- Branding **Economat** : palette marine `#1B2A4A`, or `#D9A441`, turquoise `#2E9C9C` (voir `frontend/tailwind.config.js`), logo SVG dans `frontend/src/components/Logo.jsx`.
