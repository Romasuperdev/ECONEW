<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\RhUser;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Console : affectations Société ↔ Établissement (T_ETABLISSEMENT.CODESOCIETE)
 * et Établissement ↔ Utilisateur (table auxiliaire ECO_USER_ETAB).
 */
class EtablissementAffectationController extends Controller
{
    private const UETAB = 'ECO_USER_ETAB';

    private function ensureUEtab(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::UETAB)) {
                Schema::connection('economat')->create(self::UETAB, function ($t) {
                    $t->increments('id');
                    $t->string('USER_ID', 50);
                    $t->string('CODEETABLISSEMENT', 50);
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->dateTime('CREATED_AT')->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /* -------- Société ↔ Établissement -------- */

    public function etablissements(Request $request)
    {
        try {
            $rows = DB::connection('economat')->table('T_ETABLISSEMENT')
                ->when($request->societe, fn ($q, $s) => $q->where('CODESOCIETE', $s))
                ->get();
            return response()->json($rows->map(fn ($r) => [
                'id' => $r->Num,
                'code' => $r->CODE,
                'name' => $r->RAISONSOCIALE,
                'code_societe' => $r->CODESOCIETE,
                'ville' => $r->ADRESSE ?? null,
            ])->values());
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Lecture impossible : '.$e->getMessage()], 422);
        }
    }

    public function affecterSociete(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],           // code établissement
            'code_societe' => ['required', 'string', 'max:50'],   // société cible
        ]);
        try {
            $n = DB::connection('economat')->table('T_ETABLISSEMENT')
                ->where('CODE', $data['code'])->update(['CODESOCIETE' => $data['code_societe']]);
            if ($n === 0) {
                return response()->json(['message' => 'Établissement introuvable.'], 404);
            }
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Affectation impossible : '.$e->getMessage()], 422);
        }
        AuditLogger::log('update', "Établissement {$data['code']} → société {$data['code_societe']}");
        return response()->json(['message' => 'Établissement affecté à la société.']);
    }

    /* -------- Établissement ↔ Utilisateur -------- */

    public function etabUsers(Request $request)
    {
        if (! $this->ensureUEtab()) {
            return response()->json([]);
        }
        try {
            $rows = DB::connection('economat')->table(self::UETAB)
                ->when($request->code_etablissement, fn ($q, $c) => $q->where('CODEETABLISSEMENT', $c))
                ->get();
            $ids = $rows->pluck('USER_ID')->unique()->all();
            $users = empty($ids) ? collect() : RhUser::whereIn('Id', $ids)->get()->keyBy('Id');
            return response()->json($rows->map(function ($r) use ($users) {
                $u = $users->get($r->USER_ID);
                return [
                    'id' => $r->id,
                    'user_id' => $r->USER_ID,
                    'code_etablissement' => $r->CODEETABLISSEMENT,
                    'name' => $u?->name,
                    'login' => $u?->Login,
                    'email' => $u?->Email,
                ];
            })->values());
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function affecterUser(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required'],
            'code_etablissement' => ['required', 'string', 'max:50'],
        ]);
        if (! $this->ensureUEtab()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        try {
            // société de l'établissement
            $socEtab = DB::connection('economat')->table('T_ETABLISSEMENT')
                ->where('CODE', $data['code_etablissement'])->value('CODESOCIETE');
            $exists = DB::connection('economat')->table(self::UETAB)
                ->where('USER_ID', $data['user_id'])
                ->where('CODEETABLISSEMENT', $data['code_etablissement'])->exists();
            if ($exists) {
                return response()->json(['message' => 'Affectation déjà existante.']);
            }
            DB::connection('economat')->table(self::UETAB)->insert([
                'USER_ID' => $data['user_id'],
                'CODEETABLISSEMENT' => $data['code_etablissement'],
                'CODESOCIETE' => $socEtab,
                'CREATED_AT' => now(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Affectation impossible : '.$e->getMessage()], 422);
        }
        AuditLogger::log('create', "Utilisateur #{$data['user_id']} → établissement {$data['code_etablissement']}");
        return response()->json(['message' => 'Utilisateur affecté à l\'établissement.'], 201);
    }

    public function unassignUser(string $affectation)
    {
        if (! $this->ensureUEtab()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        try {
            DB::connection('economat')->table(self::UETAB)->where('id', $affectation)->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible.'], 422);
        }
        return response()->json(['message' => 'Affectation retirée.']);
    }
}
