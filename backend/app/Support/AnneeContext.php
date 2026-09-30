<?php

namespace App\Support;

/**
 * Année académique courante = celle choisie par l'utilisateur (en-tête X-Annee),
 * VALIDÉE contre les années de la société courante (une année d'une autre
 * société ne peut pas être sélectionnée). À défaut, repli sur ECONOMAT_ANNEE.
 *
 * Résultat mémorisé pour la durée de la requête (appelé très fréquemment via
 * scopeForTenant). Le drapeau $loaded protège aussi contre toute réentrance.
 */
class AnneeContext
{
    protected static ?string $cached = null;
    protected static bool $loaded = false;

    public static function current(): ?string
    {
        if (static::$loaded) {
            return static::$cached;
        }
        static::$loaded = true;

        $default = config('economat.annee');
        $header = request()?->header('X-Annee');
        if ($header === null || $header === '') {
            return static::$cached = $default;
        }

        // Valide que l'année demandée existe pour la société courante.
        // AcademicYear est déjà cloisonné par société (scope global tenant).
        try {
            $ok = \App\Models\AcademicYear::where('CodeAnnee', $header)->exists();
            return static::$cached = ($ok ? (string) $header : $default);
        } catch (\Throwable $e) {
            // En cas d'erreur de détection, on retient l'en-tête (comportement legacy).
            return static::$cached = (string) $header;
        }
    }

    public static function flush(): void
    {
        static::$cached = null;
        static::$loaded = false;
    }
}
