<?php

namespace App\Models;

use App\Support\SchemaCache;

use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Etablissements (table ECONOMAT : T_ETABLISSEMENT).
 * NB : le code d'etablissement est la colonne CODE (pas CODEETABLISSEMENT) ;
 * c'est cette valeur CODE que les autres tables stockent dans CODEETABLISSEMENT.
 */
class Etablissement extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_ETABLISSEMENT';
    protected $primaryKey = 'Num';
    public $timestamps = false;

    protected static array $cols = [];

    public static function columns(): array
    {
        return static::$cols = static::$cols ?: SchemaCache::columns('T_ETABLISSEMENT');
    }

    public static function col(array $candidates): ?string
    {
        foreach ($candidates as $c) {
            if (in_array($c, static::columns(), true)) {
                return $c;
            }
        }
        return null;
    }

    /** Colonne portant le code d'etablissement (celui stocke ailleurs dans CODEETABLISSEMENT). */
    public static function codeColumn(): ?string
    {
        return static::col(['CODE', 'Code', 'CODEETABLISSEMENT', 'CodeEtablissement', 'CODEETAB', 'CodeEtab']);
    }

    /** Etablissements de la societe courante, avec repli sur tous si le filtre ne donne rien. */
    public static function available()
    {
        try {
            $rows = static::forSociete()->get();
            if ($rows->isEmpty()) {
                $rows = static::query()->get();
            }
            return $rows;
        } catch (\Throwable $e) {
            return collect();
        }
    }

    public function scopeForSociete(Builder $q): Builder
    {
        $societe = SocieteContext::current();
        $cSoc = static::col(['CODESOCIETE', 'CodeSociete']);
        return $q->when($societe && $cSoc, fn ($x) => $x->where($cSoc, $societe));
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
        $code = $this->pick(['CODE', 'Code', 'CODEETABLISSEMENT', 'CodeEtablissement', 'CODEETAB', 'CodeEtab']);
        return [
            'id' => $code,
            'code' => $code,
            'name' => $this->pick(['RAISONSOCIALE', 'RaisonSociale', 'NOMETABLISSEMENT', 'NomEtablissement', 'LIBELLE', 'Libelle', 'NOM', 'Nom']) ?? $code,
            'ville' => $this->pick(['SOUS_PREFECTURE', 'VILLE', 'Ville']),
            'type' => $this->pick(['TYPE', 'Type']),
        ];
    }
}
