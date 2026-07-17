<?php

namespace App\Models;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Bus / vehicules de transport (table ECONOMAT : T_CARSTRANSPORT). */
class Bus extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_CARSTRANSPORT';
    protected $primaryKey = 'Num';
    public $timestamps = false;

    protected $fillable = [
        'immatriculation', 'Marque', 'Conducteur', 'Itineraire', 'NbrPlace',
        'NbrPlaceOccup', 'Destination', 'CARBURANT', 'COULEUR', 'DATE_IMM',
        'MODELE', 'NUM_SERIE', 'CODESOCIETE',
    ];

    public function scopeForTenant(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        return $q->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe));
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->Num,
            'immatriculation' => $this->immatriculation,
            'marque' => $this->Marque,
            'modele' => $this->MODELE,
            'conducteur' => $this->Conducteur,
            'itineraire' => $this->Itineraire,
            'destination' => $this->Destination,
            'nb_places' => $this->NbrPlace,
            'nb_places_occupees' => $this->NbrPlaceOccup,
            'couleur' => $this->COULEUR,
            'carburant' => $this->CARBURANT,
            'num_serie' => $this->NUM_SERIE,
            'date_immat' => $this->DATE_IMM,
        ];
    }
}
