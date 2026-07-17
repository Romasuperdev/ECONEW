<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Grille tarifaire cantine (table ECONOMAT : T_GRILLECANTINE).
 * Tarif par niveau / mode de paiement / nombre de mois.
 */
class GrilleCantine extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_GRILLECANTINE';
    protected $primaryKey = 'Num';
    public $timestamps = false;

    protected $fillable = [
        'ModePaiement', 'CodeNiveau', 'Montant', 'NbrMois', 'ANNEE',
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
            'id' => $this->Num,
            'mode' => $this->ModePaiement,
            'code_niveau' => $this->CodeNiveau,
            'montant' => $this->Montant !== null ? (float) $this->Montant : null,
            'nbr_mois' => $this->NbrMois,
            'annee' => $this->ANNEE,
        ];
    }
}
