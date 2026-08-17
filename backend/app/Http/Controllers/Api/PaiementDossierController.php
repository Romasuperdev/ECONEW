<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GrilleScolarite;
use App\Models\PaiementDossier;
use App\Models\Prerequis;
use App\Models\Student;
use App\Support\AnneeContext;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Module « Réception des dossiers et frais annexes ».
 */
class PaiementDossierController extends Controller
{
    private const TABLE = 'paiements_dossiers';

    /* ---------------- Infrastructure ---------------- */

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
                $t->string('matricule_eleve', 50);
                $t->string('annee_scolaire_id', 50)->nullable();
                $t->string('grille_tarifaire_id', 50)->nullable();
                $t->decimal('montant_frais_dossier', 14, 2)->default(0);
                $t->decimal('montant_frais_annexes', 14, 2)->default(0);
                $t->decimal('montant_total', 14, 2)->default(0);
                $t->decimal('montant_paye', 14, 2)->default(0);
                $t->integer('quantite')->default(1);
                $t->string('mode_paiement', 50)->nullable();
                $t->string('reference_paiement', 100)->nullable();
                $t->string('numero_recu', 60)->nullable();
                $t->string('statut', 20)->default('non_paye');
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

    /** Ajoute la colonne quantite aux tables déjà créées (rétro-compatibilité). */
    private function ensureQuantite(): void
    {
        try {
            if (Schema::connection('economat')->hasTable(self::TABLE)
                && ! Schema::connection('economat')->hasColumn(self::TABLE, 'quantite')) {
                Schema::connection('economat')->table(self::TABLE, function ($t) {
                    $t->integer('quantite')->default(1);
                });
            }
        } catch (\Throwable $e) {}
    }

    private function statutFor(float $paye, float $total): string
    {
        if ($paye <= 0) {
            return 'non_paye';
        }
        return $paye + 0.001 >= $total ? 'paye' : 'partiel';
    }

    /** Grille applicable à un niveau (code_grille == code niveau de l'élève). */
    private function grilleForNiveau(?string $codeNiveau): ?GrilleScolarite
    {
        if (! $codeNiveau) {
            return null;
        }
        try {
            return GrilleScolarite::available()->first(function ($g) use ($codeNiveau) {
                return (string) ($g->toNormalized()['code_grille'] ?? '') === (string) $codeNiveau;
            });
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Source unique de vérité des tarifs : T_PREREQUIS (via le modèle Prerequis).
     * Repli sur l'ancienne grille (T_GRILLESCOLARITE + ECO_GRILLE_SCO_EXTRA) si vide.
     */
    private function resolveTarifs(Student $eleve): array
    {
        $t = Prerequis::tarifsForNiveau($eleve->CodeNiveau, $eleve->CodeClasse, AnneeContext::current());
        if ($t['trouvee']) {
            return [
                'frais_dossier' => (float) $t['frais_dossier'],
                'frais_annexes' => (float) $t['frais_annexes'],
                'total' => (float) $t['total'],
                'grille_id' => null,
                'trouvee' => true,
                'source' => 'T_PREREQUIS',
            ];
        }
        // Repli grille historique.
        $grille = $this->grilleForNiveau($eleve->CodeNiveau);
        $gn = $grille ? $grille->toNormalized() : null;
        $dossier = $gn ? (float) ($gn['inscription'] ?? 0) : 0.0;
        $annexes = $grille ? $this->fraisAnnexesOf($grille->getKey()) : 0.0;
        return [
            'frais_dossier' => $dossier,
            'frais_annexes' => $annexes,
            'total' => $dossier + $annexes,
            'grille_id' => $grille ? $grille->getKey() : null,
            'trouvee' => (bool) $grille,
            'source' => 'grille',
        ];
    }

    private function fraisAnnexesOf($grilleId): float
    {
        try {
            if ($grilleId && Schema::connection('economat')->hasTable('ECO_GRILLE_SCO_EXTRA')) {
                $v = DB::connection('economat')->table('ECO_GRILLE_SCO_EXTRA')
                    ->where('GRILLE_ID', (string) $grilleId)->value('FRAIS_ANNEXES');
                return (float) ($v ?? 0);
            }
        } catch (\Throwable $e) {}
        return 0.0;
    }

    /** Reçu unique de type RD-<ETAB>-<AAAAMMJJ>-<4 chiffres>. */
    private function genRecu(): string
    {
        $etab = EtablissementContext::current() ?: 'ETAB';
        do {
            $ref = sprintf('RD-%s-%s-%04d', $etab, date('Ymd'), random_int(0, 9999));
            $exists = PaiementDossier::withoutGlobalScopes()->withTrashed()
                ->where('numero_recu', $ref)->exists();
        } while ($exists);
        return $ref;
    }

    /* ---------------- Fiche élève + grille ---------------- */

    public function infos(string $matricule)
    {
        $this->ensure();
        try {
            $eleve = Student::forTenant()->with('classe.niveau')->where('Matricule', $matricule)->first();
        } catch (\Throwable $e) {
            $eleve = Student::where('Matricule', $matricule)->first();
        }
        if (! $eleve) {
            return response()->json(['message' => "Aucun élève trouvé pour le matricule « {$matricule} »."], 404);
        }

        $t = $this->resolveTarifs($eleve);
        $fraisDossier = $t['frais_dossier'];
        $fraisAnnexes = $t['frais_annexes'];

        $classe = $eleve->classe;
        return response()->json([
            'eleve' => [
                'matricule' => $eleve->Matricule,
                'nom' => $eleve->Nom,
                'prenom' => $eleve->Prenom,
                'full_name' => $eleve->full_name,
                'sexe' => $eleve->Sexe,
                'niveau' => $classe && $classe->niveau ? $classe->niveau->LibelleNiveau : $eleve->CodeNiveau,
                'niveau_code' => $eleve->CodeNiveau,
                'classe' => $classe ? $classe->LibelleClasse : $eleve->CodeClasse,
                'classe_code' => $eleve->CodeClasse,
                'statut' => $eleve->Statut ?? $eleve->Etat,
                'annee_scolaire' => AnneeContext::current(),
            ],
            'grille' => [
                'id' => $t['grille_id'],
                'trouvee' => $t['trouvee'],
                'source' => $t['source'],
                'frais_dossier' => $fraisDossier,
                'frais_annexes' => $fraisAnnexes,
                'total' => $fraisDossier + $fraisAnnexes,
            ],
        ]);
    }

    /* ---------------- Consultation (filtres + totaux + pagination) ---------------- */

    public function index(Request $request)
    {
        $this->ensure();

        $q = PaiementDossier::query()->with('eleve');

        if ($etat = $request->query('etat_paiement')) {
            $q->where('statut', $etat);
        }

        // Filtres niveau / classe : on résout les matricules concernés.
        $niveau = $request->query('niveau_id');
        $classe = $request->query('classe_id');
        if ($niveau || $classe) {
            try {
                $mats = Student::forTenant()
                    ->when($niveau, fn ($x) => $x->where('CodeNiveau', $niveau))
                    ->when($classe, fn ($x) => $x->where('CodeClasse', $classe))
                    ->pluck('Matricule')->all();
                $q->whereIn('matricule_eleve', $mats ?: ['__none__']);
            } catch (\Throwable $e) {}
        }

        // Recherche floue matricule / nom / prénom.
        if ($search = trim((string) $request->query('search', ''))) {
            $mats = [];
            try {
                $mats = Student::forTenant()
                    ->where(function ($x) use ($search) {
                        $x->where('Matricule', 'like', "%{$search}%")
                          ->orWhere('Nom', 'like', "%{$search}%")
                          ->orWhere('Prenom', 'like', "%{$search}%");
                    })->pluck('Matricule')->all();
            } catch (\Throwable $e) {}
            $q->where(function ($x) use ($search, $mats) {
                $x->where('matricule_eleve', 'like', "%{$search}%")
                  ->orWhere('numero_recu', 'like', "%{$search}%");
                if (! empty($mats)) {
                    $x->orWhereIn('matricule_eleve', $mats);
                }
            });
        }

        if ($from = $request->query('date_debut')) {
            $q->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('date_fin')) {
            $q->whereDate('created_at', '<=', $to);
        }

        // Totaux (sur l'ensemble filtré, hors pagination).
        $agg = (clone $q)->selectRaw('COALESCE(SUM(montant_total),0) as du, COALESCE(SUM(montant_paye),0) as paye')->first();
        $du = (float) ($agg->du ?? 0);
        $paye = (float) ($agg->paye ?? 0);

        $perPage = min((int) $request->query('per_page', 20), 200);
        $page = $q->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'data' => collect($page->items())->map(fn ($p) => $p->toNormalized())->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
            'totaux' => [
                'montant_du' => $du,
                'montant_paye' => $paye,
                'reste_a_payer' => max(0, $du - $paye),
            ],
        ]);
    }

    /* ---------------- Enregistrement (verrouillage immédiat) ---------------- */

    public function store(Request $request)
    {
        $this->ensure();
        $this->ensureQuantite();
        $data = $request->validate([
            'matricule_eleve' => ['required', 'string', 'max:50'],
            'montant_paye' => ['required', 'numeric', 'min:0'],
            'quantite' => ['nullable', 'integer', 'min:1'],
            'mode_paiement' => ['nullable', 'string', 'max:50'],
            'reference_paiement' => ['nullable', 'string', 'max:100'],
            'montant_frais_dossier' => ['nullable', 'numeric', 'min:0'],
            'montant_frais_annexes' => ['nullable', 'numeric', 'min:0'],
        ]);

        try {
            $eleve = Student::forTenant()->where('Matricule', $data['matricule_eleve'])->first();
        } catch (\Throwable $e) {
            $eleve = Student::where('Matricule', $data['matricule_eleve'])->first();
        }
        if (! $eleve) {
            return response()->json(['message' => "Élève introuvable pour ce matricule."], 422);
        }

        $t = $this->resolveTarifs($eleve);
        $fraisDossier = array_key_exists('montant_frais_dossier', $data) && $data['montant_frais_dossier'] !== null
            ? (float) $data['montant_frais_dossier'] : $t['frais_dossier'];
        $fraisAnnexes = array_key_exists('montant_frais_annexes', $data) && $data['montant_frais_annexes'] !== null
            ? (float) $data['montant_frais_annexes'] : $t['frais_annexes'];
        $total = $fraisDossier + $fraisAnnexes;
        $paye = (float) $data['montant_paye'];
        $quantite = (int) ($data['quantite'] ?? 1);

        $p = new PaiementDossier();
        $p->matricule_eleve = $eleve->Matricule;
        $p->grille_tarifaire_id = $t['grille_id'] ? (string) $t['grille_id'] : null;
        $p->montant_frais_dossier = $fraisDossier;
        $p->montant_frais_annexes = $fraisAnnexes;
        $p->montant_total = $total;
        $p->montant_paye = $paye;
        $p->quantite = $quantite > 0 ? $quantite : 1;
        $p->mode_paiement = $data['mode_paiement'] ?? 'Espèces';
        $p->reference_paiement = $data['reference_paiement'] ?? null;
        $p->numero_recu = $this->genRecu();
        $p->statut = $this->statutFor($paye, $total);
        // code_societe / etablissement_id / annee_scolaire_id / user_id : via traits.
        $p->save();

        AuditLogger::log('create', "Réception dossier {$p->numero_recu} — élève {$eleve->Matricule} — {$paye}");

        $p->load('eleve');
        return response()->json($p->toNormalized() + ['message' => 'Paiement enregistré et verrouillé.'], 201);
    }

    /* ---------------- Modification (<= 2 jours) ---------------- */

    public function update(Request $request, int $id)
    {
        $this->ensure();
        $p = PaiementDossier::findOrFail($id);

        if (! $p->estModifiable()) {
            return response()->json(['message' => 'Transaction verrouillée, modification impossible'], 403);
        }

        $this->ensureQuantite();
        $data = $request->validate([
            'montant_paye' => ['nullable', 'numeric', 'min:0'],
            'quantite' => ['nullable', 'integer', 'min:1'],
            'mode_paiement' => ['nullable', 'string', 'max:50'],
            'reference_paiement' => ['nullable', 'string', 'max:100'],
        ]);

        if (array_key_exists('montant_paye', $data) && $data['montant_paye'] !== null) {
            $paye = (float) $data['montant_paye'];
            $p->montant_paye = $paye;
            $p->statut = $this->statutFor($paye, (float) $p->montant_total);
        }
        if (array_key_exists('quantite', $data) && $data['quantite'] !== null) {
            $p->quantite = (int) $data['quantite'];
        }
        if (array_key_exists('mode_paiement', $data)) {
            $p->mode_paiement = $data['mode_paiement'];
        }
        if (array_key_exists('reference_paiement', $data)) {
            $p->reference_paiement = $data['reference_paiement'];
        }
        $p->save();

        AuditLogger::log('update', "Modification réception dossier {$p->numero_recu}");

        $p->load('eleve');
        return response()->json($p->toNormalized() + ['message' => 'Paiement mis à jour.']);
    }

    /* ---------------- Annulation (soft delete <= 2 jours) ---------------- */

    public function destroy(Request $request, int $id)
    {
        $this->ensure();
        $p = PaiementDossier::findOrFail($id);

        if (! $p->estModifiable()) {
            return response()->json(['message' => 'Transaction verrouillée, annulation impossible'], 403);
        }

        $motif = (string) $request->input('motif', $request->input('motif_annulation', ''));
        $p->withMotif($motif !== '' ? $motif : null)->delete();

        return response()->json(['message' => 'Paiement annulé.']);
    }

    /* ---------------- Reçu PDF ---------------- */

    public function recu(int $id)
    {
        $this->ensure();
        $p = PaiementDossier::with('eleve')->findOrFail($id);

        $societe = SocieteContext::current() ?: 'Établissement';
        $etablissement = \App\Models\Etablissement::currentName() ?: $societe;
        $eleve = $p->eleve;
        $classe = null;
        try { $classe = optional($eleve?->classe)->LibelleClasse; } catch (\Throwable $e) {}

        $pdf = Pdf::loadView('pdf.paiement_dossier', [
            'recu' => $p->numero_recu,
            'devise' => 'FCFA',
            'societe' => $societe,
            'etablissement' => $etablissement,
            'niveau' => $eleve?->CodeNiveau,
            'classe' => $classe,
            'eleve' => $eleve?->full_name ?? '',
            'matricule' => $p->matricule_eleve,
            'annee' => $p->annee_scolaire_id,
            'frais_dossier' => (float) $p->montant_frais_dossier,
            'frais_annexes' => (float) $p->montant_frais_annexes,
            'total' => (float) $p->montant_total,
            'paye' => (float) $p->montant_paye,
            'reste' => $p->reste(),
            'mode' => $p->mode_paiement,
            'reference' => $p->reference_paiement,
            'statut' => $p->statut,
            'date' => optional($p->created_at)->format('d/m/Y à H:i'),
        ]);

        return $pdf->download('Recu-Dossier-'.$p->numero_recu.'.pdf');
    }
}
