# Audit de performance — Economat (Laravel + React + SQL Server)

Objectif : passer de temps de chargement de **plusieurs minutes** à **< 2 s**.
Analyse basée sur le code réel du projet. Constats prouvés notés « ✔ vérifié ».

---

## 0. Diagnostic express — causes racines par impact

| # | Cause racine | Preuve | Impact estimé |
|---|---|---|---|
| 1 | **Aucun index** sur les colonnes filtrées des tables héritées + `paginate()` fait un `COUNT(*)` full-scan | log : « Maximum execution time of 30s exceeded » dans `AbstractPaginator` ✔ | **massif** (10 s → timeout) |
| 2 | **`per_page: 2000`** côté React (États, Remise, caisse…) → énormes jeux + `COUNT(*)` | grep frontend ✔ | très élevé |
| 3 | **`allowedSocieteCodes()` en N+1 à CHAQUE requête** (une requête `US_SOCIETE` par société) | `RhUser.php:57` ✔ | élevé (toutes les pages) |
| 4 | **Config prod non optimisée** : `APP_DEBUG=true`, `APP_ENV=local`, `LOG_LEVEL=debug`, pas de `config:cache`/`route:cache`, OPcache probablement off | `.env` + `bootstrap/cache` ✔ | élevé (constant) |
| 5 | **Dashboard = ~20 requêtes d'agrégat séquentielles** (sum/count + boucle 6 mois × 2) sur tables non indexées | `DashboardController` ✔ | élevé sur l'accueil |
| 6 | **SQL Server `encrypt=yes`** → négociation TLS par connexion ; latence par aller-retour | `config/database.php:63` ✔ | modéré, s'additionne |
| 7 | **Envois d'e-mails synchrones** (reçus, OTP) via Gmail SMTP | `NotificationController`, `AuthController` ✔ | ponctuel (30–60 s de blocage) |
| 8 | Modèles tolérants : `available()` fait 2 requêtes + `withCount` ; `getColumnListing` (corrigé par cache fichier) | code ✔ | modéré |

> À elles seules, les causes **1 + 2 + 3 + 4** expliquent des chargements de plusieurs minutes.

---

## BACKEND

### B1 — Index manquants + `COUNT(*)` de pagination (CRITIQUE)
- **Cause** : les listes (`/students`, `/versements`, …) utilisent `paginate()`, qui exécute un `SELECT COUNT(*)` sur la table entière **avant** la page. Les filtres portent sur `CODESOCIETE`, `ANNEE`/`AnneeAcad`, `CODEETABLISSEMENT`, `Matricule`, `DateVers`, `CodeClasse` — **non indexés**. SQL Server fait un *table scan* complet à chaque appel.
- **Impact** : sur des tables héritées volumineuses, le `COUNT(*)` seul dépasse la limite PHP de 30 s (constaté dans les logs). Temps : 10 s → timeout.
- **Solution** :
  1. Créer des index sur les colonnes de filtre/tri (voir script §DB1).
  2. Pour les listes, remplacer `paginate()` (qui compte tout) par `simplePaginate()` (pas de `COUNT(*)`) quand le total exact n'est pas requis.
- **Avant / Après** :
```php
// Avant (VersementController::index) — COUNT(*) full-scan
$page = $q->paginate((int) ($request->per_page ?? 30));

// Après — pas de COUNT global, beaucoup plus rapide
$page = $q->simplePaginate((int) ($request->per_page ?? 30));
```
- **Gain estimé** : **-80 à -95 %** sur les listes (de 30 s+/timeout à < 1 s avec index).

### B2 — `allowedSocieteCodes()` en N+1 sur chaque requête (CRITIQUE)
- **Cause** : pour tout utilisateur non super-admin, `SocieteContext::current()` appelle `allowedSocieteCodes()`, qui lit `societe_utilisateur` puis **fait une requête `US_SOCIETE` par identifiant de société** (`RhUser.php:57`). C'est exécuté sur **chaque endpoint** (middleware/contexte).
- **Impact** : +N requêtes réseau par requête HTTP, sur la connexion `master` chiffrée. Latence ajoutée à *toutes* les pages.
- **Solution** : remplacer la boucle par **une seule requête** `whereIn`, et **mettre en cache** le résultat par utilisateur (5–15 min).
- **Avant / Après** :
```php
// Avant : une requête par société (N+1)
foreach ($ids as $id) {
    $c = DB::connection('master')->table('US_SOCIETE')->where('NUMAUTO',$id)->value('CODESOCIETE');
    ...
}
// Après : une requête + cache
return Cache::store('file')->remember("usoc:{$this->Id}", 600, function () {
    $ids = DB::connection('master')->table('societe_utilisateur')->where('user_id',$this->Id)->pluck('societe_id');
    return DB::connection('master')->table('US_SOCIETE')->whereIn('NUMAUTO',$ids)->pluck('CODESOCIETE')->all();
});
```
- **Gain estimé** : **-100 à -600 ms par requête**, sur toutes les pages.

### B3 — Configuration de production non appliquée (CRITIQUE, rapide)
- **Cause** : `APP_ENV=local`, `APP_DEBUG=true`, `LOG_LEVEL=debug`, aucun cache de config/route/événements ; OPcache vraisemblablement désactivé sous Windows.
- **Impact** : Laravel re-parse toute la config et toutes les routes à chaque requête ; le debug ajoute stack traces/logs verbeux ; sans OPcache, PHP recompile les fichiers à chaque requête. Plusieurs centaines de ms constants.
- **Solution** :
```bash
# .env
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=warning
CACHE_STORE=file            # ou redis (voir B6)
QUEUE_CONNECTION=database    # ou redis (voir B5)

php artisan config:cache
php artisan route:cache
php artisan event:cache
php artisan view:cache
composer install --no-dev --optimize-autoloader
```
```ini
; php.ini — activer OPcache
opcache.enable=1
opcache.jit=1255
opcache.jit_buffer_size=64M
opcache.memory_consumption=192
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0   ; prod : recache au déploiement uniquement
```
- **Gain estimé** : **-30 à -60 %** du temps de bootstrap par requête.

### B4 — Dashboard : ~20 agrégats séquentiels (ÉLEVÉ)
- **Cause** : `DashboardController` enchaîne `sum`, `count`, puis une **boucle sur 6 mois × 2 requêtes** `whereBetween(...).sum(...)`, chacune scannant `T_VERSEMENT`/`T_ETUDIANT` non indexés.
- **Impact** : ~20 allers-retours SQL séquentiels ; l'accueil peut prendre des dizaines de secondes.
- **Solution** :
  1. Index sur les colonnes de date/société (§DB1).
  2. Remplacer la boucle 6 mois par **une seule requête groupée par mois** (`GROUP BY YEAR/MONTH`).
  3. **Mettre en cache** le dashboard 60–300 s (`Cache::remember`).
- **Avant / Après** :
```php
// Avant : 12 requêtes (boucle mensuelle)
for ($i=5;$i>=0;$i--){ $rec = Versement::forTenant()->whereBetween($vDate,[$s,$e])->sum($vMontant); ... }

// Après : 1 requête groupée + cache
$data = Cache::store('file')->remember("dash:{$soc}:{$annee}", 120, function () use ($vDate,$vMontant) {
    return Versement::forTenant()
        ->selectRaw("FORMAT($vDate,'yyyy-MM') as mois, SUM($vMontant) as total")
        ->groupByRaw("FORMAT($vDate,'yyyy-MM')")->get();
});
```
- **Gain estimé** : **-85 %** sur l'accueil (de ~20 requêtes à 2–3, puis quasi 0 en cache).

### B5 — Traitements synchrones à mettre en file (queue)
- **Cause** : `QUEUE_CONNECTION` par défaut = `sync`. Les e-mails (reçus `NotificationController`, OTP `AuthController`) partent **dans la requête** via Gmail SMTP.
- **Impact** : si SMTP est lent/injoignable, la requête est **bloquée 30–60 s** (voire timeout). Explique des « gels » ponctuels.
- **Solution** : `QUEUE_CONNECTION=database` (+ `php artisan queue:table && migrate`) ou `redis` ; envoyer via `Mail::to(...)->queue(...)` et exécuter un worker (`php artisan queue:work`). En attendant : ne jamais envoyer d'e-mail dans un GET.
- **Gain estimé** : requêtes concernées **-95 %** (l'e-mail ne bloque plus l'utilisateur).

### B6 — Cache applicatif
- **Cause** : peu de mise en cache ; `CACHE_STORE` non défini (défaut `database`, qui requiert une table).
- **Impact** : recalculs répétés (contextes, colonnes, dashboard, listes de référence peu changeantes : niveaux, classes, caisses, grilles).
- **Solution** : activer **Redis** (idéal) ou au minimum le store **file**. Mettre en cache : `SchemaCache` (déjà fait ✔), `allowedSocieteCodes` (B2), dashboard (B4), listes de config (niveaux/classes/caisses) avec invalidation à l'écriture.
- **Gain estimé** : **-50 à -90 %** sur les pages de config/référence en lecture répétée.

### B7 — Eloquent : eager loading, colonnes, `available()`
- **Cause** : `Versement::index` fait bien `with('eleve')` (OK, pas de N+1), mais renvoie **toutes les colonnes** des tables (larges). Les modèles tolérants `available()` exécutent **2 requêtes** (filtre puis repli) + `withCount`.
- **Impact** : payloads lourds, requêtes doublées.
- **Solution** : `->select([...])` sur les colonnes réellement utilisées ; éviter le repli `available()` quand le filtre suffit ; ne charger `withCount` que si la colonne est affichée.
- **Avant / Après** :
```php
Versement::forTenant()->with('eleve:Matricule,Nom,Prenom')
    ->select(['NUM','Matricule','Montant','DateVers','ModePaiement','CODECAISSE'])
    ->orderByDesc('NUM')->simplePaginate($n);
```
- **Gain estimé** : **-20 à -40 %** sur les listes lourdes.

---

## FRONTEND (React)

### F1 — `per_page: 2000` / `1000` (CRITIQUE)
- **Cause** : États des paiements, Remise, caisse, réinscriptions… chargent **jusqu'à 2000 lignes** puis agrègent côté client. `grep` : 12 pages concernées ✔.
- **Impact** : chaque page déclenche une requête backend très lourde (COUNT + 2000 lignes + relations) → plusieurs secondes à minutes, + rendu React coûteux.
- **Solution** :
  - **États** (paiements, périodiques, cumulés) : déporter l'agrégation **côté serveur** (endpoints qui renvoient déjà les totaux/regroupements), au lieu de tirer 2000 lignes.
  - **Sélecteurs d'élève** (Remise, caisse, réinscription) : remplacer le chargement de 1000–2000 élèves par un **champ de recherche serveur** (`/students?search=...&per_page=20`, déjà supporté) avec autocomplétion (debounce 300 ms).
- **Avant / Après** :
```jsx
// Avant : tout charger
api.get('/students', { params:{ per_page: 2000 } })
// Après : recherche paginée
const search = useDebounce(q, 300)
useEffect(() => { api.get('/students', { params:{ search, per_page: 20 } }).then(...) }, [search])
```
- **Gain estimé** : **-80 à -95 %** sur ces pages.

### F2 — Re-rendus & mémoïsation
- **Cause** : listes/tableaux volumineux recalculés à chaque frappe ; handlers recréés.
- **Impact** : latence d'interaction, surtout combinée à F1.
- **Solution** : `useMemo` pour les listes filtrées/mappées, `useCallback` pour les handlers passés en props, `React.memo` sur les lignes de tableau. (Plusieurs `useMemo` déjà en place — étendre aux gros tableaux.)
- **Gain estimé** : interactions **-50 %** de latence ressentie.

### F3 — Code splitting / lazy loading
- **Cause** : toutes les pages sont importées statiquement dans `App.jsx` → un seul gros bundle.
- **Impact** : premier chargement plus long.
- **Solution** : `React.lazy` + `Suspense` par route (surtout console super-admin, rapports, assistants).
- **Avant / Après** :
```jsx
const Rapports = React.lazy(() => import('./pages/Reports'))
<Suspense fallback={<Spinner/>}><Rapports/></Suspense>
```
- **Gain estimé** : **-30 à -50 %** sur le time-to-interactive initial ; build avec `vite build` + Brotli.

### F4 — Appels API séquentiels / inutiles
- **Cause** : certaines pages font des `Promise.all` (bien), d'autres enchaînent ; les contextes (`/me`) peuvent se rappeler.
- **Solution** : regrouper en `Promise.all`, mettre en cache client (React Query / SWR) les listes de référence (niveaux, classes, caisses, destinations) avec `staleTime`.
- **Gain estimé** : **-30 %** sur les pages multi-appels.

### F5 — Images / statiques
- **Cause** : photos élèves/chauffeurs stockées en **base64** (dossiers/photos) → payloads lourds dans les listes si renvoyées.
- **Solution** : ne pas renvoyer la photo dans les listes (uniquement à la demande) ; à terme, stocker les images en fichiers + URL + cache HTTP.
- **Gain estimé** : listes concernées **-40 %**.

---

## INFRASTRUCTURE

### I1 — SQL Server : latence par connexion
- **Cause** : `encrypt=yes` (TLS par connexion) ; instance locale mais chaque petite requête paie l'aller-retour.
- **Solution** : réduire le **nombre** de requêtes (B2, B4), activer les **index** (DB1), `trust_server_certificate=true` (déjà), envisager `encrypt=no` en réseau local sûr (mesurer le gain), et **pooling** de connexions.
- **Gain estimé** : **-10 à -30 %** en cumulé.

### I2 — Compression & cache HTTP
- **Cause** : réponses JSON/JS/CSS non compressées ; pas d'en-têtes de cache sur les assets.
- **Solution** : activer **Gzip/Brotli** (serveur web / vite preview / nginx), `Cache-Control` long sur les assets hashés du build, servir le frontend buildé (`npm run build`) et non le dev-server en prod.
- **Gain estimé** : **-50 à -70 %** sur le poids transféré.

### DB1 — Script d'index recommandé (à adapter/valider avec `EXPLAIN`/plan d'exécution)
```sql
-- Filtres multi-tenant et de tri les plus fréquents
CREATE INDEX IX_VERS_SOC_DATE   ON T_VERSEMENT (CODESOCIETE, DateVers) INCLUDE (Montant, Matricule, CODECAISSE);
CREATE INDEX IX_VERS_MAT        ON T_VERSEMENT (Matricule);
CREATE INDEX IX_ETU_SOC_ANNEE   ON T_ETUDIANT  (CODESOCIETE, AnneeAcad) INCLUDE (Nom, Prenom, CodeClasse, CodeNiveau);
CREATE INDEX IX_ETU_MAT         ON T_ETUDIANT  (Matricule);
CREATE INDEX IX_CLASSE_SOC_ANN  ON T_CLASSE    (CODESOCIETE, ANNEE, CODEETABLISSEMENT);
CREATE INDEX IX_NIVEAU_SOC_ANN  ON T_NIVEAU    (CODESOCIETE, ANNEE, CODEETABLISSEMENT);
-- Vérifier chaque requête lente : SET STATISTICS IO, TIME ON;  puis lire le plan d'exécution.
```
> ⚠️ Créer les index en heures creuses. Valider d'abord avec le **plan d'exécution** sur les requêtes réellement lentes (celles vues dans `storage/logs/laravel.log`).

---

## PLAN D'ACTION PRIORISÉ (du plus critique au moins critique)

### P0 — Quick wins (≈ 1–2 h) — vise déjà « minutes → quelques secondes »
1. **Config prod** (B3) : `APP_DEBUG=false`, `APP_ENV=production`, `LOG_LEVEL=warning`, `config:cache`, `route:cache`, OPcache. → gain immédiat et global.
2. **Index SQL** (DB1) sur T_VERSEMENT / T_ETUDIANT / T_CLASSE / T_NIVEAU. → supprime les timeouts de pagination.
3. **Baisser les `per_page`** côté React de 2000/1000 à 20–50 + recherche serveur (F1) sur les gros sélecteurs.

### P1 — Requêtes (½–1 j)
4. `allowedSocieteCodes` en 1 requête + cache (B2).
5. Dashboard : requête groupée + cache 2 min (B4).
6. `simplePaginate` + `select([...])` sur les listes (B1, B7).

### P2 — Architecture (1–2 j)
7. Queue (`database`/`redis`) pour e-mails et jobs lourds (B5).
8. Cache Redis + mise en cache des listes de référence, invalidation à l'écriture (B6).
9. États de paiement : agrégation côté serveur au lieu de 2000 lignes (F1).

### P3 — Frontend & infra (1–2 j)
10. Code splitting `React.lazy` + build prod + Brotli/Gzip + cache HTTP des assets (F3, I2).
11. `useMemo`/`useCallback`/`React.memo` sur les gros tableaux (F2).
12. Photos hors des listes / fichiers + CDN (F5, I2).

### Cible réaliste
- Après **P0** : la plupart des pages passent de **minutes → 2–5 s**.
- Après **P1** : **< 2 s** sur les pages courantes.
- Après **P2–P3** : **< 1 s** ressenti sur la majorité, premier chargement allégé.

---

## Méthode de mesure (à mettre en place pour objectiver les gains)
- Backend : activer temporairement `DB::enableQueryLog()` ou **Laravel Debugbar** (dev) / **Telescope** pour compter requêtes et durées par endpoint ; lire `storage/logs/laravel.log`.
- SQL : `SET STATISTICS IO, TIME ON;` + plan d'exécution sur les requêtes lentes.
- Frontend : onglet **Réseau** (temps par requête) et **Performance** de Chrome DevTools ; Lighthouse pour le bundle.
- Mesurer **avant/après** chaque étape du plan pour valider les gains.
