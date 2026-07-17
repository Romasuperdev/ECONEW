<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GrilleTransport;
use App\Models\Student;
use App\Models\Transport;
use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransportController extends Controller
{
    /* ---------------- Grille tarifaire ---------------- */

    public function grilleIndex()
    {
        try {
            return response()->json(
                GrilleTransport::orderBy('CodeNiveau')->get()
                    ->map(fn (GrilleTransport $g) => $g->toNormalized())->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function grilleStore(Request $request)
    {
        $data = $this->grilleRules($request);
        $g = new GrilleTransport();
        $g->ModePaiement = $data['mode'] ?? null;
        $g->CodeNiveau = $data['code_niveau'];
        $g->Montant = $data['montant'];
        $g->NbrMois = $data['nbr_mois'] ?? null;
        $g->Immatriculation = $data['immatriculation'] ?? null;
        $g->save();

        return response()->json($g->toNormalized(), 201);
    }

    public function grilleUpdate(Request $request, string $grille)
    {
        $data = $this->grilleRules($request);
        $g = GrilleTransport::where('Num', $grille)->firstOrFail();
        $g->ModePaiement = $data['mode'] ?? null;
        $g->CodeNiveau = $data['code_niveau'];
        $g->Montant = $data['montant'];
        $g->NbrMois = $data['nbr_mois'] ?? null;
        $g->Immatriculation = $data['immatriculation'] ?? null;
        $g->save();

        return response()->json($g->toNormalized());
    }

    public function grilleDestroy(string $grille)
    {
        GrilleTransport::where('Num', $grille)->firstOrFail()->delete();

        return response()->json(['message' => 'Tarif supprimé.']);
    }

    /* ---------------- Inscriptions / suivi ---------------- */

    public function index(Request $request)
    {
        try {
            $rows = Transport::forTenant()->with('eleve')
                ->when($request->search, fn ($q, $s) => $q->where('Matricule', 'like', "%$s%"))
                ->when($request->immatriculation, fn ($q, $i) => $q->where('Immatriculation', $i))
                ->orderByDesc('num')
                ->get()
                ->map(fn (Transport $t) => $t->toNormalized());

            return response()->json(['data' => $rows->values(), 'total' => $rows->count()]);
        } catch (\Throwable $e) {
            return response()->json(['data' => [], 'total' => 0]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'matricule' => ['required', 'string'],
            'code_niveau' => ['nullable', 'string'],
            'immatriculation' => ['nullable', 'string'],
            'mode' => ['nullable', 'string'],
            'nbr_mois' => ['nullable', 'integer'],
            'montant_annee' => ['nullable', 'numeric'],
            'date_debut' => ['nullable', 'date'],
        ]);

        $eleve = Student::forTenant()->where('Matricule', $data['matricule'])->first();
        if (! $eleve) {
            return response()->json(['message' => 'Élève introuvable.'], 422);
        }

        $niveau = $data['code_niveau'] ?? $eleve->CodeNiveau;

        $montant = $data['montant_annee'] ?? null;
        if ($montant === null) {
            $grille = GrilleTransport::query()
                ->where('CodeNiveau', $niveau)
                ->when($data['mode'] ?? null, fn ($q, $m) => $q->where('ModePaiement', $m))
                ->when($data['nbr_mois'] ?? null, fn ($q, $n) => $q->where('NbrMois', $n))
                ->when($data['immatriculation'] ?? null, fn ($q, $i) => $q->where('Immatriculation', $i))
                ->first();
            $montant = $grille ? (float) $grille->Montant : 0;
        }

        $t = new Transport();
        $t->Matricule = $data['matricule'];
        $t->CodeNiveau = $niveau;
        $t->Immatriculation = $data['immatriculation'] ?? null;
        $t->DateDebut = $data['date_debut'] ?? now()->toDateString();
        $t->Actif = 1;
        $t->Mois = $data['nbr_mois'] ?? null;
        $t->Montant = (int) round($montant);
        $t->PAIEMENT = 0;
        $t->ANNEE = AnneeContext::current();
        $t->CODESOCIETE = SocieteContext::current();
        $t->CODEETABLISSEMENT = \App\Support\EtablissementContext::current();
        $t->save();

        return response()->json($t->load('eleve')->toNormalized(), 201);
    }

    /** Affecte / change le bus (circuit) d'un eleve. */
    public function affecterBus(Request $request, string $transport)
    {
        $data = $request->validate(['immatriculation' => ['required', 'string']]);
        $t = Transport::forTenant()->where('num', $transport)->firstOrFail();
        $t->Immatriculation = $data['immatriculation'];
        $t->save();

        return response()->json($t->load('eleve')->toNormalized());
    }

    public function encaisser(Request $request, string $transport)
    {
        $data = $request->validate(['montant' => ['required', 'numeric', 'min:1']]);

        return DB::connection('economat')->transaction(function () use ($transport, $data) {
            $t = Transport::forTenant()->where('num', $transport)->lockForUpdate()->firstOrFail();

            $reste = max($t->du() - $t->paye(), 0);
            if ($data['montant'] > $reste + 0.01) {
                return response()->json([
                    'message' => 'Le montant dépasse le reste à payer ('.number_format($reste, 0, ',', ' ').' XOF).',
                ], 422);
            }

            $t->PAIEMENT = (int) round($t->paye() + $data['montant']);
            $t->save();

            \App\Support\AuditLogger::log('create', 'Encaissement transport '.$data['montant'].' (id '.$transport.')');
            return response()->json([
                'message' => 'Versement transport enregistré.',
                'transport' => $t->load('eleve')->toNormalized(),
            ], 201);
        });
    }

    private function grilleRules(Request $request): array
    {
        return $request->validate([
            'code_niveau' => ['required', 'string'],
            'mode' => ['nullable', 'string', 'max:50'],
            'montant' => ['required', 'numeric', 'min:0'],
            'nbr_mois' => ['nullable', 'integer'],
            'immatriculation' => ['nullable', 'string'],
        ]);
    }
}
