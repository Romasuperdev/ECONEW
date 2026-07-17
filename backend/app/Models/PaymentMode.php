<?php

namespace App\Models;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Modalités de paiement (table ECONOMAT : ECO_MODE_PAIEMENT). */
class PaymentMode extends Model
{
    protected $connection = 'economat';
    protected $table = 'ECO_MODE_PAIEMENT';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = ['LIBELLE', 'CODESOCIETE', 'CODEETABLISSEMENT', 'ACTIF', 'CREATED_AT'];

    public function scopeForTenant(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        return $q->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe));
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->ID,
            'name' => $this->LIBELLE,
            'active' => (bool) $this->ACTIF,
        ];
    }
}
