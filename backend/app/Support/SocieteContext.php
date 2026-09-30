<?php

namespace App\Support;

/**
 * Determine la societe courante de maniere SECURISEE :
 * - un utilisateur non super-admin ne peut voir QUE les societes qui lui sont affectees ;
 * - l'en-tete X-Societe n'est accepte que s'il fait partie de ses societes autorisees
 *   (sinon on force sa premiere societe) -> impossible d'usurper une autre societe ;
 * - repli sur ECONOMAT_CODE_SOCIETE uniquement en dernier recours.
 *
 * Le resultat est memorise pour la duree de la requete : scopeForTenant est
 * appele tres frequemment (filtre global sur chaque modele), on evite ainsi de
 * recalculer / requeter a chaque appel.
 */
class SocieteContext
{
    protected static ?string $cached = null;
    protected static bool $loaded = false;

    public static function current(): ?string
    {
        if (static::$loaded) {
            return static::$cached;
        }
        static::$loaded = true;

        $user = auth()->user();
        $header = request()?->header('X-Societe');

        if ($user && method_exists($user, 'isSuperAdmin') && ! $user->isSuperAdmin()) {
            $allowed = method_exists($user, 'allowedSocieteCodes') ? $user->allowedSocieteCodes() : [];

            if (! empty($allowed)) {
                if ($header !== null && $header !== '' && in_array((string) $header, $allowed, true)) {
                    return static::$cached = (string) $header; // choix valide parmi ses societes
                }
                return static::$cached = $allowed[0]; // sinon on force sa societe
            }

            // Aucune affectation resolue : on N'accepte PAS l'en-tete (anti-usurpation)
            return static::$cached = config('economat.code_societe');
        }

        // Super admin (console) ou contexte sans utilisateur (seed/CLI)
        if ($header !== null && $header !== '') {
            return static::$cached = (string) $header;
        }
        return static::$cached = config('economat.code_societe');
    }

    /** Réinitialise le cache (utile en tests / traitements par lot multi-société). */
    public static function flush(): void
    {
        static::$cached = null;
        static::$loaded = false;
    }
}
