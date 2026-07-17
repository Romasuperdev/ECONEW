<?php

namespace App\Models;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Chauffeurs (table ECONOMAT : T_CHAUFFEUR). */
class Chauffeur extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_CHAUFFEUR';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'NOM', 'PRENOM', 'DATE_N_CH', 'ADR_CH', 'TEL_CH', 'NUM_CH', 'NUM_PERMIS', 'CODESOCIETE',
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
            'nom' => $this->NOM,
            'prenom' => $this->PRENOM,
            'full_name' => trim(($this->PRENOM ?? '').' '.($this->NOM ?? '')),
            'date_naissance' => $this->DATE_N_CH,
            'adresse' => $this->ADR_CH,
            'telephone' => $this->TEL_CH,
            'code' => $this->NUM_CH,
            'num_permis' => $this->NUM_PERMIS,
        ];
    }
}
