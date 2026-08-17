<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AffectationEtat;
use App\Models\Student;
use App\Support\SimpleXlsx;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Module « Paiements prévisionnels de l'État ».
 * Liste des élèves affectés par l'État avec le montant prévisionnel.
 */
class AffectationEtatController extends Controller
{
    private const TABLE = 'affectations_etat';

    private function ensure(): bool
    {
        try {
            if (Schema::connection('economat')->hasTable(self::TABLE)) {
                return true;
            }
            Schema::connection('economat')->create(self::TABLE, function ($t) {
                $t->increments('id');
                $t->string('code_societe', 50)->nullable();
                $t->string('etablissement_id', 50)->nullable();
                $t->string('eleve_id', 50);
                $t->string('annee_scolaire_id', 50)->nullable();
                $t->string('type_affectation', 80)->nullable();
                $t->decimal('montant_prevu', 14, 2)->default(0);
                $t->string('cycle', 60)->nullable();
                $t->string('filiere', 80)->nullable();
                $t->string('statut_affectation', 40)->nullable();
                $t->string('user_id', 50)->nullable();
                $t->string('created_by', 50)->nullable();
                $t->string('updated_by', 50)->nullable();
                $t->string('deleted_by', 50)->nullable();
                $t->string('motif_annulation', 255)->nullable();
                $t->timestamps();
                $t->softDeletes();
            });
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Construit l'ensemble des lignes filtrées + enrichies (identité, niveau, classe),
     * applique la recherche et le tri, puis renvoie [lignes, totaux].
     */
    private function collectRows(Request $request): array
    {
        $this->ensure();

        $annee = $request->query('annee_scolaire_id');
        $q = AffectationEtat::query()->when($annee, fn ($x) => $x->where('annee_scolaire_id', $annee));

        foreach (['cycle', 'filiere', 'statut_affectation'] as $col) {
            if ($v = $request->query($col)) {
                $q->where($col, $v);
            }
        }

        // Filtre niveau / classe via la table des élèves.
        $niveau = $request->query('niveau_id');
        $classe = $request->query('classe_id');
        $studentFilterMats = null;
        if ($niveau || $classe) {
            try {
                $studentFilterMats = Student::forTenant()
                    ->when($niveau, fn ($x) => $x->where('CodeNiveau', $niveau))
                    ->when($classe, fn ($x) => $x->where('CodeClasse', $classe))
                    ->pluck('Matricule')->map(fn ($m) => (string) $m)->all();
            } catch (\Throwable $e) {
                $studentFilterMats = [];
            }
            $q->whereIn('eleve_id', $studentFilterMats ?: ['__none__']);
        }

        $affectations = $q->get();

        // Map identité des élèves concernés.
        $mats = $affectations->pluck('eleve_id')->map(fn ($m) => (string) $m)->unique()->values()->all();
        $students = collect();
        if (! empty($mats)) {
            try {
                $students = Student::with('classe.niveau')->whereIn('Matricule', $mats)->get()->keyBy(fn ($s) => (string) $s->Matricule);
            } catch (\Throwable $e) {}
        }

        $search = strtolower(trim((string) $request->query('search', '')));

        $rows = [];
        foreach ($affectations as $a) {
            $s = $students->get((string) $a->eleve_id);
            $nom = $s->Nom ?? '';
            $prenom = $s->Prenom ?? '';
            $niveauLbl = $s && $s->classe && $s->classe->niveau ? $s->classe->niveau->LibelleNiveau : ($s->CodeNiveau ?? '');
            $classeLbl = $s && $s->classe ? $s->classe->LibelleClasse : ($s->CodeClasse ?? '');

            if ($search !== '') {
                $hay = strtolower((string) $a->eleve_id.' '.$nom.' '.$prenom);
                if (! str_contains($hay, $search)) {
                    continue;
                }
            }

            $rows[] = [
                'matricule' => (string) $a->eleve_id,
                'nom' => $nom,
                'prenom' => $prenom,
                'niveau' => $niveauLbl,
                'classe' => $classeLbl,
                'type_affectation' => $a->type_affectation,
                'montant_previsionnel' => (float) $a->montant_prevu,
            ];
        }

        // Tri
        $sort = $request->query('sort', 'nom');
        $dir = strtolower($request->query('dir', 'asc')) === 'desc' ? -1 : 1;
        $allowed = ['matricule', 'nom', 'prenom', 'niveau', 'classe', 'type_affectation', 'montant_previsionnel'];
        if (in_array($sort, $allowed, true)) {
            usort($rows, function ($a, $b) use ($sort, $dir) {
                $x = $a[$sort];
                $y = $b[$sort];
                if (is_numeric($x) && is_numeric($y)) {
                    return ($x <=> $y) * $dir;
                }
                return strcasecmp((string) $x, (string) $y) * $dir;
            });
        }

        $totaux = [
            'nombre_eleves' => count($rows),
            'montant_total_previsionnel' => array_sum(array_column($rows, 'montant_previsionnel')),
        ];

        return [$rows, $totaux];
    }

    public function index(Request $request)
    {
        $request->validate(['annee_scolaire_id' => ['required', 'string']]);
        [$rows, $totaux] = $this->collectRows($request);

        $perPage = min((int) $request->query('per_page', 25), 500);
        $page = max(1, (int) $request->query('page', 1));
        $slice = array_slice($rows, ($page - 1) * $perPage, $perPage);
        $lastPage = max(1, (int) ceil(count($rows) / $perPage));

        return response()->json([
            'data' => $slice,
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => count($rows),
            ],
            'totaux' => $totaux,
        ]);
    }

    public function export(Request $request)
    {
        $request->validate(['annee_scolaire_id' => ['required', 'string']]);
        [$rows, $totaux] = $this->collectRows($request);

        $headers = ['Matricule', 'Nom', 'Prénoms', 'Niveau', 'Classe', "Type d'affectation", 'Montant prévisionnel (XOF)'];
        $data = array_map(fn ($r) => [
            $r['matricule'], $r['nom'], $r['prenom'], $r['niveau'], $r['classe'],
            $r['type_affectation'] ?? '', (float) $r['montant_previsionnel'],
        ], $rows);

        $footer = ['TOTAL', $totaux['nombre_eleves'].' élève(s)', '', '', '', '', (float) $totaux['montant_total_previsionnel']];

        $path = SimpleXlsx::generate($headers, $data, $footer);
        $name = 'Paiements-previsionnels-etat-'.($request->query('annee_scolaire_id') ?: 'annee').'.xlsx';

        return response()->download($path, $name, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}
