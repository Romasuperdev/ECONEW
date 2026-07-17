<?php

namespace App\Support;

/**
 * Role effectif : un Super Administrateur peut "jouer" un role dans l'espace
 * etablissement via l'en-tete X-Role (impersonation). Les autres comptes
 * ne peuvent jamais changer de role de cette maniere.
 */
class RoleContext
{
    public static function override(): ?string
    {
        $user = auth()->user();
        if (! $user || ! method_exists($user, 'isSuperAdmin') || ! $user->isSuperAdmin()) {
            return null;
        }
        $header = request()?->header('X-Role');
        if ($header === null || $header === '') {
            return null;
        }
        $roles = array_keys((array) config('permissions.roles', []));
        return in_array((string) $header, $roles, true) ? (string) $header : null;
    }
}
