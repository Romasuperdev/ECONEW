<?php

namespace App\Models;

use App\Models\Concerns\IsTenantScoped;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Mappe sur la table existante ECONOMAT : T_NIVEAU.
 * Colonnes : Num, CodeNiveau, LibelleNiveau, CodeCycle, CodeFiliere,
 *            NiveauExamen, ANNEE, Ordre, CODEETABLISSEMENT, CODESOCIETE.
 */
class Level extends Model
{
    use IsTenantScoped;

    protected $connection = 'economat';
    protected $table = 'T_NIVEAU';
    protected $primaryKey = 'Num';
    public $timestamps = false;

    protected $fillable = [
        'CodeNiveau', 'LibelleNiveau', 'CodeCycle', 'CodeFiliere',
        'NiveauExamen', 'ANNEE', 'Ordre', 'CODEETABLISSEMENT', 'CODESOCIETE',
    ];

    public function cycle()
    {
        return $this->belongsTo(Cycle::class, 'CodeCycle', 'CodeCycle');
    }

    public function classes()
    {
        return $this->hasMany(SchoolClass::class, 'CodN', 'CodeNiveau');
    }

    public function scopeForTenant(Builder $q): Builder
    {
        $etab = \App\Support\EtablissementContext::current();
        $annee = AnneeContext::current();
        $societe = SocieteContext::current();
        return $q->when($etab, fn ($x) => $x->where('CODEETABLISSEMENT', $etab))
                 ->when($annee, fn ($x) => $x->where('ANNEE', $annee))
                 ->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe));
    }

    /**
     * Liste tolérante. Repli progressif si le filtre strict est vide :
     * 1) tenant complet (étab + année + société)
     * 2) société uniquement (préserve l'isolation entre sociétés)
     */
    public static function available()
    {
        // Isolation STRICTE : uniquement le tenant courant, aucun repli global.
        $base = fn () => static::with('cycle')->withCount('classes')
            ->orderBy('Ordre')->orderBy('LibelleNiveau');
        try {
            return $base()->forTenant()->get();
        } catch (\Throwable $e) {
            return collect();
        }
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->Num,
            'code' => $this->CodeNiveau,
            'name' => $this->LibelleNiveau,
            'cycle_code' => $this->CodeCycle,
            'is_exam' => (bool) $this->NiveauExamen,
            'position' => $this->Ordre,
            'classes_count' => $this->classes_count ?? null,
        ];
    }
}
