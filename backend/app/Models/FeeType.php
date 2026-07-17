<?php

namespace App\Models;

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

    public function scopeForTenant(Builder $q): Builder
    {
        $annee = AnneeContext::current();
        if ($annee && static::hasCol('ANNEE')) {
            $q->where(fn ($x) => $x->where('ANNEE', $annee)->orWhereNull('ANNEE'));
        }
        return $q;
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
