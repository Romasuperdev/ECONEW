<?php

namespace App\Models;

use App\Models\Concerns\HasEtablissement;
use App\Models\Concerns\HasTracabilite;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Réception des dossiers et frais annexes.
 * Table dédiée `paiements_dossiers` (connexion economat / SQL Server).
 */
class PaiementDossier extends Model
{
    use HasEtablissement;
    use HasTracabilite;
    use SoftDeletes;

    protected $connection = 'economat';
    protected $table = 'paiements_dossiers';
    protected $keyType = 'int';
    public $incrementing = true;
    public $timestamps = true;

    protected $fillable = [
        'code_societe', 'etablissement_id', 'matricule_eleve', 'annee_scolaire_id',
        'grille_tarifaire_id', 'montant_frais_dossier', 'montant_frais_annexes',
        'montant_total', 'montant_paye', 'quantite', 'mode_paiement', 'reference_paiement',
        'numero_recu', 'statut', 'user_id', 'created_by', 'updated_by',
        'deleted_by', 'motif_annulation',
    ];

    protected $casts = [
        'montant_frais_dossier' => 'float',
        'montant_frais_annexes' => 'float',
        'montant_total' => 'float',
        'montant_paye' => 'float',
        'quantite' => 'int',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /* ---------------- Relations ---------------- */

    public function eleve()
    {
        return $this->belongsTo(Student::class, 'matricule_eleve', 'Matricule');
    }

    public function grilleTarifaire()
    {
        return $this->belongsTo(GrilleScolarite::class, 'grille_tarifaire_id', (new GrilleScolarite)->getKeyName());
    }

    public function anneeScolaire()
    {
        return $this->belongsTo(AcademicYear::class, 'annee_scolaire_id', 'CodeAnnee');
    }

    public function user()
    {
        return $this->belongsTo(RhUser::class, 'user_id');
    }

    /* ---------------- Règle métier : verrouillage 2 jours ---------------- */

    /** La transaction est-elle encore modifiable ? (<= 2 jours après création). */
    public function estModifiable(): bool
    {
        if (! $this->created_at) {
            return true;
        }
        return now()->lessThanOrEqualTo($this->created_at->copy()->addDays(2));
    }

    /* ---------------- Représentation ---------------- */

    public function reste(): float
    {
        return max(0, (float) $this->montant_total - (float) $this->montant_paye);
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->id,
            'matricule' => $this->matricule_eleve,
            'eleve' => $this->relationLoaded('eleve') && $this->eleve ? $this->eleve->full_name : null,
            'annee_scolaire_id' => $this->annee_scolaire_id,
            'grille_tarifaire_id' => $this->grille_tarifaire_id,
            'frais_dossier' => (float) $this->montant_frais_dossier,
            'frais_annexes' => (float) $this->montant_frais_annexes,
            'montant_total' => (float) $this->montant_total,
            'montant_paye' => (float) $this->montant_paye,
            'quantite' => (int) ($this->quantite ?? 1),
            'reste' => $this->reste(),
            'mode_paiement' => $this->mode_paiement,
            'reference_paiement' => $this->reference_paiement,
            'numero_recu' => $this->numero_recu,
            'statut' => $this->statut,
            'user_id' => $this->user_id,
            'verrouille' => ! $this->estModifiable(),
            'created_at' => optional($this->created_at)->format('Y-m-d H:i'),
            'updated_at' => optional($this->updated_at)->format('Y-m-d H:i'),
        ];
    }
}
