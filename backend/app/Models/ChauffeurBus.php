<?php

namespace App\Models;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Affectation chauffeur <-> bus (table ECONOMAT : T_CORCHAUFF_CAR). */
class ChauffeurBus extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_CORCHAUFF_CAR';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = ['DATE_D', 'DATE_F', 'CODE_CH', 'IMMVEH', 'CODESOCIETE'];

    public function scopeForTenant(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        return $q->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe));
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->ID,
            'code_chauffeur' => $this->CODE_CH,
            'immatriculation' => $this->IMMVEH,
            'date_debut' => $this->DATE_D,
            'date_fin' => $this->DATE_F,
        ];
    }
}
