<?php

namespace App\Models;

use App\Support\SchemaCache;

use App\Support\AnneeContext;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Grille tarifaire de la scolarité (table ECONOMAT : T_GRILLESCOLARITE).
 * PK tolérante (ID_GrillleScolarite / ID_GrilleScolarite).
 */
class GrilleScolarite extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_GRILLESCOLARITE';
    public $timestamps = false;

    protected static array $cols = [];

    public static function columns(): array
    {
        return static::$cols = static::$cols ?: SchemaCache::columns('T_GRILLESCOLARITE');
    }

    public static function col(array $cands): ?string
    {
        foreach ($cands as $c) {
            if (in_array($c, static::columns(), true)) {
                return $c;
            }
        }
        return null;
    }

    public function getKeyName()
    {
        return static::col(['ID_GrillleScolarite', 'ID_GrilleScolarite', 'ID', 'Id', 'NUM', 'Num']) ?? 'ID_GrilleScolarite';
    }

    public function scopeForTenant(Builder $q): Builder
    {
        $annee = AnneeContext::current();
        $societe = SocieteContext::current();
        $etab = EtablissementContext::current();
        return $q->when($annee, fn ($x) => $x->where('ANNEE', $annee))
                 ->when($societe, fn ($x) => $x->where('CODESOCIETE', $societe))
                 ->when($etab && static::col(['CODEETABLISSEMENT']), fn ($x) => $x->where('CODEETABLISSEMENT', $etab));
    }

    /** Liste tolérante : grilles du tenant, repli société si filtre strict vide. */
    public static function available()
    {
        try {
            $rows = static::forTenant()->get();
            if ($rows->isEmpty()) {
                $soc = SocieteContext::current();
                $rows = static::query()->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))->get();
            }
            return $rows;
        } catch (\Throwable $e) {
            try { return static::query()->get(); } catch (\Throwable $e2) { return collect(); }
        }
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
        return [
            'id' => $this->getKey(),
            'code_grille' => $this->pick(['CodeGrille', 'CODEGRILLE']),
            'scolarite' => (float) ($this->pick(['MontScolarite', 'MONTSCOLARITE', 'Montant']) ?? 0),
            'inscription' => (float) ($this->pick(['InscriScolarite', 'INSCRISCOLARITE']) ?? 0),
            'total' => (float) ($this->pick(['TotalVersement', 'TOTALVERSEMENT']) ?? 0),
            'nb_versements' => (int) ($this->pick(['NbrVersement', 'NbreVersement', 'NBRVERSEMENT']) ?? 0),
            'fonction_de' => $this->pick(['FonctionDe', 'FONCTIONDE']),
            'type_versement' => (bool) $this->pick(['TypeVersent', 'TYPEVERSENT']),
            'annee' => $this->pick(['ANNEE', 'AnneeAcad']),
            'statut' => $this->pick(['STATUT', 'Statut']),
            'affecte' => (int) ($this->pick(['STATUT', 'Statut']) ?? 0) === 1,
        ];
    }
}
