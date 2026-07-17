<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Depenses (table ECONOMAT dediee : ECO_DEPENSE).
 * Isolation par societe (CODESOCIETE) et exercice (ANNEE).
 */
class Expense extends Model
{
    protected $connection = 'economat';
    protected $table = 'ECO_DEPENSE';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'CODESOCIETE', 'ANNEE', 'CATEGORIE_ID', 'FOURNISSEUR_ID', 'REFERENCE',
        'LIBELLE', 'MONTANT', 'DATE_DEPENSE', 'MODE_PAIEMENT', 'CODECAISSE',
        'STATUT', 'NOTES', 'CREATED_AT',
    ];

    public function category()
    {
        return $this->belongsTo(ExpenseCategory::class, 'CATEGORIE_ID', 'ID');
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'FOURNISSEUR_ID', 'ID');
    }

    public function scopeForTenant(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        $annee = AnneeContext::current();
        return $q->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe))
                 ->when($annee, fn ($x) => $x->where('ANNEE', $annee));
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->ID,
            'reference' => $this->REFERENCE,
            'label' => $this->LIBELLE,
            'amount' => $this->MONTANT !== null ? number_format((float) $this->MONTANT, 2, '.', '') : null,
            'spent_at' => $this->DATE_DEPENSE,
            'method' => $this->MODE_PAIEMENT,
            'status' => $this->STATUT,
            'notes' => $this->NOTES,
            'caisse' => $this->CODECAISSE,
            'expense_category_id' => $this->CATEGORIE_ID,
            'supplier_id' => $this->FOURNISSEUR_ID,
            'category' => $this->relationLoaded('category') && $this->category ? $this->category->toNormalized() : null,
            'supplier' => $this->relationLoaded('supplier') && $this->supplier ? $this->supplier->toNormalized() : null,
        ];
    }
}
