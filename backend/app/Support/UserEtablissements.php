<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Affectations Utilisateur ↔ Établissement(s).
 *
 * Règle métier : un utilisateur peut être affecté à un ou plusieurs
 * établissements, qui doivent TOUS appartenir à la même société
 * (T_ETABLISSEMENT.CODESOCIETE).
 *
 * Stockage :
 *  - ECONOMAT.ECO_USER_ETAB (USER_ID, CODEETABLISSEMENT, CODESOCIETE) ;
 *  - dbmasterbacou.societe_utilisateur (société de l'utilisateur).
 */
class UserEtablissements
{
    public const TABLE = 'ECO_USER_ETAB';

    public static function ensureTable(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                Schema::connection('economat')->create(self::TABLE, function ($t) {
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

    /** Codes des établissements affectés à l'utilisateur. */
    public static function codesFor($userId): array
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                return [];
            }
            return DB::connection('economat')->table(self::TABLE)
                ->where('USER_ID', (string) $userId)
                ->pluck('CODEETABLISSEMENT')->map(fn ($c) => (string) $c)->unique()->values()->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** Affectations de plusieurs utilisateurs : [userId => [codes]]. */
    public static function codesForMany(array $userIds): array
    {
        if (empty($userIds)) {
            return [];
        }
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                return [];
            }
            return DB::connection('economat')->table(self::TABLE)
                ->whereIn('USER_ID', array_map('strval', $userIds))->get()
                ->groupBy('USER_ID')
                ->map(fn ($rows) => $rows->pluck('CODEETABLISSEMENT')->map(fn ($c) => (string) $c)->unique()->values()->all())
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** [code établissement => code société] d'après T_ETABLISSEMENT. */
    public static function societesOf(array $codes): array
    {
        if (empty($codes)) {
            return [];
        }
        return DB::connection('economat')->table('T_ETABLISSEMENT')
            ->whereIn('CODE', $codes)->pluck('CODESOCIETE', 'CODE')
            ->map(fn ($s) => $s === null ? null : (string) $s)->all();
    }

    /**
     * Vérifie que les établissements existent et appartiennent tous à la même
     * société (celle attendue si fournie). Retourne le code de cette société.
     *
     * @throws ValidationException
     */
    public static function assertSameSociete(array $codes, ?string $expected = null): ?string
    {
        $codes = array_values(array_unique(array_filter(array_map('strval', $codes), fn ($c) => $c !== '')));
        if (empty($codes)) {
            return $expected;
        }

        $map = static::societesOf($codes);
        $missing = array_diff($codes, array_keys($map));
        if (! empty($missing)) {
            throw ValidationException::withMessages([
                'etablissements' => 'Établissement(s) introuvable(s) : '.implode(', ', $missing).'.',
            ]);
        }

        $societes = array_values(array_unique(array_values($map)));
        if (in_array(null, $societes, true)) {
            $sans = array_keys(array_filter($map, fn ($s) => $s === null));
            throw ValidationException::withMessages([
                'etablissements' => 'Établissement(s) sans société : '.implode(', ', $sans).'. Rattachez-les d\'abord à une société.',
            ]);
        }
        if (count($societes) > 1) {
            throw ValidationException::withMessages([
                'etablissements' => 'Les établissements d\'un utilisateur doivent tous appartenir à la même société.',
            ]);
        }
        if ($expected !== null && $expected !== '' && $societes[0] !== $expected) {
            throw ValidationException::withMessages([
                'etablissements' => "Ces établissements n'appartiennent pas à la société {$expected}.",
            ]);
        }

        return $societes[0];
    }

    /**
     * Remplace les affectations de l'utilisateur par la société + les
     * établissements donnés (tous validés comme appartenant à cette société).
     */
    public static function sync($userId, ?string $societe, array $codes): void
    {
        $codes = array_values(array_unique(array_filter(array_map('strval', $codes), fn ($c) => $c !== '')));
        $societe = static::assertSameSociete($codes, $societe ?: null);

        static::ensureTable();
        DB::connection('economat')->transaction(function () use ($userId, $societe, $codes) {
            $t = DB::connection('economat')->table(self::TABLE);
            $t->where('USER_ID', (string) $userId)->delete();
            foreach ($codes as $code) {
                DB::connection('economat')->table(self::TABLE)->insert([
                    'USER_ID' => (string) $userId,
                    'CODEETABLISSEMENT' => $code,
                    'CODESOCIETE' => $societe,
                    'CREATED_AT' => now(),
                ]);
            }
        });

        static::syncSociete($userId, $societe);
    }

    /** Société unique de l'utilisateur dans societe_utilisateur (conserve EstAdminSociete). */
    protected static function syncSociete($userId, ?string $societe): void
    {
        try {
            if (! Schema::connection('master')->hasTable('societe_utilisateur')) {
                return;
            }
            $db = DB::connection('master');
            // Le super admin garde ses sociétés (vue plateforme).
            if ((bool) $db->table('RH_USER')->where('Id', $userId)->value('SuperAdmin')) {
                return;
            }
            $db->table('societe_utilisateur')->where('user_id', $userId)
                ->when($societe, fn ($q) => $q->where('societe_id', '<>', $societe))
                ->delete();
            if (! $societe) {
                return;
            }
            $exists = $db->table('societe_utilisateur')
                ->where('user_id', $userId)->where('societe_id', $societe)->exists();
            if (! $exists) {
                $db->table('societe_utilisateur')->insert([
                    'user_id' => $userId,
                    'societe_id' => $societe,
                    'societe_numauto' => $db->table('US_SOCIETE')->where('CODESOCIETE', $societe)->value('NUMAUTO'),
                    'EstAdminSociete' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
        }
    }
}
