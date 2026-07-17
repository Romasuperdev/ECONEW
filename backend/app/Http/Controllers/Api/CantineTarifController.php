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
 * Grille tarifaire de la cantine (fichier de base) : montant/mois & montant/année.
 * Table auxiliaire ECO_GRILLE_CANTINE (créée au besoin), distincte de la grille
 * par niveau utilisée pour l'encaissement.
 */
class CantineTarifController extends Controller
{
    private const TABLE = 'ECO_GRILLE_CANTINE';

    private function ensure(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                Schema::connection('economat')->create(self::TABLE, function ($t) {
                    $t->increments('id');
                    $t->string('LIBELLE', 150)->nullable();
                    $t->decimal('MONTANT_MOIS', 18, 2)->nullable();
                    $t->decimal('MONTANT_ANNEE', 18, 2)->nullable();
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
            'id' => $r->id,
            'libelle' => $r->LIBELLE,
            'montant_mois' => $r->MONTANT_MOIS !== null ? (float) $r->MONTANT_MOIS : null,
            'montant_annee' => $r->MONTANT_ANNEE !== null ? (float) $r->MONTANT_ANNEE : null,
        ];
    }

    public function index()
    {
        if (! $this->ensure()) {
            return response()->json([]);
        }
        try {
            return response()->json($this->base()->orderByDesc('id')->get()->map(fn ($r) => $this->row($r))->values());
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        try {
            $id = DB::connection('economat')->table(self::TABLE)->insertGetId([
                'LIBELLE' => $data['libelle'] ?? null,
                'MONTANT_MOIS' => $data['montant_mois'] ?? null,
                'MONTANT_ANNEE' => $data['montant_annee'] ?? null,
                'ANNEE' => AnneeContext::current(),
                'CODESOCIETE' => SocieteContext::current(),
                'CODEETABLISSEMENT' => EtablissementContext::current(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }
        UidRegistry::assign('GRILLE_CANTINE', (string) $id);
        AuditLogger::log('create', 'Grille cantine');

        return response()->json(['id' => $id] + $data, 201);
    }

    public function update(Request $request, string $tarif)
    {
        $data = $this->rules($request);
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        try {
            $this->base()->where('id', $tarif)->update([
                'LIBELLE' => $data['libelle'] ?? null,
                'MONTANT_MOIS' => $data['montant_mois'] ?? null,
                'MONTANT_ANNEE' => $data['montant_annee'] ?? null,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }

        return response()->json(['id' => $tarif] + $data);
    }

    public function destroy(string $tarif)
    {
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        try {
            $this->base()->where('id', $tarif)->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['message' => 'Tarif supprimé.']);
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'libelle' => ['nullable', 'string', 'max:150'],
            'montant_mois' => ['nullable', 'numeric', 'min:0'],
            'montant_annee' => ['nullable', 'numeric', 'min:0'],
        ]);
    }
}
