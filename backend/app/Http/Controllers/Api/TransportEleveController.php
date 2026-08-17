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
use Illuminate\Support\Facades\Schema;

/**
 * Affectation transport des élèves (table auxiliaire ECO_TRANSPORT_ELEVE).
 * Lie un élève à une destination et un car.
 */
class TransportEleveController extends Controller
{
    private const TABLE = 'ECO_TRANSPORT_ELEVE';

    private function ensure(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                Schema::connection('economat')->create(self::TABLE, function ($t) {
                    $t->increments('id');
                    $t->date('DATE')->nullable();
                    $t->string('MATRICULE', 50)->nullable();
                    $t->string('NOM', 150)->nullable();
                    $t->string('PRENOM', 150)->nullable();
                    $t->string('CLASSE', 50)->nullable();
                    $t->string('DESTINATION_ID', 50)->nullable();
                    $t->string('IMMATRICULATION', 50)->nullable();
                    $t->string('ANNEE', 20)->nullable();
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function base()
    {
        return DB::connection('economat')->table(self::TABLE)
            ->when(SocieteContext::current(), fn ($q, $s) => $q->where('CODESOCIETE', $s))
            ->when(EtablissementContext::current(), fn ($q, $e) => $q->where('CODEETABLISSEMENT', $e));
    }

    private function row($r): array
    {
        return [
            'id' => $r->id, 'date' => $r->DATE, 'matricule' => $r->MATRICULE,
            'nom' => $r->NOM, 'prenom' => $r->PRENOM, 'classe' => $r->CLASSE,
            'destination_id' => $r->DESTINATION_ID, 'immatriculation' => $r->IMMATRICULATION,
        ];
    }

    public function index()
    {
        if (! $this->ensure()) return response()->json([]);
        try {
            return response()->json($this->base()->orderByDesc('id')->get()->map(fn ($r) => $this->row($r))->values());
        } catch (\Throwable $e) { return response()->json([]); }
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);
        if (! $this->ensure()) return response()->json(['message' => 'Table indisponible.'], 422);

        // Règle : une seule inscription transport par élève et par année scolaire.
        // Si l'élève est déjà inscrit sur l'année en cours, on refuse (pas de réinscription en double).
        $annee = AnneeContext::current();
        try {
            $deja = $this->base()->where('MATRICULE', $data['matricule'])
                ->when($annee, fn ($q, $a) => $q->where('ANNEE', $a))
                ->exists();
            if ($deja) {
                return response()->json([
                    'message' => "Cet élève est déjà inscrit au transport pour l'année scolaire ".($annee ?: 'en cours').". La réinscription n'est possible qu'une fois par année.",
                    'deja_inscrit' => true,
                ], 422);
            }
        } catch (\Throwable $e) {}

        try {
            $id = DB::connection('economat')->table(self::TABLE)->insertGetId([
                'DATE' => $data['date'] ?? now()->format('Y-m-d'),
                'MATRICULE' => $data['matricule'],
                'NOM' => $data['nom'] ?? null,
                'PRENOM' => $data['prenom'] ?? null,
                'CLASSE' => $data['classe'] ?? null,
                'DESTINATION_ID' => $data['destination_id'] ?? null,
                'IMMATRICULATION' => $data['immatriculation'] ?? null,
                'ANNEE' => AnneeContext::current(),
                'CODESOCIETE' => SocieteContext::current(),
                'CODEETABLISSEMENT' => EtablissementContext::current(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }
        UidRegistry::assign('TRANSPORT_ELEVE', (string) $id);
        AuditLogger::log('create', 'Affectation transport élève '.$data['matricule']);

        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, string $aff)
    {
        $data = $this->rules($request);
        if (! $this->ensure()) return response()->json(['message' => 'Table indisponible.'], 422);
        try {
            $this->base()->where('id', $aff)->update([
                'MATRICULE' => $data['matricule'],
                'NOM' => $data['nom'] ?? null,
                'PRENOM' => $data['prenom'] ?? null,
                'CLASSE' => $data['classe'] ?? null,
                'DESTINATION_ID' => $data['destination_id'] ?? null,
                'IMMATRICULATION' => $data['immatriculation'] ?? null,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['id' => $aff]);
    }

    public function destroy(string $aff)
    {
        if (! $this->ensure()) return response()->json(['message' => 'Table indisponible.'], 422);
        try { $this->base()->where('id', $aff)->delete(); }
        catch (\Throwable $e) { return response()->json(['message' => 'Suppression impossible : '.$e->getMessage()], 422); }
        return response()->json(['message' => 'Affectation supprimée.']);
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'date' => ['nullable', 'string', 'max:20'],
            'matricule' => ['required', 'string', 'max:50'],
            'nom' => ['nullable', 'string', 'max:150'],
            'prenom' => ['nullable', 'string', 'max:150'],
            'classe' => ['nullable', 'string', 'max:50'],
            'destination_id' => ['nullable', 'string', 'max:50'],
            'immatriculation' => ['nullable', 'string', 'max:50'],
        ]);
    }
}
