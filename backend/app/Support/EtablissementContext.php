<?php

namespace App\Support;

use App\Models\Etablissement;

/**
 * Etablissement courant, de maniere SECURISEE :
 * - limite aux etablissements de la societe courante ;
 * - l'en-tete X-Etablissement n'est accepte que s'il appartient a cette societe ;
 * - sinon repli sur le premier etablissement de la societe, puis config.
 */
class EtablissementContext
{
    protected static ?array $codesCache = null;
    protected static bool $codesLoaded = false;

    /** Codes des etablissements de la societe courante. */
    public static function allowedCodes(): array
    {
        if (static::$codesLoaded) {
            return static::$codesCache ?? [];
        }
        static::$codesLoaded = true;

        try {
            $codeCol = Etablissement::codeColumn();
            if (! $codeCol) {
                return static::$codesCache = [];
            }
            $codes = Etablissement::available()->pluck($codeCol)
                ->filter(fn ($v) => $v !== null && $v !== '')
                ->map(fn ($v) => (string) $v)->values()->all();
            return static::$codesCache = $codes;
        } catch (\Throwable $e) {
            return static::$codesCache = [];
        }
    }

    public static function current(): ?string
    {
        $header = request()?->header('X-Etablissement');
        $allowed = static::allowedCodes();

        if ($header !== null && $header !== '') {
            if (empty($allowed) || in_array((string) $header, $allowed, true)) {
                return (string) $header;
            }
            return $allowed[0];
        }

        if (! empty($allowed)) {
            return $allowed[0];
        }

        return config('economat.code_etab');
    }
}
