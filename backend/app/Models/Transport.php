<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Abonnement transport par eleve (table ECONOMAT : T_TRANSPORT).
 * Montant = du, PAIEMENT = paye, Immatriculation = bus/circuit affecte.
 */
class Transport extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_TRANSPORT';
    protected $primaryKey = 'num';
    public $timestamps = false;

    protected $fillable = [
        'Matricule', 'CodeNiveau', 'DateDebut', 'DateFin', 'Immatriculation', 'Actif',
        'Mois', 'Montant', 'ANNEE', 'PAIEMENT', 'depart', 'dated', 'Motif', 'car',
        'CODEETABLISSEMENT', 'CODESOCIETE',
    ];

    public function eleve()
    {
        return $this->belongsTo(Student::class, 'Matricule', 'Matricule');
    }

    public function scopeForTenant(Builder $q): Builder
    {
        $annee = AnneeContext::current();
        $societe = SocieteContext::current();
        $etab = \App\Support\EtablissementContext::current();
        return $q->when($annee, fn ($x) => $x->where('ANNEE', $annee))
                 ->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe))
                 ->when($etab, fn ($x) => $x->where('CODEETABLISSEMENT', $etab));
    }

    public function du(): float
    {
        return (float) ($this->Montant ?? 0);
    }

    public function paye(): float
    {
        return (float) ($this->PAIEMENT ?? 0);
    }

    public function toNormalized(): array
    {
        $du = $this->du();
        $paye = $this->paye();
        return [
            'id' => $this->num,
            'matricule' => $this->Matricule,
            'student' => $this->eleve ? [
                'matricule' => $this->eleve->Matricule,
                'full_name' => $this->eleve->full_name,
            ] : null,
            'code_niveau' => $this->CodeNiveau,
            'immatriculation' => $this->Immatriculation,
            'date_debut' => $this->DateDebut,
            'date_fin' => $this->DateFin,
            'actif' => (bool) $this->Actif,
            'mois' => $this->Mois,
            'montant_annee' => $du,
            'paye' => $paye,
            'reste' => max($du - $paye, 0),
            'motif' => $this->Motif,
        ];
    }
}
