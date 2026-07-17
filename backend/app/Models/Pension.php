<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Suivi pension par eleve (table ECONOMAT : T_PENSION).
 * PAIEMENT = paye cumule. Le du provient de la grille (T_GRILLEPENSION).
 * NB : T_PENSION ne possede pas de colonne CODEETABLISSEMENT.
 */
class Pension extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_PENSION';
    protected $primaryKey = 'ID';
    public $timestamps = false;

    protected $fillable = [
        'Matricule', 'DateDebut', 'ANNEE', 'PAIEMENT', 'depart', 'dated', 'Motif', 'CODESOCIETE',
    ];

    public function eleve()
    {
        return $this->belongsTo(Student::class, 'Matricule', 'Matricule');
    }

    public function scopeForTenant(Builder $q): Builder
    {
        $annee = AnneeContext::current();
        $societe = SocieteContext::current();
        return $q->when($annee, fn ($x) => $x->where('ANNEE', $annee))
                 ->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe));
    }

    public function paye(): float
    {
        return (float) ($this->PAIEMENT ?? 0);
    }

    /** Total annuel de reference : max des MONTANTTOTAL de la grille du tenant. */
    public static function dueReference(): float
    {
        try {
            return (float) (GrillePension::forTenant()->max('MONTANTTOTAL') ?? 0);
        } catch (\Throwable $e) {
            return 0.0;
        }
    }

    public function toNormalized(?float $due = null): array
    {
        $due = $due ?? static::dueReference();
        $paye = $this->paye();
        return [
            'id' => $this->ID,
            'matricule' => $this->Matricule,
            'student' => $this->eleve ? [
                'matricule' => $this->eleve->Matricule,
                'full_name' => $this->eleve->full_name,
            ] : null,
            'date_debut' => $this->DateDebut,
            'montant_annee' => $due,
            'paye' => $paye,
            'reste' => $due > 0 ? max($due - $paye, 0) : null,
            'motif' => $this->Motif,
        ];
    }
}
