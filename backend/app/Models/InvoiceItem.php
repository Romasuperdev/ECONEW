<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Lignes de facture (table ECONOMAT dediee : ECO_FACTURE_LIGNE). */
class InvoiceItem extends Model
{
    protected $connection = 'economat';
    protected $table = 'ECO_FACTURE_LIGNE';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = ['FACTURE_ID', 'LIBELLE', 'MONTANT', 'CODE_CATEGORIE', 'CREATED_AT'];

    public function toNormalized(): array
    {
        return [
            'id' => $this->ID,
            'label' => $this->LIBELLE,
            'amount' => (float) ($this->MONTANT ?? 0),
            'code_categorie' => $this->CODE_CATEGORIE,
        ];
    }
}
