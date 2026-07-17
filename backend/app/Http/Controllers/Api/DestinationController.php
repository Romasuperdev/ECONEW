<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use App\Support\UidRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Destinations de transport (table auxiliaire ECO_DESTINATION, créée au besoin).
 */
class DestinationController extends Controller
{
    private const TABLE = 'ECO_DESTINATION';

    private function ensure(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                Schema::connection('economat')->create(self::TABLE, function ($t) {
                    $t->increments('id');
                    $t->string('CODE', 50)->nullable();
                    $t->string('LIBELLE', 150);
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

    public function index()
    {
        if (! $this->ensure()) {
            return response()->json([]);
        }
        try {
            return response()->json($this->base()->orderBy('LIBELLE')->get()->map(fn ($r) => [
                'id' => $r->id, 'code' => $r->CODE, 'libelle' => $r->LIBELLE,
            ])->values());
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:50'],
            'libelle' => ['required', 'string', 'max:150'],
        ]);
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        try {
            $id = DB::connection('economat')->table(self::TABLE)->insertGetId([
                'CODE' => $data['code'] ?? null,
                'LIBELLE' => $data['libelle'],
                'CODESOCIETE' => SocieteContext::current(),
                'CODEETABLISSEMENT' => EtablissementContext::current(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }
        UidRegistry::assign('DESTINATION', (string) $id);
        AuditLogger::log('create', 'Destination '.$data['libelle']);

        return response()->json(['id' => $id, 'code' => $data['code'] ?? null, 'libelle' => $data['libelle']], 201);
    }

    public function update(Request $request, string $destination)
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:50'],
            'libelle' => ['required', 'string', 'max:150'],
        ]);
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        try {
            $this->base()->where('id', $destination)->update([
                'CODE' => $data['code'] ?? null,
                'LIBELLE' => $data['libelle'],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }

        return response()->json(['id' => $destination, 'code' => $data['code'] ?? null, 'libelle' => $data['libelle']]);
    }

    public function destroy(string $destination)
    {
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        try {
            $this->base()->where('id', $destination)->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['message' => 'Destination supprimée.']);
    }
}
