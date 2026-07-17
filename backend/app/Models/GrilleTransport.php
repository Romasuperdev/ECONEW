<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Grille tarifaire transport (table ECONOMAT : T_FRAISTRANSPORT).
 * NB : cette table ne possede pas de colonnes societe/annee.
 */
class GrilleTransport extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_FRAISTRANSPORT';
    protected $primaryKey = 'Num';
    public $timestamps = false;

    protected $fillable = ['ModePaiement', 'CodeNiveau', 'Montant', 'NbrMois', 'Immatriculation'];

    public function toNormalized(): array
    {
        return [
            'id' => $this->Num,
            'mode' => $this->ModePaiement,
            'code_niveau' => $this->CodeNiveau,
            'montant' => $this->Montant !== null ? (float) $this->Montant : null,
            'nbr_mois' => $this->NbrMois,
            'immatriculation' => $this->Immatriculation,
        ];
    }
}
