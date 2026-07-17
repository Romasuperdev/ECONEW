<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Factures (table ECONOMAT dediee : ECO_FACTURE).
 * Isolation societe + etablissement + exercice.
 */
class Invoice extends Model
{
    protected $connection = 'economat';
    protected $table = 'ECO_FACTURE';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'NUMERO', 'MATRICULE', 'ANNEE', 'DATE_EMISSION', 'DATE_ECHEANCE',
        'MONTANT_TOTAL', 'MONTANT_PAYE', 'STATUT', 'NOTES',
        'CODEETABLISSEMENT', 'CODESOCIETE', 'CREATED_AT',
    ];

    public function eleve()
    {
        return $this->belongsTo(Student::class, 'MATRICULE', 'Matricule');
    }

    public function lignes()
    {
        return $this->hasMany(InvoiceItem::class, 'FACTURE_ID', 'ID');
    }

    public function scopeForTenant(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        $etab = EtablissementContext::current();
        $annee = AnneeContext::current();
        return $q->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe))
                 ->when($etab, fn ($x) => $x->where('CODEETABLISSEMENT', $etab))
                 ->when($annee, fn ($x) => $x->where('ANNEE', $annee));
    }

    public function toNormalized(): array
    {
        $total = (float) ($this->MONTANT_TOTAL ?? 0);
        $paye = (float) ($this->MONTANT_PAYE ?? 0);
        return [
            'id' => $this->ID,
            'number' => $this->NUMERO,
            'matricule' => $this->MATRICULE,
            'student' => $this->eleve ? [
                'matricule' => $this->eleve->Matricule,
                'first_name' => $this->eleve->Prenom,
                'last_name' => $this->eleve->Nom,
                'full_name' => $this->eleve->full_name,
            ] : null,
            'issue_date' => $this->DATE_EMISSION,
            'due_date' => $this->DATE_ECHEANCE,
            'total_amount' => $total,
            'paid_amount' => $paye,
            'balance' => max($total - $paye, 0),
            'status' => $this->STATUT,
            'notes' => $this->NOTES,
            'items' => $this->relationLoaded('lignes')
                ? $this->lignes->map(fn (InvoiceItem $l) => $l->toNormalized())->values()
                : [],
        ];
    }
}
