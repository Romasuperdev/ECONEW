<?php

namespace App\Models;

use App\Models\Concerns\HasEtablissement;
use App\Models\Concerns\HasTracabilite;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Départ d'un élève : définitif / cantine / pension / transport.
 * Table `departs` (connexion economat / SQL Server).
 */
class Depart extends Model
{
    use HasEtablissement;
    use HasTracabilite;
    use SoftDeletes;

    protected $connection = 'economat';
    protected $table = 'departs';
    protected $keyType = 'int';
    public $incrementing = true;
    public $timestamps = true;

    public const TYPES = ['definitif', 'cantine', 'pension', 'transport'];

    protected $fillable = [
        'code_societe', 'etablissement_id', 'eleve_id', 'annee_scolaire_id',
        'type_depart', 'date_depart', 'motif', 'circuit_transport_id', 'observations',
        'previous_statut', 'user_id', 'created_by', 'updated_by', 'deleted_by', 'motif_annulation',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function eleve()
    {
        return $this->belongsTo(Student::class, 'eleve_id', 'Matricule');
    }

    public function circuitTransport()
    {
        return $this->belongsTo(Destination::class, 'circuit_transport_id', 'id');
    }

    public function anneeScolaire()
    {
        return $this->belongsTo(AcademicYear::class, 'annee_scolaire_id', 'CodeAnnee');
    }

    public function user()
    {
        return $this->belongsTo(RhUser::class, 'user_id');
    }
}
