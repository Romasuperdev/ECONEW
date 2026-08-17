<?php

namespace App\Models;

use App\Models\Concerns\HasEtablissement;
use App\Models\Concerns\HasTracabilite;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Affectation de l'État (paiements prévisionnels).
 * Table `affectations_etat` (connexion economat / SQL Server).
 */
class AffectationEtat extends Model
{
    use HasEtablissement;
    use HasTracabilite;
    use SoftDeletes;

    protected $connection = 'economat';
    protected $table = 'affectations_etat';
    protected $keyType = 'int';
    public $incrementing = true;
    public $timestamps = true;

    protected $fillable = [
        'code_societe', 'etablissement_id', 'eleve_id', 'annee_scolaire_id',
        'type_affectation', 'montant_prevu', 'cycle', 'filiere', 'statut_affectation',
        'user_id', 'created_by', 'updated_by', 'deleted_by', 'motif_annulation',
    ];

    protected $casts = [
        'montant_prevu' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function eleve()
    {
        return $this->belongsTo(Student::class, 'eleve_id', 'Matricule');
    }

    public function anneeScolaire()
    {
        return $this->belongsTo(AcademicYear::class, 'annee_scolaire_id', 'CodeAnnee');
    }
}
