<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GrillePension;
use App\Models\Pension;
use App\Models\Student;
use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PensionController extends Controller
{
    /* ---------------- Grille / echeancier ---------------- */

    public function grilleIndex()
    {
        try {
            return response()->json(
                GrillePension::forTenant()->orderBy('DATE')->get()
                    ->map(fn (GrillePension $g) => $g->toNormalized())->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function grilleStore(Request $request)
    {
        $data = $this->grilleRules($request);
        $g = new GrillePension();
        $g->LIBELLE = $data['libelle'] ?? null;
        $g->MONTANT = $data['montant'] ?? null;
        $g->MONTANTTOTAL = $data['montant_total'];
        $g->NBVERS = $data['nb_versements'] ?? null;
        $g->DATE = $data['date'] ?? now()->toDateString();
        $g->ANNEE = AnneeContext::current();
        $g->CODESOCIETE = SocieteContext::current();
        $g->CODEETABLISSEMENT = \App\Support\EtablissementContext::current();
        $g->save();

        return response()->json($g->toNormalized(), 201);
    }

    public function grilleUpdate(Request $request, string $grille)
    {
        $data = $this->grilleRules($request);
        $g = GrillePension::forTenant()->where('ID', $grille)->firstOrFail();
        $g->LIBELLE = $data['libelle'] ?? $g->LIBELLE;
        $g->MONTANT = $data['montant'] ?? $g->MONTANT;
        $g->MONTANTTOTAL = $data['montant_total'];
        $g->NBVERS = $data['nb_versements'] ?? $g->NBVERS;
        $g->save();

        return response()->json($g->toNormalized());
    }

    public function grilleDestroy(string $grille)
    {
        GrillePension::forTenant()->where('ID', $grille)->firstOrFail()->delete();

        return response()->json(['message' => 'Ligne supprimée.']);
    }

    /* ---------------- Inscriptions / suivi ---------------- */

    public function index(Request $request)
    {
        try {
            $due = Pension::dueReference();
            $rows = Pension::forTenant()->with('eleve')
                ->when($request->search, fn ($q, $s) => $q->where('Matricule', 'like', "%$s%"))
                ->orderByDesc('ID')
                ->get()
                ->map(fn (Pension $p) => $p->toNormalized($due));

            return response()->json(['data' => $rows->values(), 'total' => $rows->count(), 'due_reference' => $due]);
        } catch (\Throwable $e) {
            return response()->json(['data' => [], 'total' => 0, 'due_reference' => 0]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'matricule' => ['required', 'string'],
            'date_debut' => ['nullable', 'date'],
        ]);

        $eleve = Student::forTenant()->where('Matricule', $data['matricule'])->first();
        if (! $eleve) {
            return response()->json(['message' => 'Élève introuvable.'], 422);
        }

        $p = new Pension();
        $p->Matricule = $data['matricule'];
        $p->DateDebut = $data['date_debut'] ?? now()->toDateString();
        $p->PAIEMENT = 0;
        $p->ANNEE = AnneeContext::current();
        $p->CODESOCIETE = SocieteContext::current();
        $p->save();

        return response()->json($p->load('eleve')->toNormalized(), 201);
    }

    public function encaisser(Request $request, string $pension)
    {
        $data = $request->validate([
            'montant' => ['required', 'numeric', 'min:1'],
        ]);

        return DB::connection('economat')->transaction(function () use ($pension, $data) {
            $p = Pension::forTenant()->where('ID', $pension)->lockForUpdate()->firstOrFail();

            $due = Pension::dueReference();
            if ($due > 0) {
                $reste = max($due - $p->paye(), 0);
                if ($data['montant'] > $reste + 0.01) {
                    return response()->json([
                        'message' => 'Le montant dépasse le reste à payer ('.number_format($reste, 0, ',', ' ').' XOF).',
                    ], 422);
                }
            }

            $p->PAIEMENT = (int) round($p->paye() + $data['montant']);
            $p->save();

            \App\Support\AuditLogger::log('create', 'Encaissement pension '.$data['montant'].' (id '.$pension.')');
            return response()->json([
                'message' => 'Versement pension enregistré.',
                'pension' => $p->load('eleve')->toNormalized($due),
            ], 201);
        });
    }

    private function grilleRules(Request $request): array
    {
        return $request->validate([
            'libelle' => ['nullable', 'string', 'max:255'],
            'montant' => ['nullable', 'numeric', 'min:0'],
            'montant_total' => ['required', 'numeric', 'min:0'],
            'nb_versements' => ['nullable', 'integer'],
            'date' => ['nullable', 'date'],
        ]);
    }
}
