<?php

namespace App\Models;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Table existante ECONOMAT : T_ANNEEACADEMIQUE.
 */
class AcademicYear extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_ANNEEACADEMIQUE';
    protected $primaryKey = 'CodeAnnee';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'CodeAnnee', 'LibelleAnnee', 'Activer', 'CloturePartielle',
        'ClotureDefinitive', 'CODE', 'DEBUT', 'FIN', 'CODESOCIETE',
    ];

    public function scopeForTenant(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        return $q->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe));
    }

    public function statut(): string
    {
        if ((int) $this->ClotureDefinitive === 1) return 'cloturee';
        if ((int) $this->CloturePartielle === 1) return 'cloture_partielle';
        if ((int) $this->Activer === 1) return 'ouverte';
        return 'inactive';
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->CodeAnnee,
            'code' => $this->CodeAnnee,
            'label' => $this->LibelleAnnee,
            'start_date' => $this->DEBUT,
            'end_date' => $this->FIN,
            'is_current' => (int) $this->Activer === 1,
            'cloture_partielle' => (int) $this->CloturePartielle === 1,
            'cloture_definitive' => (int) $this->ClotureDefinitive === 1,
            'statut' => $this->statut(),
        ];
    }
}
