<?php

namespace App\Support;

use App\Models\School;

/**
 * Determine l'etablissement (school_id) du contexte courant.
 * - Utilisateur avec school_id -> son ecole (vrai multi-tenant).
 * - Utilisateur sans school_id (ex. compte RH_USER) -> etablissement par defaut.
 *   L'etablissement par defaut est cree automatiquement s'il n'existe aucune ecole.
 */
class Tenant
{
    protected static ?int $defaultSchoolId = null;

    public static function schoolId(): ?int
    {
        $user = auth()->user();

        if ($user && ! empty($user->school_id)) {
            return $user->school_id;
        }

        if (static::$defaultSchoolId !== null) {
            return static::$defaultSchoolId;
        }

        $id = School::query()->orderBy('id')->value('id');

        if (! $id) {
            $id = School::create([
                'name' => 'Établissement principal',
                'code' => 'PRINCIPAL',
                'currency' => 'XOF',
                'status' => 'active',
                'country' => "Cote d'Ivoire",
                'language' => 'fr',
            ])->id;
        }

        return static::$defaultSchoolId = $id;
    }
}
