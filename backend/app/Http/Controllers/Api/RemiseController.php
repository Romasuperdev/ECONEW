<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AnneeContext;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use App\Support\UidRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $payload = $this->payload($data) + [
            'ANNEE' => AnneeContext::current(),
            'CODESOCIETE' => SocieteContext::current(),
            'CODEETABLISSEMENT' => EtablissementContext::current(),
        ];
        try {
            $id = DB::connection('economat')->table(self::TABLE)->insertGetId($payload, 'ID');
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }
        UidRegistry::assign('REMISE', (string) $id);
        AuditLogger::log('create', 'Remise élève '.($data['matricule'] ?? ''));

        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, string $remise)
    {
        $data = $this->rules($request);
        try {
            $this->base()->where('ID', $remise)->update($this->payload($data));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['id' => $remise]);
    }

    public function destroy(string $remise)
    {
        try {
            $this->base()->where('ID', $remise)->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['message' => 'Remise supprimée.']);
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
