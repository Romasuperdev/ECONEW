<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AnneeContext;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use App\Support\UidRegistry;
use App\Models\Student;
use App\Models\Versement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Remises accordées aux élèves — table ECONOMAT existante T_REMISE_ACCORDEE.
 * Colonnes : ID, DATE, ANNEE, MATRICULE, NOM, PRENOM, NIVEAU, MONTSCOLARITE,
 *            TAUX, MONTANTREMISE, MONTANTAVECREMISE, TYPE, CODEETABLISSEMENT, CODESOCIETE.
 */
class RemiseController extends Controller
{
    private const TABLE = 'T_REMISE_ACCORDEE';

    private function base()
    {
        return DB::connection('economat')->table(self::TABLE)
            ->when(SocieteContext::current(), fn ($q, $s) => $q->where('CODESOCIETE', $s))
            ->when(EtablissementContext::current(), fn ($q, $e) => $q->where('CODEETABLISSEMENT', $e));
    }

    private function row($r): array
    {
        return [
            'id' => $r->ID,
            'date' => $r->DATE,
            'annee' => $r->ANNEE,
            'matricule' => $r->MATRICULE,
            'nom' => $r->NOM,
            'prenom' => $r->PRENOM,
            'niveau' => $r->NIVEAU,
            'montant' => $r->MONTSCOLARITE !== null ? (float) $r->MONTSCOLARITE : null,
            'taux' => $r->TAUX !== null ? (float) $r->TAUX : null,
            'montant_remise' => $r->MONTANTREMISE !== null ? (float) $r->MONTANTREMISE : null,
            'montant_avec_remise' => $r->MONTANTAVECREMISE !== null ? (float) $r->MONTANTAVECREMISE : null,
            'type' => $r->TYPE,
        ];
    }

    public function index()
    {
        try {
            return response()->json($this->base()->orderByDesc('ID')->get()->map(fn ($r) => $this->row($r))->values());
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);
        $matricule = (string) ($data['matricule'] ?? '');
        $type = (string) ($data['type'] ?? ($data['rubrique'] ?? ''));

        // Règle 1 : une seule remise par rubrique et par élève (dans l'année).
        if ($this->remiseExiste($matricule, $type)) {
            return response()->json([
                'message' => "Une remise a déjà été accordée sur la rubrique « $type » pour cet élève. Impossible d'en ajouter une autre.",
            ], 422);
        }
        // Règle 2 : aucune remise si l'élève a déjà payé cette rubrique.
        if ($this->aPaye($matricule, $type)) {
            return response()->json([
                'message' => "Cet élève a déjà effectué un paiement sur la rubrique « $type ». La remise n'est plus permise.",
            ], 422);
        }

        $payload = $this->payload($data) + [
            'ANNEE' => AnneeContext::current(),
            'CODESOCIETE' => SocieteContext::current(),
            'CODEETABLISSEMENT' => EtablissementContext::current(),
        ];
        // Traçabilité : auteur de la remise (colonnes ajoutées si absentes).
        $payload += $this->tracabilite('create');

        try {
            $id = DB::connection('economat')->table(self::TABLE)->insertGetId($payload, 'ID');
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }
        UidRegistry::assign('REMISE', (string) $id);
        AuditLogger::log('create', "Remise accordée — élève $matricule, rubrique $type, taux ".($data['taux'] ?? 0)."%, remise ".round(((float)($data['montant']??0))*((float)($data['taux']??0))/100)." (base ".($data['montant']??0).")");

        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, string $remise)
    {
        $data = $this->rules($request);
        $matricule = (string) ($data['matricule'] ?? '');
        $type = (string) ($data['type'] ?? ($data['rubrique'] ?? ''));

        // On empêche de basculer vers une rubrique déjà remisée (hors la ligne courante).
        if ($this->remiseExiste($matricule, $type, $remise)) {
            return response()->json([
                'message' => "Une remise existe déjà sur la rubrique « $type » pour cet élève.",
            ], 422);
        }
        if ($this->aPaye($matricule, $type)) {
            return response()->json([
                'message' => "Paiement déjà effectué sur « $type » : la remise ne peut plus être modifiée.",
            ], 422);
        }

        try {
            $this->base()->where('ID', $remise)->update($this->payload($data) + $this->tracabilite('update'));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }
        AuditLogger::log('update', "Remise modifiée #$remise — élève $matricule, rubrique $type, taux ".($data['taux'] ?? 0).'%');
        return response()->json(['id' => $remise]);
    }

    public function destroy(string $remise)
    {
        try {
            $ref = $this->base()->where('ID', $remise)->first();
            $this->base()->where('ID', $remise)->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible : '.$e->getMessage()], 422);
        }
        AuditLogger::log('delete', 'Remise supprimée #'.$remise.($ref ? " — élève {$ref->MATRICULE}, rubrique {$ref->TYPE}" : ''));
        return response()->json(['message' => 'Remise supprimée.']);
    }

    /**
     * Éligibilité d'un élève aux remises par rubrique : indique celles déjà
     * remisées et celles déjà payées (à griser côté interface).
     */
    public function eligibilite(Request $request)
    {
        $matricule = (string) $request->query('matricule', '');
        $rubriques = ['Inscription', 'Scolarité', 'Transport', 'Cantine', 'Pension'];
        $out = [];
        foreach ($rubriques as $r) {
            $out[$r] = [
                'remise_existe' => $matricule !== '' && $this->remiseExiste($matricule, $r),
                'a_paye' => $matricule !== '' && $this->aPaye($matricule, $r),
            ];
        }
        return response()->json($out);
    }

    /** Une remise existe-t-elle déjà pour cet élève sur cette rubrique (année en cours) ? */
    private function remiseExiste(string $matricule, string $type, ?string $exceptId = null): bool
    {
        if ($matricule === '' || $type === '') { return false; }
        try {
            $q = $this->base()->where('MATRICULE', $matricule)->where('TYPE', $type)
                ->when(AnneeContext::current(), fn ($x, $a) => $x->where('ANNEE', $a));
            if ($exceptId !== null) { $q->where('ID', '<>', $exceptId); }
            return $q->exists();
        } catch (\Throwable $e) { return false; }
    }

    /** L'élève a-t-il déjà payé sur cette rubrique ? (bloque la remise) */
    private function aPaye(string $matricule, string $type): bool
    {
        if ($matricule === '') { return false; }
        $kw = [
            'scolarité' => 'scolar', 'scolarite' => 'scolar', 'inscription' => 'inscri',
            'transport' => 'transport', 'cantine' => 'cantine', 'pension' => 'pension',
        ];
        $needle = $kw[strtolower($type)] ?? strtolower($type);

        // 1) Versements enregistrés portant sur la rubrique (libellé)
        try {
            $cMat = Versement::col(['Matricule', 'MATRICULE', 'CodeEleve', 'CODEELEVE']);
            $cLib = Versement::col(['Libelle', 'LIBELLE', 'Motif']);
            $cMont = Versement::col(['Montant', 'MONTANT', 'MONTANT_CFA', 'MontantVerse']);
            if ($cMat) {
                $q = Versement::query()->where($cMat, $matricule);
                if ($cLib) { $q->where($cLib, 'like', "%$needle%"); }
                if ($cMont) { $q->where($cMont, '>', 0); }
                if ($q->exists()) { return true; }
            }
        } catch (\Throwable $e) {}

        // 2) Pour Scolarité / Inscription : le solde payé de la fiche élève fait foi
        if (in_array($needle, ['scolar', 'inscri'], true)) {
            try {
                $st = Student::where('Matricule', $matricule)->first();
                if ($st && (float) ($st->TotalPaye ?? 0) > 0) { return true; }
            } catch (\Throwable $e) {}
        }
        return false;
    }

    /** Colonnes de traçabilité, ajoutées uniquement si elles existent dans la table. */
    private function tracabilite(string $action): array
    {
        $out = [];
        try {
            $cols = Schema::connection('economat')->getColumnListing(self::TABLE);
            $user = Auth::user();
            $who = $user?->getAttribute('Login') ?? ($user?->name ?? (string) $user?->getKey());
            $set = function (array $cands, $val) use (&$out, $cols) {
                foreach ($cands as $c) { if (in_array($c, $cols, true)) { $out[$c] = $val; return; } }
            };
            if ($action === 'create') {
                $set(['CREE_PAR', 'CREEPAR', 'CREATED_BY', 'UTILISATEUR', 'USER_LOGIN'], $who);
                $set(['DATE_CREATION', 'CREATED_AT'], now());
            } else {
                $set(['MODIFIE_PAR', 'MODIFIEPAR', 'UPDATED_BY'], $who);
                $set(['DATE_MODIF', 'UPDATED_AT'], now());
            }
        } catch (\Throwable $e) {}
        return $out;
    }

    /** Construit les colonnes de la table à partir des entrées + calculs. */
    private function payload(array $d): array
    {
        $montant = (float) ($d['montant'] ?? 0);
        $taux = (float) ($d['taux'] ?? 0);
        $mRemise = round($montant * $taux / 100, 2);
        return [
            'DATE' => $d['date'] ?? now()->format('Y-m-d'),
            'MATRICULE' => $d['matricule'] ?? null,
            'NOM' => $d['nom'] ?? null,
            'PRENOM' => $d['prenom'] ?? null,
            'NIVEAU' => $d['niveau'] ?? null,
            'MONTSCOLARITE' => $montant,
            'TAUX' => $taux,
            'MONTANTREMISE' => $mRemise,
            'MONTANTAVECREMISE' => round($montant - $mRemise, 2),
            'TYPE' => $d['type'] ?? ($d['rubrique'] ?? null),
        ];
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'date' => ['nullable', 'string', 'max:20'],
            'matricule' => ['required', 'string', 'max:50'],
            'nom' => ['nullable', 'string', 'max:150'],
            'prenom' => ['nullable', 'string', 'max:150'],
            'niveau' => ['nullable', 'string', 'max:50'],
            'type' => ['nullable', 'string', 'max:100'],
            'rubrique' => ['nullable', 'string', 'max:100'],  // alias accepté (assistant inscription)
            'classe' => ['nullable', 'string', 'max:50'],      // ignoré (pas de colonne)
            'statut' => ['nullable', 'boolean'],               // ignoré (pas de colonne)
            'montant' => ['required', 'numeric', 'min:0'],
            'taux' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);
    }
}
