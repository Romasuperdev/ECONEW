<?php

namespace App\Support;

/**
 * Determine la societe courante de maniere SECURISEE :
 * - un utilisateur non super-admin ne peut voir QUE les societes qui lui sont affectees ;
 * - l'en-tete X-Societe n'est accepte que s'il fait partie de ses societes autorisees
 *   (sinon on force sa premiere societe) -> impossible d'usurper une autre societe ;
 * - repli sur ECONOMAT_CODE_SOCIETE uniquement en dernier recours.
 */
class SocieteContext
{
    public static function current(): ?string
    {
        $user = auth()->user();
        $header = request()?->header('X-Societe');

        if ($user && method_exists($user, 'isSuperAdmin') && ! $user->isSuperAdmin()) {
            $allowed = method_exists($user, 'allowedSocieteCodes') ? $user->allowedSocieteCodes() : [];

            if (! empty($allowed)) {
                if ($header !== null && $header !== '' && in_array((string) $header, $allowed, true)) {
                    return (string) $header; // choix valide parmi ses societes
                }
                return $allowed[0]; // sinon on force sa societe
            }

            // Aucune affectation resolue : on N'accepte PAS l'en-tete (anti-usurpation)
            return config('economat.code_societe');
        }

        // Super admin (console) ou contexte sans utilisateur (seed/CLI)
        if ($header !== null && $header !== '') {
            return (string) $header;
        }
        return config('economat.code_societe');
    }
}
