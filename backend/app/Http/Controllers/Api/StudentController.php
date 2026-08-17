<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AnneeContext;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use App\Models\GrilleScolarite;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Support\UidRegistry;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $q = Student::forTenant()->with('classe')
            ->when($request->search, fn ($x, $s) => $x->where(fn ($w) => $w
                ->where('Nom', 'like', "%$s%")
                ->orWhere('Prenom', 'like', "%$s%")
                ->orWhere('Matricule', 'like', "%$s%")))
            ->when($request->school_class_id, fn ($x, $c) => $x->where('CodeClasse', $c))
            ->orderBy('Nom')->orderBy('Prenom');

        $perPage = (int) ($request->per_page ?? 30);
        $page = $q->paginate($perPage);

        // Barème de scolarité par niveau (grille tarifaire) : repli auto quand
        // la scolarité stockée sur l'élève est vide/0.
        $grilleByNiveau = $this->grilleScolariteByNiveau();

        $page->getCollection()->transform(function ($s) use ($grilleByNiveau) {
            $n = $s->toNormalized();
            if (! (float) ($n['scolarite'] ?? 0)) {
                $code = (string) ($n['code_niveau'] ?? '');
                if ($code !== '' && isset($grilleByNiveau[$code])) {
                    $n['scolarite'] = $grilleByNiveau[$code];
                }
            }
            return $n;
        });

        return $page;
    }

    /** Map [code_niveau => montant scolarité] à partir de la grille tarifaire. */
    private function grilleScolariteByNiveau(): array
    {
        $map = [];
        try {
            foreach (GrilleScolarite::available() as $g) {
                $row = $g->toNormalized();
                $code = (string) ($row['code_grille'] ?? '');
                $sco = (float) ($row['scolarite'] ?? 0);
                if ($code !== '' && $sco > 0) {
                    $map[$code] = $sco;
                }
            }
        } catch (\Throwable $e) {}
        return $map;
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        $codeClasse = $data['school_class_id'] ?? null;
        $codeNiveau = null;
        if ($codeClasse) {
            $codeNiveau = optional(SchoolClass::where('CodeClasse', $codeClasse)->first())->CodN;
        }
        if (! $codeNiveau && ! empty($data['code_niveau'])) {
            $codeNiveau = $data['code_niveau'];
        }

        $payload = $this->mapPayload($data);
        $payload['Matricule'] = $data['matricule'] ?? $this->genMatricule();
        $payload['CodeClasse'] = $codeClasse;
        $payload['CodeNiveau'] = $codeNiveau;
        $payload['AnneeAcad'] = AnneeContext::current() ?: config('economat.annee');
        $payload['Site'] = EtablissementContext::current();
        $payload['CODESOCIETE'] = SocieteContext::current();
        $payload['DateInscription'] = $data['date_inscription'] ?? now()->toDateString();
        $payload['Statut'] = $data['status'] ?? '2';

        $student = Student::create($this->coerceTypes($payload));
        UidRegistry::assign('ELEVE', (string) ($student->Matricule ?? $student->getKey()));

        return response()->json($student->load('classe')->toNormalized(), 201);
    }

    public function show(Student $student)
    {
        return $student->load('classe')->toNormalized();
    }

    public function update(Request $request, Student $student)
    {
        $data = $this->validateData($request, $student);

        $payload = $this->mapPayload($data);

        if (array_key_exists('school_class_id', $data)) {
            $payload['CodeClasse'] = $data['school_class_id'];
            $payload['CodeNiveau'] = $data['school_class_id']
                ? optional(SchoolClass::where('CodeClasse', $data['school_class_id'])->first())->CodN
                : null;
        }
        if (! empty($data['status'])) {
            $payload['Statut'] = $data['status'];
        }
        if (! empty($data['date_inscription'])) {
            $payload['DateInscription'] = $data['date_inscription'];
        }

        $student->update($this->coerceTypes($payload));

        return $student->load('classe')->toNormalized();
    }

    public function destroy(Student $student)
    {
        // Règle métier : un élève ayant effectué au moins un paiement ne peut pas
        // être supprimé (intégrité comptable). Seul un élève inscrit sans aucun
        // versement peut être supprimé.
        if ($this->hasPayments($student)) {
            return response()->json([
                'message' => "Suppression impossible : cet élève a déjà effectué des paiements. Un élève avec des versements ne peut pas être supprimé.",
            ], 422);
        }

        $student->delete();

        return response()->json(['message' => 'Élève supprimé.']);
    }

    /** L'élève a-t-il un paiement (solde payé, versement, ou paiement de dossier) ? */
    private function hasPayments(Student $student): bool
    {
        // 1) Solde payé sur la fiche
        if ((float) ($student->TotalPaye ?? 0) > 0) {
            return true;
        }
        $mat = (string) $student->Matricule;

        // 2) Un versement enregistré (T_VERSEMENT), détection tolérante de la colonne matricule
        try {
            $col = \App\Models\Versement::col(['Matricule', 'MATRICULE', 'CodeEleve', 'CODEELEVE']);
            if ($col && \App\Models\Versement::query()->where($col, $mat)->exists()) {
                return true;
            }
        } catch (\Throwable $e) {}

        // 3) Un paiement de dossier / frais annexes réellement encaissé
        try {
            if (Schema::connection('economat')->hasTable('paiements_dossiers')) {
                $paye = DB::connection('economat')->table('paiements_dossiers')
                    ->where('matricule_eleve', $mat)->sum('montant_paye');
                if ((float) $paye > 0) {
                    return true;
                }
            }
        } catch (\Throwable $e) {}

        return false;
    }

    /** Construit le payload des colonnes T_ETUDIANT a partir des donnees validees. */
    private function mapPayload(array $d): array
    {
        $map = [
            'first_name' => 'Prenom',
            'last_name' => 'Nom',
            'gender' => 'Sexe',
            'birth_date' => 'DateNaiss',
            'birth_place' => 'LieuNaiss',
            'nationality' => 'Nationalite',
            'phone' => 'Telephone',
            'email' => 'Email',
            'address' => 'Adresse',
            'ville' => 'Ville',
            'commune' => 'Commune',
            'quartier' => 'Quartier',
            'type_eleve' => 'TypeEleve',
            'regime' => 'Regime',
            'niveau_origine' => 'NiveauOrigine',
            'etab_origine' => 'EtabOrigine',
            'father_name' => 'NomPereTuteur',
            'father_first_name' => 'PrenomPereTuteur',
            'father_profession' => 'ProfessionPereTuteur',
            'father_phone' => 'TelephonePereTuteur',
            'father_email' => 'EmailPereTuteur',
            'mother_name' => 'NomMere',
            'mother_first_name' => 'PrenomMere',
            'mother_profession' => 'ProfessionMere',
            'mother_phone' => 'TelephoneMere',
            'mother_email' => 'EmailMere',
            'scolarite' => 'Scolarite',
            'remise' => 'Remise',
        ];

        $payload = [];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $d)) {
                $payload[$col] = $d[$in];
            }
        }
        if (array_key_exists('redoublant', $d)) {
            $payload['Redoublant'] = ! empty($d['redoublant']) ? 1 : 0;
        }
        if (array_key_exists('act_naissance', $d)) {
            $payload['ActNaissance'] = ! empty($d['act_naissance']) ? 1 : 0;
        }
        if (array_key_exists('acte_date', $d) && ! empty($d['acte_date'])) {
            $payload['ActDu'] = $d['acte_date'];
        }
        if (array_key_exists('affecte', $d)) {
            $payload['Oriente'] = ! empty($d['affecte']) ? 1 : 0;
        }
        if (array_key_exists('boursier', $d)) {
            $payload['Aide'] = ! empty($d['boursier']) ? 1 : 0;
        }
        if (array_key_exists('inscription_type', $d)) {
            $payload['Inscription'] = $d['inscription_type'] === 'inscription' ? 1 : 0;
            $payload['Reinscription'] = $d['inscription_type'] === 'reinscription' ? 1 : 0;
        }

        return $payload;
    }

    private function validateData(Request $request, ?Student $student = null): array
    {
        return $request->validate([
            'matricule' => ['nullable', 'string', 'max:50'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['nullable', 'string', 'max:5'],
            'birth_date' => ['nullable', 'date'],
            'birth_place' => ['nullable', 'string', 'max:255'],
            'nationality' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'ville' => ['nullable', 'string', 'max:100'],
            'commune' => ['nullable', 'string', 'max:100'],
            'quartier' => ['nullable', 'string', 'max:100'],
            'school_class_id' => ['nullable', 'string'],
            'type_eleve' => ['nullable', 'string', 'max:50'],
            'redoublant' => ['nullable', 'boolean'],
            'regime' => ['nullable', 'string', 'max:50'],
            'niveau_origine' => ['nullable', 'string', 'max:100'],
            'etab_origine' => ['nullable', 'string', 'max:255'],
            'act_naissance' => ['nullable', 'boolean'],
            'acte_date' => ['nullable', 'date'],
            'date_inscription' => ['nullable', 'date'],
            // Parents
            'father_name' => ['nullable', 'string', 'max:255'],
            'father_first_name' => ['nullable', 'string', 'max:255'],
            'father_profession' => ['nullable', 'string', 'max:255'],
            'father_phone' => ['nullable', 'string', 'max:50'],
            'father_email' => ['nullable', 'email', 'max:255'],
            'mother_name' => ['nullable', 'string', 'max:255'],
            'mother_first_name' => ['nullable', 'string', 'max:255'],
            'mother_profession' => ['nullable', 'string', 'max:255'],
            'mother_phone' => ['nullable', 'string', 'max:50'],
            'mother_email' => ['nullable', 'email', 'max:255'],
            // Finances
            'scolarite' => ['nullable', 'numeric'],
            'remise' => ['nullable', 'numeric'],
            'code_niveau' => ['nullable', 'string', 'max:50'],
            'affecte' => ['nullable', 'boolean'],
            'boursier' => ['nullable', 'boolean'],
            'inscription_type' => ['nullable', 'string', 'in:inscription,reinscription'],
            'num_acte' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'max:20'],
        ]);
    }

    /**
     * Ecarte les valeurs texte destinees a des colonnes numeriques (colonnes legacy codees en int).
     * Evite les erreurs de conversion SQL Server (ex : Regime 'Demi-pension' -> int).
     */
    private static ?array $colTypes = null;

    private function coerceTypes(array $payload): array
    {
        if (self::$colTypes === null) {
            self::$colTypes = [];
            try {
                $rows = DB::connection('economat')->select(
                    "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'T_ETUDIANT'"
                );
                foreach ($rows as $r) {
                    self::$colTypes[$r->COLUMN_NAME] = strtolower($r->DATA_TYPE);
                }
            } catch (\Throwable $e) {
            }
        }

        $numeric = ['int', 'bigint', 'smallint', 'tinyint', 'numeric', 'decimal', 'money', 'smallmoney', 'float', 'real', 'bit'];

        foreach ($payload as $col => $val) {
            $type = self::$colTypes[$col] ?? null;
            if ($type && in_array($type, $numeric, true)) {
                if ($val === null || $val === '') {
                    continue;
                }
                if (! is_numeric($val)) {
                    unset($payload[$col]); // valeur texte incompatible : on n'ecrit pas cette colonne
                }
            }
        }

        return $payload;
    }

    private function genMatricule(): string
    {
        $etab = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) EtablissementContext::current())) ?: 'ETB';
        return $etab.now()->format('y').str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    }
}
