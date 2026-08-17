<?php

namespace App\Models\Concerns;

use App\Support\AnneeContext;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;

/**
 * Isole automatiquement les données par société / établissement / année.
 *
 * - Filtre global (lecture) sur les colonnes présentes parmi
 *   code_societe, etablissement_id, annee_scolaire_id.
 * - Auto-remplissage à la création à partir des contextes de requête.
 *
 * Column-tolerant : n'agit que sur les colonnes réellement présentes.
 */
trait HasEtablissement
{
    protected static function bootHasEtablissement(): void
    {
        static::addGlobalScope('etablissement', function (Builder $q) {
            $model = $q->getModel();
            $cols = $model->tenantColumns();
            $soc = SocieteContext::current();
            $etab = EtablissementContext::current();
            $annee = AnneeContext::current();
            if ($soc && in_array('code_societe', $cols, true)) {
                $q->where($model->getTable().'.code_societe', $soc);
            }
            if ($etab && in_array('etablissement_id', $cols, true)) {
                $q->where($model->getTable().'.etablissement_id', $etab);
            }
            if ($annee && in_array('annee_scolaire_id', $cols, true)) {
                $q->where($model->getTable().'.annee_scolaire_id', $annee);
            }
        });

        static::creating(function ($model) {
            $cols = $model->tenantColumns();
            if (in_array('code_societe', $cols, true) && empty($model->code_societe)) {
                $model->code_societe = SocieteContext::current();
            }
            if (in_array('etablissement_id', $cols, true) && empty($model->etablissement_id)) {
                $model->etablissement_id = EtablissementContext::current();
            }
            if (in_array('annee_scolaire_id', $cols, true) && empty($model->annee_scolaire_id)) {
                $model->annee_scolaire_id = AnneeContext::current();
            }
        });
    }

    /** Colonnes réellement présentes (mise en cache par requête). */
    public function tenantColumns(): array
    {
        try {
            return \App\Support\SchemaCache::columns($this->getTable(), $this->getConnectionName() ?: 'economat');
        } catch (\Throwable $e) {
            return ['code_societe', 'etablissement_id', 'annee_scolaire_id'];
        }
    }

    /** Filtre explicite (utile quand le scope global est désactivé). */
    public function scopeForTenant(Builder $q): Builder
    {
        $cols = $this->tenantColumns();
        return $q->when(SocieteContext::current() && in_array('code_societe', $cols, true),
                fn ($x) => $x->where('code_societe', SocieteContext::current()))
            ->when(EtablissementContext::current() && in_array('etablissement_id', $cols, true),
                fn ($x) => $x->where('etablissement_id', EtablissementContext::current()))
            ->when(AnneeContext::current() && in_array('annee_scolaire_id', $cols, true),
                fn ($x) => $x->where('annee_scolaire_id', AnneeContext::current()));
    }
}
