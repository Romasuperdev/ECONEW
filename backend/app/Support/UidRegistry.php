<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Registre d'UID internes : chaque enregistrement possède, en plus du code
 * saisi par l'utilisateur, un identifiant unique (UID) géré côté application.
 * Stocké dans une table auxiliaire ECO_UID (créée automatiquement au besoin).
 */
class UidRegistry
{
    private const TABLE = 'ECO_UID';

    private static function ensure(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                Schema::connection('economat')->create(self::TABLE, function ($t) {
                    $t->increments('id');
                    $t->string('ENTITE', 50);
                    $t->string('REF', 100);
                    $t->string('UID', 64);
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /** Assigne (ou récupère) l'UID interne d'un enregistrement. */
    public static function assign(string $entite, string $ref): ?string
    {
        if (! self::ensure()) {
            return null;
        }
        try {
            if ($uid = self::for($entite, $ref)) {
                return $uid;
            }
            $uid = (string) Str::uuid();
            DB::connection('economat')->table(self::TABLE)->insert([
                'ENTITE' => $entite,
                'REF' => $ref,
                'UID' => $uid,
                'CODESOCIETE' => SocieteContext::current(),
                'CODEETABLISSEMENT' => EtablissementContext::current(),
            ]);
            return $uid;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public static function for(string $entite, string $ref): ?string
    {
        if (! self::ensure()) {
            return null;
        }
        try {
            $row = DB::connection('economat')->table(self::TABLE)
                ->where('ENTITE', $entite)->where('REF', $ref)->first();
            return $row->UID ?? null;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
