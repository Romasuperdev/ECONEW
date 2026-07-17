<?php

namespace App\Models\Concerns;

use App\Models\School;
use App\Support\Tenant;
use Illuminate\Database\Eloquent\Builder;

/**
 * Isolation multi-tenant : filtrage automatique par school_id, et
 * attribution automatique du school_id a la creation (etablissement
 * de l'utilisateur, ou etablissement par defaut si le compte n'en a pas).
 */
trait BelongsToSchool
{
    protected static function bootBelongsToSchool(): void
    {
        static::addGlobalScope('school', function (Builder $builder) {
            $user = auth()->user();
            if ($user && ! $user->isSuperAdmin()) {
                $schoolId = Tenant::schoolId();
                if ($schoolId) {
                    $builder->where($builder->getModel()->getTable().'.school_id', $schoolId);
                }
            }
        });

        static::creating(function ($model) {
            if (empty($model->school_id)) {
                $model->school_id = Tenant::schoolId();
            }
        });
    }

    public function school()
    {
        return $this->belongsTo(School::class);
    }
}
