<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AnneeContext;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Sessions de caisse : ouverture / fermeture / état courant.
 * Table auxiliaire ECO_CAISSE_SESSION (créée au besoin).
 */
class CaisseSessionController extends Controller
{
    private const TABLE = 'ECO_CAISSE_SESSION';

    private function ensure(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                Schema::connection('economat')->create(self::TABLE, function ($t) {
                    $t->increments('id');
                    $t->string('CODECAISSE', 50)->nullable();
                    $t->string('USER_ID', 50)->nullable();
                    $t->dateTime('DATE_OUVERTURE')->nullable();
                    $t->dateTime('DATE_FERMETURE')->nullable();
                    $t->string('STATUT', 20)->default('open');
                    $t->string('ANNEE', 20)->nullable();
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) { return false; }
    }

    private function userId(Request $request)
    {
        return $request->user()?->getKey();
    }

    private function userCaisse(Request $request): ?string
    {
        try {
            if (Schema::connection('economat')->hasTable('ECO_USER_CAISSE')) {
                return DB::connection('economat')->table('ECO_USER_CAISSE')
                    ->where('USER_ID', $this->userId($request))->value('CODECAISSE');
            }
        } catch (\Throwable $e) {}
        return null;
    }

    private function openRow(Request $request)
    {
        try {
            return DB::connection('economat')->table(self::TABLE)
                ->where('USER_ID', $this->userId($request))
                ->where('STATUT', 'open')->orderByDesc('id')->first();
        } catch (\Throwable $e) { return null; }
    }

    public function current(Request $request)
    {
        $this->ensure();
        $caisse = $this->userCaisse($request);
        $row = $this->openRow($request);
        return response()->json([
            'caisse_code' => $caisse,
            'open' => (bool) $row,
            'session' => $row ? [
                'id' => $row->id, 'caisse_code' => $row->CODECAISSE,
                'date_ouverture' => $row->DATE_OUVERTURE,
            ] : null,
        ]);
    }

    public function open(Request $request)
    {
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        $caisse = $this->userCaisse($request);
        if (! $caisse) {
            return response()->json(['message' => "Aucune caisse n'est affectée à votre compte. Voir Configuration → Affectation Caisse."], 422);
        }
        if ($this->openRow($request)) {
            return response()->json(['message' => 'Une caisse est déjà ouverte.'], 422);
        }
        try {
            $id = DB::connection('economat')->table(self::TABLE)->insertGetId([
                'CODECAISSE' => $caisse, 'USER_ID' => $this->userId($request),
                'DATE_OUVERTURE' => now(), 'STATUT' => 'open',
                'ANNEE' => AnneeContext::current(),
                'CODESOCIETE' => SocieteContext::current(), 'CODEETABLISSEMENT' => EtablissementContext::current(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Ouverture impossible : '.$e->getMessage()], 422);
        }
        AuditLogger::log('create', "Ouverture caisse {$caisse}");
        return response()->json(['message' => 'Caisse ouverte.', 'id' => $id, 'caisse_code' => $caisse], 201);
    }

    public function close(Request $request)
    {
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        $row = $this->openRow($request);
        if (! $row) {
            return response()->json(['message' => 'Aucune caisse ouverte.'], 422);
        }
        try {
            DB::connection('economat')->table(self::TABLE)->where('id', $row->id)
                ->update(['DATE_FERMETURE' => now(), 'STATUT' => 'closed']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Fermeture impossible : '.$e->getMessage()], 422);
        }
        AuditLogger::log('update', "Fermeture caisse {$row->CODECAISSE}");
        return response()->json(['message' => 'Caisse fermée.']);
    }
}
