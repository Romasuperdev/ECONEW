<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Etablissement;
use App\Models\Student;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Console plateforme : établissements = table ECONOMAT.dbo.T_ETABLISSEMENT.
 * L'identifiant exposé à l'API est la colonne CODE (référencée ailleurs
 * dans CODEETABLISSEMENT).
 */
class SchoolController extends Controller
{
    /** Statut API ↔ valeur stockée dans T_ETABLISSEMENT.STATUT. */
    private const STATUTS = ['active' => 'ACTIF', 'suspended' => 'SUSPENDU', 'inactive' => 'INACTIF'];

    /** Champs du formulaire → colonnes T_ETABLISSEMENT. */
    private const MAP = [
        'name' => 'RAISONSOCIALE', 'type' => 'TYPE', 'address' => 'ADRESSE',
        'phone' => 'TELEPHONE', 'fax' => 'FAX', 'email' => 'EMAIL', 'website' => 'SITEWEB',
        'nom_resp' => 'NOMRESP', 'prenom_resp' => 'PRENOMRESP', 'contact_resp' => 'CONTACTRESP',
        'email_directeur' => 'EMAILDIRECTEUR', 'city' => 'SOUS_PREFECTURE',
        'circonscription' => 'CIRCONSCRIPTION', 'code_societe' => 'CODESOCIETE',
    ];

    public function index(Request $request)
    {
        $search = mb_strtolower(trim((string) $request->search));
        $counts = $this->studentCounts();

        $rows = Etablissement::query()->orderBy('RAISONSOCIALE')->get()
            ->map(fn ($e) => $this->present($e, $counts))
            ->filter(fn ($r) => $search === ''
                || str_contains(mb_strtolower((string) $r['name']), $search)
                || str_contains(mb_strtolower((string) $r['code']), $search))
            ->filter(fn ($r) => ! $request->status || $r['status'] === $request->status)
            ->values();

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules() + [
            'code' => ['required', 'string', 'max:10', Rule::unique('economat.T_ETABLISSEMENT', 'CODE')],
            'name' => ['required', 'string', 'max:550'],
        ]);

        $e = new Etablissement();
        $e->CODE = strtoupper(trim($data['code']));
        $this->fill($e, $data);
        $e->STATUT = self::STATUTS['active'];
        $e->save();

        AuditLogger::log('create', "Création de l'établissement {$e->RAISONSOCIALE} ({$e->CODE})");

        return response()->json($this->present($e->fresh() ?? $e), 201);
    }

    public function show(string $school)
    {
        return $this->present($this->find($school), $this->studentCounts());
    }

    public function update(Request $request, string $school)
    {
        $e = $this->find($school);
        $data = $request->validate($this->rules() + [
            'name' => ['sometimes', 'required', 'string', 'max:550'],
        ]);
        $this->fill($e, $data);
        $e->save();

        AuditLogger::log('update', "Modification de l'établissement {$e->RAISONSOCIALE} ({$e->CODE})");

        return $this->present($e, $this->studentCounts());
    }

    public function setStatus(Request $request, string $school)
    {
        $e = $this->find($school);
        $data = $request->validate(['status' => ['required', Rule::in(array_keys(self::STATUTS))]]);
        $e->STATUT = self::STATUTS[$data['status']];
        $e->save();

        AuditLogger::log('update', "Statut de {$e->RAISONSOCIALE} → {$e->STATUT}");

        return $this->present($e, $this->studentCounts());
    }

    public function destroy(string $school)
    {
        $e = $this->find($school);

        // On ne supprime pas un établissement qui a encore des élèves rattachés.
        $eleves = $this->studentCounts()[(string) $e->CODE] ?? 0;
        if ($eleves > 0) {
            return response()->json([
                'message' => "Impossible de supprimer : {$eleves} élève(s) sont rattachés à cet établissement. Suspendez-le plutôt.",
            ], 422);
        }

        $name = $e->RAISONSOCIALE;
        $e->delete();
        AuditLogger::log('delete', "Suppression de l'établissement {$name}");

        return response()->json(['message' => 'Établissement supprimé.']);
    }

    private function rules(): array
    {
        return [
            'type' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:200'],
            'fax' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:50'],
            'website' => ['nullable', 'string', 'max:50'],
            'nom_resp' => ['nullable', 'string', 'max:50'],
            'prenom_resp' => ['nullable', 'string', 'max:50'],
            'contact_resp' => ['nullable', 'string', 'max:50'],
            'email_directeur' => ['nullable', 'email', 'max:50'],
            'city' => ['nullable', 'string', 'max:50'],
            'circonscription' => ['nullable', 'string', 'max:50'],
            'code_societe' => ['nullable', 'string', 'max:50'],
        ];
    }

    private function fill(Etablissement $e, array $data): void
    {
        foreach (self::MAP as $in => $col) {
            if (array_key_exists($in, $data)) {
                $v = is_string($data[$in]) ? trim($data[$in]) : $data[$in];
                $e->{$col} = $v === '' ? null : $v;
            }
        }
    }

    private function find(string $code): Etablissement
    {
        return Etablissement::query()->where('CODE', $code)->firstOrFail();
    }

    /** Nombre d'élèves (T_ETUDIANT) par code d'établissement. */
    private function studentCounts(): array
    {
        // Même détection de colonne que le modèle Student (T_ETUDIANT.Site).
        $col = Student::col(['Site', 'SITE', 'CODEETABLISSEMENT', 'CodeEtablissement']);
        if (! $col) {
            return [];
        }
        try {
            return DB::connection('economat')->table('T_ETUDIANT')
                ->select($col, DB::raw('COUNT(*) AS n'))
                ->groupBy($col)
                ->pluck('n', $col)
                ->map(fn ($n) => (int) $n)->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function present(Etablissement $e, array $counts = []): array
    {
        $f = $e->toFull();
        $statut = strtoupper(trim((string) ($f['statut'] ?? '')));
        $status = array_search($statut, self::STATUTS, true) ?: 'active'; // STATUT vide = actif
        $code = (string) $f['code'];

        return [
            'id' => $code,
            'code' => $code,
            'name' => $f['raison_sociale'] ?: $code,
            'type' => $f['type'],
            'address' => $f['adresse'],
            'phone' => $f['telephone'],
            'fax' => $f['fax'],
            'email' => $f['email'],
            'website' => $f['site_web'],
            'nom_resp' => $f['nom_resp'],
            'prenom_resp' => $f['prenom_resp'],
            'contact_resp' => $f['contact_resp'],
            'email_directeur' => $f['email_directeur'],
            'responsable_name' => trim(($f['nom_resp'] ?? '').' '.($f['prenom_resp'] ?? '')) ?: null,
            'city' => $f['sous_prefecture'],
            'circonscription' => $f['circonscription'],
            'code_societe' => $f['code_societe'],
            'status' => $status,
            'students_count' => $counts[$code] ?? (is_numeric($f['nbre_eleves']) ? (int) $f['nbre_eleves'] : 0),
            // Fiche complète (toutes les colonnes de T_ETABLISSEMENT).
            'details' => $f,
        ];
    }
}
