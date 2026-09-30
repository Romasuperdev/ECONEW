# Cloisonnement multi-tenant — NEXORA ECONOMAT

Mise en conformité avec la note d'architecture `schema_multitenant.pdf`
(modèle **Schéma 1 : « shared database, shared schema »**, société → établissements).
Approche retenue : **couche applicative uniquement** (aucune modification du schéma
SQL Server legacy) + **rattachement des lignes orphelines au tenant par défaut**.

## Principe

Une seule base, chaque enregistrement porte sa clé de tenant
(`CODESOCIETE`, et selon les tables `CODEETABLISSEMENT`/`Site`, `ANNEE`/`AnneeAcad`).
Toute lecture est filtrée par ces clés — **jamais de lecture globale sans filtre**.

## Ce qui a été mis en place

### 1. Filtre automatique et systématique (scope global « fail-closed »)
`app/Models/Concerns/IsTenantScoped.php` — nouveau trait qui applique, à **toutes**
les requêtes du modèle, sa règle `scopeForTenant()` (société + établissement + année,
détection tolérante des noms de colonnes legacy). Impossible d'oublier le filtre
dans un contrôleur, une relation ou une agrégation.

Appliqué à 25 modèles métier : Student, Versement, Expense, Invoice, Level,
SchoolClass, Cycle, GrilleScolarite, FeeType, Cantine, GrilleCantine, GrillePension,
Transport, PaymentMode, Pension, Supplier, ExpenseCategory, Caisse, MvtCaisse,
Prerequis, ActivityLog, Chauffeur, Bus, ChauffeurBus, AcademicYear.
(Les tables natives PaiementDossier / Depart / AffectationEtat étaient déjà isolées
via le trait `HasEtablissement`.)

**Fail-closed** : pour un utilisateur non super-admin, le contexte société est
toujours résolu (sa société, sinon repli config), donc le filtre s'applique
systématiquement. Le **super administrateur** (console plateforme) n'est pas filtré :
il pilote l'ensemble des sociétés et pose ses propres filtres.
Échappatoire explicite et auditée : `Model::withoutTenant()`.

### 2. Suppression des lectures globales tolérantes
- Retrait des `orWhereNull` qui laissaient fuir les lignes sans établissement/année :
  `Student`, `Versement`, `FeeType`.
- Retrait des replis « sinon retourne tout » dans les `available()` :
  `Etablissement`, `SchoolClass`, `Level`, `GrilleScolarite`, `Prerequis`, `Cycle`.
  (Le super administrateur conserve une vue plateforme légitime via
  `Etablissement::available()`.)

### 3. Middleware de défense en profondeur
`app/Http/Middleware/EnforceTenant.php` (ajouté au groupe `api`) : rejette en **403**
toute requête d'un utilisateur non super-admin dont l'en-tête `X-Societe` /
`X-Etablissement` pointe hors de son périmètre (anti-usurpation), au lieu de
« clamper » silencieusement.

### 4. Contextes durcis + validation croisée
- `SocieteContext` : en-tête accepté seulement s'il fait partie des sociétés de
  l'utilisateur ; mémorisation par requête.
- `EtablissementContext` : en-tête accepté **uniquement** s'il appartient à la
  société courante (fin de la tolérance « en-tête arbitraire si liste vide »).
- `AnneeContext` : l'année demandée est **validée** contre les années de la société
  courante ; mémorisation par requête (et protection contre la réentrance).
- **Validation croisée automatique** : par ex. l'encaissement recherche l'élève via
  `Student` (désormais cloisonné) — un matricule d'un autre tenant renvoie
  « Élève introuvable ». Plus besoin de contrôle manuel.

### 5. Rattachement des données orphelines
`php artisan tenant:backfill` — rattache les lignes dont société/établissement/année
sont NULL ou vides au **tenant par défaut** (`config/economat.php`).

```
php artisan tenant:backfill --dry-run   # compte, ne modifie rien
php artisan tenant:backfill             # applique
```

Options : `--societe=`, `--etab=`, `--annee=` pour surcharger les valeurs par défaut.

## À faire côté exploitation (ordre conseillé)

1. Sauvegarder les bases (`ECONOMAT`, `dbmasterbacou`).
2. Vérifier `ECONOMAT_CODE_SOCIETE`, `ECONOMAT_CODE_ETAB`, `ECONOMAT_ANNEE` dans `.env`.
3. `php artisan tenant:backfill --dry-run` pour voir le volume concerné.
4. `php artisan tenant:backfill` pour rattacher.
5. `php artisan optimize:clear` puis tester la connexion et les listes (élèves,
   paiements, classes, dépenses) sur l'application **et** la console.

## Écart assumé vs PDF (non réalisé, sur décision)

- **Index composites** `(CODESOCIETE, CODEETABLISSEMENT, ANNEE)` et **normalisation
  des colonnes** (`Site` → `CODEETABLISSEMENT`, ajout de `CODEETABLISSEMENT` sur
  `ECO_DEPENSE`/`T_PENSION`) : recommandés par le PDF mais impliquent une
  modification du schéma SQL de production — écartés (option « couche applicative
  uniquement »). À planifier si passage à l'échelle / gros volumes.
- **Holding (Schéma 2)** : non requis aujourd'hui. Le modèle actuel (société →
  établissements) est prêt à recevoir un niveau `holding_id` nullable si besoin.

## Remarque importante

Le durcissement est **strict** : une donnée dont la société/établissement ne
correspond pas au contexte de l'utilisateur ne s'affiche plus. Si des données
legacy étaient « partagées » via des colonnes vides, exécutez le backfill (étape 4)
pour les rattacher au tenant par défaut, sinon elles n'apparaîtront que pour ce
tenant.
