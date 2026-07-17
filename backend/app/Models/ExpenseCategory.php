<?php

namespace App\Models;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Categories de depenses (table ECONOMAT dediee : ECO_CATEGORIE_DEPENSE).
 * Isolation par societe (CODESOCIETE).
 */
class ExpenseCategory extends Model
{
    protected $connection = 'economat';
    protected $table = 'ECO_CATEGORIE_DEPENSE';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = ['CODESOCIETE', 'LIBELLE', 'CREATED_AT'];

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
        ];
    }
}
