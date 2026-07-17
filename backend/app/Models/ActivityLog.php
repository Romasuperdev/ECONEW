<?php

namespace App\Models;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Journal d'activite (table ECONOMAT : ECO_AUDIT). */
class ActivityLog extends Model
{
    protected $connection = 'economat';
    protected $table = 'ECO_AUDIT';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'USER_ID', 'USER_LOGIN', 'ACTION', 'DESCRIPTION',
        'CODESOCIETE', 'CODEETABLISSEMENT', 'IP', 'CREATED_AT',
    ];

    public function scopeForTenant(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        return $q->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe));
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->ID,
            'user' => $this->USER_LOGIN,
            'user_id' => $this->USER_ID,
            'action' => $this->ACTION,
            'description' => $this->DESCRIPTION,
            'date' => $this->CREATED_AT,
        ];
    }
}
