<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Table existante dbmasterbacou : US_SOCIETE (societes / etablissements).
 */
class Societe extends Model
{
    protected $connection = 'master';
    protected $table = 'US_SOCIETE';
    protected $primaryKey = 'NUMAUTO';
    public $incrementing = true;
    public $timestamps = false;

    protected $guarded = [];

    public function utilisateurs()
    {
        return $this->belongsToMany(RhUser::class, 'societe_utilisateur', 'societe_id', 'user_id', 'CODESOCIETE', 'Id');
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->NUMAUTO,
            'code' => $this->CODESOCIETE,
            'name' => $this->NOMSOCIETE,
            'ville' => $this->VILLESOCIETE,
            'pays' => $this->PAYSSOCIETE,
            'email' => $this->EMAILSOCIETE,
            'telephone' => $this->TELSOCIETE,
            'activite' => $this->ACTIVITESOCIETE,
            'base' => $this->NOMBASE,
            'logo' => $this->LOGO,
            'nb_etab' => $this->NB_ETAB,
            'nb_user' => $this->NB_USER,
            'representant' => $this->NOMPRENOMREPRESENTANT ?? $this->REPRESENTANT,
        ];
    }
}
