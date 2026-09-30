<?php

namespace App\Models;

use App\Models\Concerns\IsTenantScoped;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Mappe sur la table existante ECONOMAT : T_CYCLE.
 * Colonnes réelles : Num, CodeCycle, LibelleCycle, CodeEtab, Primaire.
 * (Cette table ne porte ni CODESOCIETE ni ANNEE.)
 */
class Cycle extends Model
{
    use IsTenantScoped;

    protected $connection = 'economat';
    protected $table = 'T_CYCLE';
    protected $primaryKey = 'Num';
    public $timestamps = false;

    protected $fillable = ['CodeCycle', 'LibelleCycle', 'CodeEtab', 'Primaire'];

    public function levels()
    {
        return $this->hasMany(Level::class, 'CodeCycle', 'CodeCycle');
    }

    // Filtre etablissement (CodeEtab)
    public function scopeForTenant(Builder $q): Builder
    {
        $etab = \App\Support\EtablissementContext::current();
        return $q->when($etab, fn ($x) => $x->where('CodeEtab', $etab));
    }

    /**
     * Liste tolérante : cycles de l'établissement, avec repli sur tous
     * les cycles si le filtre établissement ne retourne rien
     * (données héritées où CodeEtab est vide).
     */
    public static function available()
    {
        // Isolation STRICTE : uniquement le tenant courant, aucun repli global.
        try {
            return static::forTenant()->withCount('levels')->orderBy('LibelleCycle')->get();
        } catch (\Throwable $e) {
            return collect();
        }
    }

    // Representation normalisee pour le frontend
    public function toNormalized(): array
    {
        return [
            'id' => $this->Num,
            'code' => $this->CodeCycle,
            'name' => $this->LibelleCycle,
            'levels_count' => $this->levels_count ?? null,
        ];
    }
}
