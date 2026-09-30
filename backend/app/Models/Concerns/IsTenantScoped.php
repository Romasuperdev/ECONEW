<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Cloisonnement multi-tenant AUTOMATIQUE (cf. schéma « shared database, shared schema »).
 *
 * Applique le filtre société / établissement / année à TOUTES les requêtes du
 * modèle, en réutilisant sa méthode scopeForTenant() — impossible d'oublier le
 * filtre dans un contrôleur, une relation ou une agrégation.
 *
 * Principe « fail-closed » : pour un utilisateur non super-admin, le contexte
 * société est toujours résolu (sa société ou le repli config), donc le filtre
 * s'applique systématiquement — jamais de lecture globale.
 *
 * Le super administrateur (console plateforme) n'est PAS filtré : il pilote
 * l'ensemble des sociétés et pose ses propres filtres explicites.
 */
trait IsTenantScoped
{
    protected static function bootIsTenantScoped(): void
    {
        static::addGlobalScope('tenant', function (Builder $q) {
            // Bypass console : le super administrateur voit toutes les sociétés.
            try {
                $u = auth()->user();
                if ($u && method_exists($u, 'isSuperAdmin') && $u->isSuperAdmin()) {
                    return;
                }
            } catch (\Throwable $e) {
                // Contexte hors requête (seed / CLI) : on n'applique pas de bypass,
                // le filtre normal s'applique via scopeForTenant ci-dessous.
            }

            $model = $q->getModel();
            if (method_exists($model, 'scopeForTenant')) {
                $model->scopeForTenant($q);
            }
        });
    }

    /**
     * Échappatoire explicite : requête SANS le filtre tenant (usage console /
     * super-admin uniquement). À n'utiliser qu'en connaissance de cause.
     */
    public static function withoutTenant(): Builder
    {
        return static::withoutGlobalScope('tenant');
    }
}
