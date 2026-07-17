<?php

namespace App\Models;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Fournisseurs (table ECONOMAT dediee : ECO_FOURNISSEUR).
 * Isolation par societe (CODESOCIETE).
 */
class Supplier extends Model
{
    protected $connection = 'economat';
    protected $table = 'ECO_FOURNISSEUR';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'CODESOCIETE', 'NOM', 'CONTACT', 'TELEPHONE', 'EMAIL', 'ADRESSE', 'CREATED_AT',
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
            'name' => $this->NOM,
            'contact_name' => $this->CONTACT,
            'phone' => $this->TELEPHONE,
            'email' => $this->EMAIL,
            'address' => $this->ADRESSE,
        ];
    }
}
