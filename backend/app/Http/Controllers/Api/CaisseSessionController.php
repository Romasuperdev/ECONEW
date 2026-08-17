<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RhUser;
use App\Support\AnneeContext;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

/**
 * Sessions de caisse : ouverture / fermeture / état courant.
 * Table auxiliaire ECO_CAISSE_SESSION (créée au besoin).
 *
 * Un responsable peut ouvrir/fermer une caisse au nom d'un caissier
 * sélectionné : dans ce cas, c'est le mot de passe DU CAISSIER qui est exigé,
 * et la session est ouverte au nom de ce caissier (traçabilité correcte).
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

    private function loginUserId(Request $request)
    {
        return $request->user()?->getKey();
    }

    /**
     * Utilisateur cible de l'opération : le caissier sélectionné (user_id)
     * s'il est fourni, sinon l'utilisateur connecté.
     */
    private function targetUser(Request $request): ?RhUser
    {
        $uid = $request->input('user_id');
        if ($uid && (string) $uid !== (string) $this->loginUserId($request)) {
            try {
                $u = RhUser::whereKey($uid)->first();
                if ($u && ! (bool) ($u->Supprimer ?? false)) {
                    return $u;
                }
                return null;
            } catch (\Throwable $e) {
                return null;
            }
        }
        return $request->user();
    }

    private function passwordOkFor(?RhUser $u, string $pwd): bool
    {
        if (! $u || $pwd === '') { return false; }
        try {
            $hash = (string) $u->getAuthPassword();
            if ($hash === '') { return false; }
            return Hash::check($pwd, $hash);
        } catch (\Throwable $e) { return false; }
    }

    private function userCaisseFor($userId): ?string
    {
        try {
            if ($userId && Schema::connection('economat')->hasTable('ECO_USER_CAISSE')) {
                return DB::connection('economat')->table('ECO_USER_CAISSE')
                    ->where('USER_ID', $userId)->value('CODECAISSE');
            }
        } catch (\Throwable $e) {}
        return null;
    }

    private function openRowByUser($userId)
    {
        try {
            return DB::connection('economat')->table(self::TABLE)
                ->where('USER_ID', $userId)->where('STATUT', 'open')
                ->orderByDesc('id')->first();
        } catch (\Throwable $e) { return null; }
    }

    private function openRowByCaisse(?string $caisse)
    {
        if (! $caisse) { return null; }
        try {
            $etab = EtablissementContext::current();
            return DB::connection('economat')->table(self::TABLE)
                ->where('CODECAISSE', $caisse)->where('STATUT', 'open')
                ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
                ->orderByDesc('id')->first();
        } catch (\Throwable $e) { return null; }
    }

    private function userName($userId): ?string
    {
        try { return RhUser::whereKey($userId)->first()?->name; }
        catch (\Throwable $e) { return null; }
    }

    public function current(Request $request)
    {
        $this->ensure();
        // État d'une caisse précise (si demandé), sinon celle de l'utilisateur connecté.
        $caisse = $request->query('caisse_code');
        $row = $caisse ? $this->openRowByCaisse($caisse) : $this->openRowByUser($this->loginUserId($request));
        $affectee = $this->userCaisseFor($this->loginUserId($request));

        return response()->json([
            'user' => $row ? $this->userName($row->USER_ID) : $request->user()?->name,
            'caisse_code' => $row->CODECAISSE ?? $affectee,
            'open' => (bool) $row,
            'session' => $row ? [
                'id' => $row->id, 'caisse_code' => $row->CODECAISSE,
                'user' => $this->userName($row->USER_ID),
                'date_ouverture' => $row->DATE_OUVERTURE,
            ] : null,
        ]);
    }

    public function open(Request $request)
    {
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }

        $target = $this->targetUser($request);
        if (! $target) {
            return response()->json(['message' => 'Caissier introuvable.'], 422);
        }
        if (! $this->passwordOkFor($target, (string) $request->input('password'))) {
            return response()->json(['message' => 'Mot de passe incorrect.'], 422);
        }

        // Caisse choisie explicitement, sinon celle affectée au caissier cible.
        $caisse = $request->input('caisse_code') ?: $this->userCaisseFor($target->getKey());
        if (! $caisse) {
            return response()->json(['message' => "Aucune caisse sélectionnée / affectée. Choisissez une caisse ou voir Configuration → Affectation Caisse."], 422);
        }
        if ($this->openRowByCaisse($caisse)) {
            return response()->json(['message' => 'Cette caisse est déjà ouverte.'], 422);
        }
        if ($this->openRowByUser($target->getKey())) {
            return response()->json(['message' => 'Ce caissier a déjà une caisse ouverte.'], 422);
        }

        try {
            $id = DB::connection('economat')->table(self::TABLE)->insertGetId([
                'CODECAISSE' => $caisse, 'USER_ID' => $target->getKey(),
                'DATE_OUVERTURE' => now(), 'STATUT' => 'open',
                'ANNEE' => AnneeContext::current(),
                'CODESOCIETE' => SocieteContext::current(), 'CODEETABLISSEMENT' => EtablissementContext::current(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Ouverture impossible : '.$e->getMessage()], 422);
        }
        AuditLogger::log('create', "Ouverture caisse {$caisse} (caissier {$target->name})");

        return response()->json(['message' => 'Caisse ouverte.', 'id' => $id, 'caisse_code' => $caisse], 201);
    }

    public function close(Request $request)
    {
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }

        // Session à fermer : par caisse (si fournie), sinon celle de l'utilisateur connecté.
        $caisse = $request->input('caisse_code');
        $row = $caisse ? $this->openRowByCaisse($caisse) : $this->openRowByUser($this->loginUserId($request));
        if (! $row) {
            return response()->json(['message' => 'Aucune caisse ouverte.'], 422);
        }

        // Mot de passe attendu = celui du caissier propriétaire de la session.
        $owner = RhUser::whereKey($row->USER_ID)->first() ?: $request->user();
        if (! $this->passwordOkFor($owner, (string) $request->input('password'))) {
            return response()->json(['message' => 'Mot de passe incorrect.'], 422);
        }

        try {
            DB::connection('economat')->table(self::TABLE)->where('id', $row->id)
                ->update(['DATE_FERMETURE' => now(), 'STATUT' => 'closed']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Fermeture impossible : '.$e->getMessage()], 422);
        }
        AuditLogger::log('update', "Fermeture caisse {$row->CODECAISSE} (caissier {$owner?->name})");

        return response()->json(['message' => 'Caisse fermée.']);
    }
}
