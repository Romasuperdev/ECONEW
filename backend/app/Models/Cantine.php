<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Inscription / suivi cantine par eleve (table ECONOMAT : T_CANTINE).
 * MontantAnnee = du, PAIEMENT = paye cumule, reste = du - paye.
 */
class Cantine extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_CANTINE';
    protected $primaryKey = 'Num';
    public $timestamps = false;

    protected $fillable = [
        'Matricule', 'CodeNiveau', 'DateDebut', 'DateFin', 'Actif', 'NbrMois',
        'Montant', 'ANNEE', 'PAIEMENT', 'depart', 'dated', 'Motif', 'Statut',
        'MontantAnnee', 'NbreVersement', 'MontantPeriode', 'GrilleTarifaire',
        'MontantInscription', 'CODEETABLISSEMENT', 'CODESOCIETE',
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
        return (float) ($this->MontantAnnee ?? $this->Montant ?? 0);
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
            'id' => $this->Num,
            'matricule' => $this->Matricule,
            'student' => $this->eleve ? [
                'matricule' => $this->eleve->Matricule,
                'full_name' => $this->eleve->full_name,
            ] : null,
            'code_niveau' => $this->CodeNiveau,
            'date_debut' => $this->DateDebut,
            'date_fin' => $this->DateFin,
            'actif' => (bool) $this->Actif,
            'nbr_mois' => $this->NbrMois,
            'montant_annee' => $du,
            'paye' => $paye,
            'reste' => max($du - $paye, 0),
            'nbre_versement' => $this->NbreVersement,
            'grille_tarifaire' => $this->GrilleTarifaire,
            'montant_inscription' => $this->MontantInscription !== null ? (float) $this->MontantInscription : null,
            'statut' => $this->Statut,
        ];
    }
}
