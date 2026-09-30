<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cantine;
use App\Models\GrilleCantine;
use App\Models\Student;
use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CantineController extends Controller
{
    /* ---------------- Grille tarifaire ---------------- */

    public function grilleIndex()
    {
        try {
            return response()->json(
                GrilleCantine::forTenant()->orderBy('CodeNiveau')->get()
                    ->map(fn (GrilleCantine $g) => $g->toNormalized())->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function grilleStore(Request $request)
    {
        $data = $this->grilleRules($request);
        $g = new GrilleCantine();
        $g->ModePaiement = $data['mode'] ?? null;
        $g->CodeNiveau = $data['code_niveau'];
        $g->Montant = $data['montant'];
        $g->NbrMois = $data['nbr_mois'] ?? null;
        $g->ANNEE = AnneeContext::current();
        $g->CODESOCIETE = SocieteContext::current();
        $g->CODEETABLISSEMENT = \App\Support\EtablissementContext::current();
        $g->save();

        return response()->json($g->toNormalized(), 201);
    }

    public function grilleUpdate(Request $request, string $grille)
    {
        if (! ctype_digit((string) $grille)) {
            return response()->json(['message' => 'Identifiant de tarif invalide.'], 422);
        }
        $data = $this->grilleRules($request);
        $g = GrilleCantine::forTenant()->where('Num', (int) $grille)->firstOrFail();
        $g->ModePaiement = $data['mode'] ?? null;
        $g->CodeNiveau = $data['code_niveau'];
        $g->Montant = $data['montant'];
        $g->NbrMois = $data['nbr_mois'] ?? null;
        $g->save();

        return response()->json($g->toNormalized());
    }

    public function grilleDestroy(string $grille)
    {
        if (! ctype_digit((string) $grille)) {
            GrilleCantine::forTenant()->whereNull('Num')->delete();
            return response()->json(['message' => 'Tarif(s) sans identifiant supprimé(s).']);
        }
        GrilleCantine::forTenant()->where('Num', (int) $grille)->firstOrFail()->delete();

        return response()->json(['message' => 'Tarif supprimé.']);
    }

    /* ---------------- Inscriptions / suivi ---------------- */

    public function index(Request $request)
    {
        try {
            $rows = Cantine::forTenant()->with('eleve')
                ->when($request->search, fn ($q, $s) => $q->where('Matricule', 'like', "%$s%"))
                ->when($request->actif !== null && $request->actif !== '', fn ($q) => $q->where('Actif', (int) $request->boolean('actif')))
                ->orderByDesc('Num')
                ->get()
                ->map(fn (Cantine $c) => $c->toNormalized());

            return response()->json(['data' => $rows->values(), 'total' => $rows->count()]);
        } catch (\Throwable $e) {
            return response()->json(['data' => [], 'total' => 0]);
        }
    }

    /** Inscrit un eleve a la cantine (montant issu de la grille). */
    public function store(Request $request)
    {
        $data = $request->validate([
            'matricule' => ['required', 'string'],
            'code_niveau' => ['nullable', 'string'],
            'mode' => ['nullable', 'string'],
            'nbr_mois' => ['nullable', 'integer'],
            'montant_annee' => ['nullable', 'numeric'],
            'montant_inscription' => ['nullable', 'numeric'],
            'date_debut' => ['nullable', 'date'],
        ]);

        $eleve = Student::forTenant()->where('Matricule', $data['matricule'])->first();
        if (! $eleve) {
            return response()->json(['message' => 'Élève introuvable.'], 422);
        }

        $niveau = $data['code_niveau'] ?? $eleve->CodeNiveau;

        // Montant : fourni, sinon depuis la grille cantine du fichier de base
        // (ECO_GRILLE_CANTINE), sinon l'ancienne grille par niveau si elle existe.
        $montant = $data['montant_annee'] ?? null;
        $tarif = null;
        if ($montant === null) {
            $tarif = $this->tarifCourant();
            if ($tarif) {
                $montant = (float) ($tarif->MONTANT_ANNEE ?? 0);
            } else {
                $montant = $this->montantGrilleNiveau($niveau, $data['mode'] ?? null, $data['nbr_mois'] ?? null);
            }
        }
        if ($montant === null || $montant <= 0) {
            return response()->json([
                'message' => "Aucun tarif cantine défini pour cet établissement. Renseignez-le dans Fichier de base › Grilles tarifaires › Grille cantine.",
            ], 422);
        }

        $c = new Cantine();
        $c->Matricule = $data['matricule'];
        $c->CodeNiveau = $niveau;
        $c->DateDebut = $data['date_debut'] ?? now()->toDateString();
        $c->Actif = 1;
        $c->NbrMois = $data['nbr_mois'] ?? null;
        $c->Montant = (int) round($montant);
        $c->MontantAnnee = $montant;
        $c->MontantInscription = $data['montant_inscription'] ?? null;
        if ($tarif) {
            $c->MontantPeriode = $tarif->MONTANT_MOIS !== null ? (int) round((float) $tarif->MONTANT_MOIS) : null;
            $c->GrilleTarifaire = (string) $tarif->id;
        }
        $c->PAIEMENT = 0;
        $c->NbreVersement = 0;
        $c->Statut = 1;
        $c->ANNEE = AnneeContext::current();
        $c->CODESOCIETE = SocieteContext::current();
        $c->CODEETABLISSEMENT = \App\Support\EtablissementContext::current();
        $c->save();

        return response()->json($c->load('eleve')->toNormalized(), 201);
    }

    /** Encaisse un versement cantine (increment PAIEMENT / NbreVersement). */
    public function encaisser(Request $request, string $cantine)
    {
        $data = $request->validate([
            'montant' => ['required', 'numeric', 'min:1'],
        ]);

        return DB::connection('economat')->transaction(function () use ($cantine, $data) {
            $c = Cantine::forTenant()->where('Num', $cantine)->lockForUpdate()->firstOrFail();

            $reste = max($c->du() - $c->paye(), 0);
            if ($data['montant'] > $reste + 0.01) {
                return response()->json([
                    'message' => 'Le montant dépasse le reste à payer ('.number_format($reste, 0, ',', ' ').' XOF).',
                ], 422);
            }

            $c->PAIEMENT = (int) round($c->paye() + $data['montant']);
            $c->NbreVersement = (int) ($c->NbreVersement ?? 0) + 1;
            $c->save();

            \App\Support\AuditLogger::log('create', 'Encaissement cantine '.$data['montant'].' (facture '.$cantine.')');
            return response()->json([
                'message' => 'Versement cantine enregistré.',
                'cantine' => $c->load('eleve')->toNormalized(),
            ], 201);
        });
    }

    /**
     * Tarif cantine de l'établissement courant (ECO_GRILLE_CANTINE, saisi dans
     * « Grille cantine ») : de préférence celui de l'année courante, sinon le plus récent.
     */
    private function tarifCourant(): ?object
    {
        try {
            if (! Schema::connection('economat')->hasTable('ECO_GRILLE_CANTINE')) {
                return null;
            }
            $annee = AnneeContext::current();
            return DB::connection('economat')->table('ECO_GRILLE_CANTINE')
                ->when(SocieteContext::current(), fn ($q, $s) => $q->where('CODESOCIETE', $s))
                ->when(\App\Support\EtablissementContext::current(), fn ($q, $e) => $q->where('CODEETABLISSEMENT', $e))
                ->where('MONTANT_ANNEE', '>', 0)
                ->orderByRaw('CASE WHEN ANNEE = ? THEN 0 ELSE 1 END', [(string) $annee])
                ->orderByDesc('id')
                ->first();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Ancienne grille par niveau (T_GRILLECANTINE). Selon les bases, cette table
     * n'a pas les colonnes attendues (CodeNiveau, CODESOCIETE…) : on ignore alors.
     */
    private function montantGrilleNiveau(?string $niveau, ?string $mode, $nbrMois): ?float
    {
        try {
            $grille = GrilleCantine::forTenant()
                ->where('CodeNiveau', $niveau)
                ->when($mode, fn ($q, $m) => $q->where('ModePaiement', $m))
                ->when($nbrMois, fn ($q, $n) => $q->where('NbrMois', $n))
                ->first();
            return $grille ? (float) $grille->Montant : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function grilleRules(Request $request): array
    {
        return $request->validate([
            'code_niveau' => ['required', 'string'],
            'mode' => ['nullable', 'string', 'max:50'],
            'montant' => ['required', 'numeric', 'min:0'],
            'nbr_mois' => ['nullable', 'integer'],
        ]);
    }
}
