<?php

namespace App\Models;

use App\Support\SchemaCache;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Table ECONOMAT existante : T_CAISSES (caisses / comptes de tresorerie).
 * Modele tolerant : les colonnes reelles sont detectees a l'execution.
 */
class Caisse extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_CAISSES';
    protected $primaryKey = 'CODECAISSE';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected static array $cols = [];

    /** Colonnes existantes (mise en cache). */
    public static function columns(): array
    {
        return static::$cols = static::$cols ?: SchemaCache::columns('T_CAISSES');
    }

    public static function hasCol(string $c): bool
    {
        return in_array($c, static::columns(), true);
    }

    /** Premiere colonne existante parmi une liste de candidats. */
    public static function col(array $candidates): ?string
    {
        foreach ($candidates as $c) {
            if (static::hasCol($c)) {
                return $c;
            }
        }
        return null;
    }

    /** Caisses du tenant, avec repli sur toutes si le filtre ne donne rien. */
    public static function available()
    {
        try {
            $rows = static::forTenant()->get();
            if ($rows->isEmpty()) {
                $rows = static::query()->get();
            }
            return $rows;
        } catch (\Throwable $e) {
            try { return static::query()->get(); } catch (\Throwable $e2) { return collect(); }
        }
    }

    /** Filtre societe / annee uniquement si les colonnes existent. */
    public function scopeForTenant(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        $annee = AnneeContext::current();

        $cSoc = static::col(['CODESOCIETE', 'CodeSociete']);
        $cAnnee = static::col(['ANNEE', 'AnneeAcad', 'Annee']);

        return $q->when($societe && $cSoc, fn ($x) => $x->where($cSoc, $societe))
                 ->when($annee && $cAnnee, fn ($x) => $x->where($cAnnee, $annee));
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
        $solde = $this->pick(['SoldeCaisse', 'SOLDECAISSE', 'Solde', 'SOLDE']);
        $report = $this->pick(['ReportSolde', 'REPORTSOLDE', 'SoldeReport']);

        return [
            'id' => $this->pick(['CODECAISSE', 'CodeCaisse']),
            'code' => $this->pick(['CODECAISSE', 'CodeCaisse']),
            'name' => $this->pick(['NOMCAISSE', 'NomCaisse', 'LIBELLE', 'Libelle']) ?? $this->pick(['CODECAISSE', 'CodeCaisse']),
            'type' => $this->pick(['TYPECAISSE', 'TypeCaisse', 'NATURE']) ?? 'caisse',
            'base' => $this->pick(['BASECAISSE', 'BaseCaisse']),
            'currency' => 'XOF',
            'report' => $report !== null ? (float) $report : null,
            'balance' => $solde !== null ? number_format((float) $solde, 2, '.', '') : null,
            'is_active' => true,
        ];
    }
}
