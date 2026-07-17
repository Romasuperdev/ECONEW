<?php

namespace App\Support;

/**
 * Année académique courante = celle choisie par l'utilisateur (en-tête X-Annee),
 * sinon la valeur par défaut du .env (ECONOMAT_ANNEE).
 * Permet de "consulter" n'importe quel exercice sans changer la config.
 */
class AnneeContext
{
    public static function current(): ?string
    {
        $header = request()?->header('X-Annee');
        if ($header !== null && $header !== '') {
            return $header;
        }
        return config('economat.annee');
    }
}
