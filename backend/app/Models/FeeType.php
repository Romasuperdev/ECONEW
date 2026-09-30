<?php

namespace App\Models;

use App\Models\Concerns\IsTenantScoped;

use App\Support\SchemaCache;

use App\Support\AnneeContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Types de frais / categories de paiement (table ECONOMAT : T_CATEGORIEPAIEMENT).
 * Ex : INSCRIPTION, 1er VERSEMENT... avec Montant et Echeance.
 * Modele tolerant : colonnes detectees a l'execution.
 */
class FeeType extends Model
{
    use IsTenantScoped;

    protected $connection = 'economat';
    protected $table = 'T_CATEGORIEPAIEMENT';
    protected $primaryKey = 'Num';
    public $timestamps = false;

    protected $guarded = [];

    protected static array $cols = [];

    public static function columns(): array
    {
        return static::$cols = static::$cols ?: SchemaCache::columns('T_CATEGORIEPAIEMENT');
    }

    public static function hasCol(string $c): bool
    {
        return in_array($c, static::columns(), true);
    }

    /** Première colonne existante parmi des candidats (tolérance noms legacy). */
    public static function col(array $cands): ?string
    {
        foreach ($cands as $c) {
            if (static::hasCol($c)) {
                return $c;
            }
        }
        return null;
    }

    public function scopeForTenant(Builder $q): Builder
    {
        $annee = AnneeContext::current();
        $societe = \App\Support\SocieteContext::current();
        $etab = \App\Support\EtablissementContext::current();
        $cSoc = static::col(['CODESOCIETE', 'CodeSociete']);
        $cEtab = static::col(['CODEETABLISSEMENT', 'CodeEtablissement']);

        // Isolation STRICTE par année (plus de tolérance orWhereNull).
        if ($annee && static::hasCol('ANNEE')) {
            $q->where('ANNEE', $annee);
        }
        return $q
            ->when($societe && $cSoc, fn ($x) => $x->where($cSoc, $societe))
            ->when($etab && $cEtab, fn ($x) => $x->where($cEtab, $etab));
    }

    protected function pick(array $keys)
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $this->attributes) && $this->attributes[$k] !== null) {
                return $this->attributes[$k];
            }
        }
        return null;
    }

    public function toNormalized(): array
    {
        $montant = $this->pick(['Montant', 'MONTANT']);
        return [
            'id' => $this->pick(['Num', 'NUM', 'ID', 'Id']),
            'name' => $this->pick(['Libelle', 'LIBELLE', 'Categorie', 'Designation', 'Nom']) ?? '—',
            'amount' => is_numeric($montant) ? (float) $montant : null,
            'grille' => $this->pick(['CodeGrille', 'CODEGRILLE']),
            'echeance' => $this->pick(['Echeance', 'ECHEANCE']),
        ];
    }
}
