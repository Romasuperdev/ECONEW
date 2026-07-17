<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Grille / echeancier pension (table ECONOMAT : T_GRILLEPENSION).
 * MONTANTTOTAL = total annuel de reference.
 */
class GrillePension extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_GRILLEPENSION';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'DATE', 'LIBELLE', 'MONTANT', 'ANNEE', 'MONTANTTOTAL', 'NBVERS',
        'CODEETABLISSEMENT', 'CODESOCIETE',
    ];

    public function scopeForTenant(Builder $q): Builder
    {
        $annee = AnneeContext::current();
        $societe = SocieteContext::current();
        $etab = \App\Support\EtablissementContext::current();
        return $q->when($annee, fn ($x) => $x->where('ANNEE', $annee))
                 ->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe))
                 ->when($etab, fn ($x) => $x->where('CODEETABLISSEMENT', $etab));
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->ID,
            'date' => $this->DATE,
            'libelle' => $this->LIBELLE,
            'montant' => $this->MONTANT !== null ? (float) $this->MONTANT : null,
            'montant_total' => $this->MONTANTTOTAL !== null ? (float) $this->MONTANTTOTAL : null,
            'nb_versements' => $this->NBVERS,
            'annee' => $this->ANNEE,
        ];
    }
}
