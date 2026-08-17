<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Level;
use App\Models\Prerequis;
use App\Models\SchoolClass;
use App\Support\AnneeContext;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SchemaCache;
use App\Support\SimpleXlsx;
use App\Support\SimpleXlsxReader;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * Importation de données (onboarding d'un nouvel établissement).
 * Fichiers Excel : modèle -> upload -> prévisualisation -> import transactionnel.
 * Lecture .xlsx maison (SimpleXlsxReader), import synchrone (sans file d'attente).
 */
class ImportController extends Controller
{
    private const LOG = 'ECO_IMPORT_LOG';

    /** Définition des types importables (ordre = dépendances). */
    private function types(): array
    {
        // Masques alignés sur le classeur « masques_import_bacou_econnomat.xlsx ».
        return [
            'niveaux_classes' => [
                'label' => 'Niveaux & Classes',
                'depends' => [],
                'fields' => [
                    ['key' => 'niveau', 'header' => 'Niveau', 'example' => '6ème', 'required' => true],
                    ['key' => 'classe', 'header' => 'Classe', 'example' => '6ème A', 'required' => true],
                    ['key' => 'cycle', 'header' => 'Cycle', 'example' => 'Premier cycle', 'required' => false],
                    ['key' => 'effectif_max', 'header' => 'Effectif max', 'example' => '40', 'required' => false],
                ],
            ],
            'grille_tarifaire' => [
                'label' => 'Grille tarifaire / Frais',
                'depends' => ['niveaux_classes'],
                'fields' => [
                    ['key' => 'annee', 'header' => 'Année scolaire', 'example' => '2024-2025', 'required' => false],
                    ['key' => 'niveau', 'header' => 'Niveau', 'example' => '6ème', 'required' => true],
                    ['key' => 'classe', 'header' => 'Classe', 'example' => '6ème A', 'required' => false],
                    ['key' => 'frais_dossier', 'header' => 'Frais de dossier', 'example' => '15000', 'required' => false],
                    ['key' => 'frais_annexes', 'header' => 'Frais annexes', 'example' => '5000', 'required' => false],
                    ['key' => 'scolarite', 'header' => 'Scolarité', 'example' => '150000', 'required' => false],
                    ['key' => 'pension', 'header' => 'Pension', 'example' => '0', 'required' => false],
                    ['key' => 'transport', 'header' => 'Transport', 'example' => '0', 'required' => false],
                    ['key' => 'cantine', 'header' => 'Cantine', 'example' => '0', 'required' => false],
                ],
            ],
            'eleves' => [
                'label' => 'Élèves / étudiants',
                'depends' => ['niveaux_classes'],
                'fields' => [
                    ['key' => 'matricule', 'header' => 'Matricule', 'example' => '', 'required' => false],
                    ['key' => 'nom', 'header' => 'Nom', 'example' => 'KOUASSI', 'required' => true],
                    ['key' => 'prenom', 'header' => 'Prénoms', 'example' => 'Ama', 'required' => false],
                    ['key' => 'date_naissance', 'header' => 'Date de naissance', 'example' => '12/09/2012', 'required' => false],
                    ['key' => 'sexe', 'header' => 'Sexe', 'example' => 'F', 'required' => false],
                    ['key' => 'nationalite', 'header' => 'Nationalité', 'example' => 'Ivoirienne', 'required' => false],
                    ['key' => 'niveau', 'header' => 'Niveau', 'example' => '6ème', 'required' => false],
                    ['key' => 'classe', 'header' => 'Classe', 'example' => '6ème A', 'required' => true],
                    ['key' => 'statut', 'header' => 'Statut', 'example' => 'Nouveau', 'required' => false],
                    ['key' => 'parent_nom', 'header' => 'Nom du parent/tuteur', 'example' => 'KOUASSI Jean', 'required' => false],
                    ['key' => 'parent_contact', 'header' => 'Contact parent', 'example' => '0700000000', 'required' => false],
                ],
            ],
            'historique_paiements' => [
                'label' => 'Historique des paiements',
                'depends' => ['eleves'],
                'fields' => [
                    ['key' => 'matricule', 'header' => 'Matricule élève', 'example' => '', 'required' => true],
                    ['key' => 'rubrique', 'header' => 'Rubrique', 'example' => 'Scolarité', 'required' => true],
                    ['key' => 'montant_du', 'header' => 'Montant dû', 'example' => '150000', 'required' => false],
                    ['key' => 'montant_paye', 'header' => 'Montant payé', 'example' => '50000', 'required' => true],
                    ['key' => 'date_paiement', 'header' => 'Date de paiement', 'example' => '10/10/2024', 'required' => false],
                ],
            ],
        ];
    }

    private function def(string $type): ?array
    {
        return $this->types()[$type] ?? null;
    }

    /* ---------------- Liste des types (pour le front) ---------------- */

    public function typesList()
    {
        return response()->json(collect($this->types())->map(fn ($d, $k) => [
            'type' => $k,
            'label' => $d['label'],
            'depends' => $d['depends'],
            'colonnes' => array_map(fn ($f) => $f['header'], $d['fields']),
        ])->values());
    }

    /* ---------------- Modèle Excel ---------------- */

    public function modele(string $type)
    {
        $d = $this->def($type);
        if (! $d) {
            return response()->json(['message' => 'Type inconnu.'], 404);
        }
        $headers = array_map(fn ($f) => $f['header'], $d['fields']);
        $example = array_map(fn ($f) => $f['example'], $d['fields']);
        $path = SimpleXlsx::generate($headers, [$example], null);
        return response()->download($path, "modele_{$type}.xlsx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /* ---------------- Parsing + validation ---------------- */

    private function norm(string $s): string
    {
        $s = mb_strtolower(trim($s));
        $s = strtr($s, ['é' => 'e', 'è' => 'e', 'ê' => 'e', 'à' => 'a', 'ô' => 'o', 'î' => 'i', 'ï' => 'i', 'ç' => 'c', 'û' => 'u']);
        return preg_replace('/[^a-z0-9]/', '', $s);
    }

    /** Lit le fichier et renvoie [lignes normalisées avec statut, compteurs]. */
    private function parseAndValidate(string $type, string $path): array
    {
        $d = $this->def($type);
        [$raw, $maxCol] = SimpleXlsxReader::read($path);
        if (empty($raw)) {
            return [[], ['total' => 0, 'valides' => 0, 'erreurs' => 0]];
        }

        // Ligne d'en-tête = 1re ligne non vide.
        $headerRow = null; $startIdx = 0;
        foreach ($raw as $i => $r) {
            if (count(array_filter($r, fn ($v) => $v !== '')) > 0) { $headerRow = $r; $startIdx = $i + 1; break; }
        }
        if ($headerRow === null) {
            return [[], ['total' => 0, 'valides' => 0, 'erreurs' => 0]];
        }

        // Association en-tête -> index de colonne, par nom normalisé (repli : position).
        $colOf = [];
        $normHeaders = [];
        foreach ($headerRow as $idx => $txt) { $normHeaders[$this->norm((string) $txt)] = $idx; }
        foreach ($d['fields'] as $pos => $f) {
            $nh = $this->norm($f['header']);
            $colOf[$f['key']] = $normHeaders[$nh] ?? $pos; // repli positionnel
        }

        $rows = [];
        $valides = 0; $erreurs = 0;
        $seenMatricule = [];
        $total = 0;
        for ($i = $startIdx; $i < count($raw); $i++) {
            $r = $raw[$i];
            if (count(array_filter($r, fn ($v) => $v !== '')) === 0) { continue; } // ligne vide ignorée
            $total++;
            $data = [];
            foreach ($d['fields'] as $f) {
                $data[$f['key']] = (string) ($r[$colOf[$f['key']]] ?? '');
            }
            $errs = $this->validateRow($type, $data, $d, $seenMatricule);
            if (empty($errs)) { $valides++; } else { $erreurs++; }
            $rows[] = ['ligne' => $i + 1, 'data' => $data, 'errors' => $errs, 'valide' => empty($errs)];
        }

        return [$rows, ['total' => $total, 'valides' => $valides, 'erreurs' => $erreurs]];
    }

    private function validateRow(string $type, array $data, array $d, array &$seenMatricule): array
    {
        $errs = [];
        foreach ($d['fields'] as $f) {
            if (! empty($f['required']) && trim((string) ($data[$f['key']] ?? '')) === '') {
                $errs[] = "« {$f['header']} » est obligatoire.";
            }
        }
        $num = fn ($v) => is_numeric(str_replace([' ', ','], ['', '.'], (string) $v));
        try {
            if ($type === 'grille_tarifaire') {
                $anyMontant = false;
                foreach (['frais_dossier', 'frais_annexes', 'scolarite', 'pension', 'transport', 'cantine'] as $k) {
                    $v = trim((string) ($data[$k] ?? ''));
                    if ($v !== '') {
                        if (! $num($v)) { $errs[] = "« ".ucfirst(str_replace('_', ' ', $k))." » doit être numérique."; }
                        elseif ((float) str_replace([' ', ','], ['', '.'], $v) > 0) { $anyMontant = true; }
                    }
                }
                if (! $anyMontant) { $errs[] = 'Renseignez au moins un montant (frais, scolarité…).'; }
            }
            if ($type === 'eleves') {
                $mat = trim((string) ($data['matricule'] ?? ''));
                if ($mat !== '') {
                    if (isset($seenMatricule[$mat])) { $errs[] = "Matricule « {$mat} » en double dans le fichier."; }
                    $seenMatricule[$mat] = true;
                }
            }
            if ($type === 'historique_paiements') {
                if (trim((string) ($data['montant_paye'] ?? '')) !== '' && ! $num($data['montant_paye'])) {
                    $errs[] = 'Le montant payé doit être numérique.';
                }
            }
        } catch (\Throwable $e) {}
        return $errs;
    }

    /* ---------------- Prévisualisation ---------------- */

    public function previsualiser(Request $request, string $type)
    {
        if (! $this->def($type)) {
            return response()->json(['message' => 'Type inconnu.'], 404);
        }
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls,zip', 'max:10240']]);
        $path = $request->file('file')->getRealPath();
        [$rows, $counts] = $this->parseAndValidate($type, $path);

        return response()->json([
            'type' => $type,
            'counts' => $counts,
            'apercu' => array_slice($rows, 0, 300),   // aperçu limité
            'tronque' => count($rows) > 300,
        ]);
    }

    /* ---------------- Confirmation (import transactionnel) ---------------- */

    public function confirmer(Request $request, string $type)
    {
        $d = $this->def($type);
        if (! $d) {
            return response()->json(['message' => 'Type inconnu.'], 404);
        }
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,zip', 'max:10240'],
            'ignorer_erreurs' => ['nullable', 'boolean'],
        ]);

        $file = $request->file('file');
        [$rows, $counts] = $this->parseAndValidate($type, $file->getRealPath());
        $valides = array_filter($rows, fn ($r) => $r['valide']);

        if (empty($valides)) {
            return response()->json(['message' => "Aucune ligne valide à importer."], 422);
        }
        if ($counts['erreurs'] > 0 && ! $request->boolean('ignorer_erreurs')) {
            return response()->json([
                'message' => "Le fichier contient {$counts['erreurs']} ligne(s) en erreur. Corrigez-les ou cochez « ignorer les lignes en erreur ».",
            ], 422);
        }

        $imported = 0;
        try {
            DB::connection('economat')->transaction(function () use ($type, $d, $valides, &$imported) {
                foreach ($valides as $r) {
                    if ($this->insertRow($type, $d, $r['data'])) { $imported++; }
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => "Import interrompu (aucune donnée enregistrée) : ".$e->getMessage()], 422);
        }

        // Conservation du fichier source pour audit + log.
        $stored = null;
        try {
            $stored = $file->storeAs('imports', $type.'_'.now()->format('Ymd_His').'_'.uniqid().'.xlsx', 'local');
        } catch (\Throwable $e) {}
        $this->log($type, $stored, $counts['total'], $imported, $counts['erreurs']);

        AuditLogger::log('create', "Import {$type} : {$imported} ligne(s) importée(s)");

        return response()->json([
            'message' => 'Import terminé.',
            'importes' => $imported,
            'ignores' => $counts['erreurs'],
            'total' => $counts['total'],
        ]);
    }

    /* ---------------- Insertion tolérante par type ---------------- */

    private function existingCols(string $table): array
    {
        try { return SchemaCache::columns($table, 'economat'); } catch (\Throwable $e) { return []; }
    }

    /** Construit et insère une ligne en ne gardant que les colonnes présentes. */
    private function insertMapped(string $table, array $map, array $values): bool
    {
        $cols = $this->existingCols($table);
        $row = [];
        foreach ($map as $logical => $cands) {
            if (! array_key_exists($logical, $values)) { continue; }
            foreach ($cands as $c) {
                if (in_array($c, $cols, true)) { $row[$c] = $values[$logical]; break; }
            }
        }
        if (empty($row)) { return false; }
        DB::connection('economat')->table($table)->insert($row);
        return true;
    }

    /* ---------------- Résolveurs niveau / classe (par libellé) ---------------- */

    private function slug(string $s): string
    {
        $s = strtoupper(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $this->deaccent($s)), '-'));
        return $s !== '' ? substr($s, 0, 40) : 'X'.random_int(100, 999);
    }

    private function deaccent(string $s): string
    {
        return strtr($s, ['é' => 'e', 'è' => 'e', 'ê' => 'e', 'à' => 'a', 'â' => 'a', 'ô' => 'o', 'î' => 'i', 'ï' => 'i', 'ç' => 'c', 'û' => 'u', 'ù' => 'u', 'É' => 'E', 'È' => 'E']);
    }

    /** Code niveau à partir d'un libellé (ou code). */
    private function niveauCode(?string $label): ?string
    {
        $label = trim((string) $label);
        if ($label === '') { return null; }
        try {
            $n = Level::query()->where('LibelleNiveau', $label)->orWhere('CodeNiveau', $label)->first();
            if ($n) { return $n->CodeNiveau; }
        } catch (\Throwable $e) {}
        return null;
    }

    /** Assure l'existence d'un niveau (crée s'il manque) et renvoie son code. */
    private function ensureNiveau(?string $label): ?string
    {
        $label = trim((string) $label);
        if ($label === '') { return null; }
        $code = $this->niveauCode($label);
        if ($code) { return $code; }
        $code = $this->slug($label);
        try {
            $this->insertMapped('T_NIVEAU', [
                'code' => ['CodeNiveau', 'CODENIVEAU'],
                'libelle' => ['LibelleNiveau', 'Libelle', 'LIBELLE'],
                'societe' => ['CODESOCIETE'],
            ], ['code' => $code, 'libelle' => $label, 'societe' => SocieteContext::current()]);
        } catch (\Throwable $e) {}
        return $code;
    }

    /** Code classe à partir d'un libellé (ou code). */
    private function classeCode(?string $label): ?string
    {
        $label = trim((string) $label);
        if ($label === '') { return null; }
        try {
            $c = SchoolClass::query()->where('LibelleClasse', $label)->orWhere('CodeClasse', $label)->first();
            if ($c) { return $c->CodeClasse; }
        } catch (\Throwable $e) {}
        return null;
    }

    private function insertRow(string $type, array $d, array $data): bool
    {
        $num = fn ($v) => (float) str_replace([' ', ','], ['', '.'], (string) ($v ?? ''));

        if ($type === 'niveaux_classes') {
            $niveauCode = $this->ensureNiveau($data['niveau'] ?? '');
            $classe = trim((string) ($data['classe'] ?? ''));
            if ($classe === '') { return false; }
            if ($this->classeCode($classe)) { return true; } // déjà présente
            $this->insertMapped('T_CLASSE', [
                'code' => ['CodeClasse', 'CODECLASSE'],
                'libelle' => ['LibelleClasse', 'Libelle', 'LIBELLE'],
                'niveau' => ['CodN', 'CODENIVEAU', 'CodeNiveau'],
                'annee' => ['ANNEE', 'AnneeAcad'],
                'societe' => ['CODESOCIETE'],
                'etab' => ['CODEETABLISSEMENT'],
            ], [
                'code' => $this->slug($classe), 'libelle' => $classe, 'niveau' => $niveauCode,
                'annee' => AnneeContext::current(), 'societe' => SocieteContext::current(), 'etab' => EtablissementContext::current(),
            ]);
            return true;
        }

        if ($type === 'grille_tarifaire') {
            $niveauCode = $this->niveauCode($data['niveau'] ?? '') ?: trim((string) ($data['niveau'] ?? ''));
            $annee = trim((string) ($data['annee'] ?? '')) ?: AnneeContext::current();
            $m = Prerequis::mapping();
            $fees = [
                'Frais de dossier' => [$data['frais_dossier'] ?? '', 'dossier'],
                'Frais annexes' => [$data['frais_annexes'] ?? '', 'annexe'],
                'Scolarité' => [$data['scolarite'] ?? '', 'scolarite'],
                'Pension' => [$data['pension'] ?? '', 'pension'],
                'Transport' => [$data['transport'] ?? '', 'transport'],
                'Cantine' => [$data['cantine'] ?? '', 'cantine'],
            ];
            $any = false;
            foreach ($fees as $lib => [$val, $typeLigne]) {
                $mm = $num($val);
                if ($mm <= 0) { continue; }
                $any = true;
                $row = [];
                $put = function ($lg, $v) use (&$row, $m) { if ($m[$lg]) { $row[$m[$lg]] = $v; } };
                $put('libelle', $lib);
                $put('montant', $mm);
                $put('type', $typeLigne);
                $put('niveau', $niveauCode);
                $put('annee', $annee);
                $put('societe', SocieteContext::current());
                $put('etab', EtablissementContext::current());
                if (! empty($row)) { DB::connection('economat')->table('T_PREREQUIS')->insert($row); }
            }
            return $any;
        }

        if ($type === 'eleves') {
            $classeCode = $this->classeCode($data['classe'] ?? '') ?: $this->slug((string) ($data['classe'] ?? ''));
            $niveauCode = trim((string) ($data['niveau'] ?? '')) !== ''
                ? ($this->niveauCode($data['niveau']) ?: $this->niveauCode($data['niveau']))
                : null;
            if (! $niveauCode) {
                try { $niveauCode = optional(SchoolClass::where('CodeClasse', $classeCode)->first())->CodN; } catch (\Throwable $e) {}
            }
            $mat = trim((string) ($data['matricule'] ?? '')) ?: $this->genMatricule();
            $this->insertMapped('T_ETUDIANT', [
                'matricule' => ['Matricule'],
                'nom' => ['Nom'],
                'prenom' => ['Prenom'],
                'sexe' => ['Sexe'],
                'naiss' => ['DateNaiss'],
                'nationalite' => ['Nationalite'],
                'classe' => ['CodeClasse'],
                'niveau' => ['CodeNiveau'],
                'statut' => ['Statut', 'Etat'],
                'annee' => ['AnneeAcad'],
                'societe' => ['CODESOCIETE'],
                'pere_nom' => ['NomPereTuteur'],
                'pere_tel' => ['TelephonePereTuteur'],
            ], [
                'matricule' => $mat,
                'nom' => $data['nom'] ?? null,
                'prenom' => $data['prenom'] ?? null,
                'sexe' => $data['sexe'] ?? null,
                'naiss' => $this->normDate($data['date_naissance'] ?? ''),
                'nationalite' => $data['nationalite'] ?? null,
                'classe' => $classeCode,
                'niveau' => $niveauCode,
                'statut' => $data['statut'] ?: '2',
                'annee' => AnneeContext::current(),
                'societe' => SocieteContext::current(),
                'pere_nom' => $data['parent_nom'] ?? null,
                'pere_tel' => $data['parent_contact'] ?? null,
            ]);
            return true;
        }

        if ($type === 'historique_paiements') {
            // Report de solde initial : versement historique (tolérant à la structure T_VERSEMENT).
            try {
                return $this->insertMapped('T_VERSEMENT', [
                    'matricule' => ['Matricule', 'MATRICULE', 'CodeEtudiant', 'MATRICULEELEVE'],
                    'montant' => ['Montant', 'MONTANT', 'MontantVerse', 'MONTANTVERSE'],
                    'libelle' => ['Libelle', 'LIBELLE', 'Motif', 'MOTIF', 'Rubrique'],
                    'date' => ['DateVersement', 'DATEVERSEMENT', 'DatePaiement', 'DATE'],
                    'annee' => ['AnneeAcad', 'ANNEE'],
                    'societe' => ['CODESOCIETE'],
                ], [
                    'matricule' => $data['matricule'] ?? null,
                    'montant' => $num($data['montant_paye'] ?? 0),
                    'libelle' => $data['rubrique'] ?? null,
                    'date' => $this->normDate($data['date_paiement'] ?? ''),
                    'annee' => AnneeContext::current(),
                    'societe' => SocieteContext::current(),
                ]);
            } catch (\Throwable $e) {
                return false; // ligne ignorée sans casser l'import
            }
        }

        return false;
    }

    private function normDate(string $s): ?string
    {
        $s = trim($s);
        if ($s === '') { return null; }
        foreach (['d/m/Y', 'd-m-Y', 'Y-m-d', 'd/m/y'] as $fmt) {
            $dt = \DateTime::createFromFormat($fmt, $s);
            if ($dt !== false) { return $dt->format('Y-m-d'); }
        }
        return $s; // laissé tel quel si non reconnu
    }

    private function genMatricule(): string
    {
        $etab = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) EtablissementContext::current())) ?: 'ETB';
        return $etab.now()->format('y').str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    }

    /* ---------------- Journal des imports ---------------- */

    private function ensureLog(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::LOG)) {
                Schema::connection('economat')->create(self::LOG, function ($t) {
                    $t->increments('id');
                    $t->string('TYPE', 40);
                    $t->string('FICHIER', 255)->nullable();
                    $t->integer('NB_LIGNES')->default(0);
                    $t->integer('NB_OK')->default(0);
                    $t->integer('NB_ERR')->default(0);
                    $t->string('USER_ID', 50)->nullable();
                    $t->string('USER_LOGIN', 100)->nullable();
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                    $t->dateTime('CREATED_AT')->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) { return false; }
    }

    private function log(string $type, ?string $fichier, int $total, int $ok, int $err): void
    {
        if (! $this->ensureLog()) { return; }
        try {
            $u = request()->user();
            DB::connection('economat')->table(self::LOG)->insert([
                'TYPE' => $type,
                'FICHIER' => $fichier,
                'NB_LIGNES' => $total,
                'NB_OK' => $ok,
                'NB_ERR' => $err,
                'USER_ID' => $u?->getKey(),
                'USER_LOGIN' => $u?->getAttribute('Login') ?? ($u?->name ?? null),
                'CODESOCIETE' => SocieteContext::current(),
                'CODEETABLISSEMENT' => EtablissementContext::current(),
                'CREATED_AT' => now(),
            ]);
        } catch (\Throwable $e) {}
    }

    public function historique()
    {
        if (! $this->ensureLog()) { return response()->json([]); }
        try {
            $soc = SocieteContext::current();
            $etab = EtablissementContext::current();
            $rows = DB::connection('economat')->table(self::LOG)
                ->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))
                ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
                ->orderByDesc('id')->limit(100)->get()
                ->map(fn ($r) => [
                    'id' => $r->id,
                    'type' => $r->TYPE,
                    'fichier' => $r->FICHIER,
                    'nb_lignes' => (int) $r->NB_LIGNES,
                    'nb_ok' => (int) $r->NB_OK,
                    'nb_err' => (int) $r->NB_ERR,
                    'user' => $r->USER_LOGIN,
                    'date' => (string) $r->CREATED_AT,
                ]);
            return response()->json($rows->values());
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function telecharger(int $id)
    {
        if (! $this->ensureLog()) { abort(404); }
        $row = DB::connection('economat')->table(self::LOG)->where('id', $id)->first();
        if (! $row || ! $row->FICHIER || ! Storage::disk('local')->exists($row->FICHIER)) {
            return response()->json(['message' => 'Fichier source indisponible.'], 404);
        }
        return response()->download(Storage::disk('local')->path($row->FICHIER), 'import_'.$row->TYPE.'_'.$id.'.xlsx');
    }
}
