<?php

namespace App\Models;

use App\Support\SchemaCache;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Table ECONOMAT existante : T_MVTCAISSE (mouvements de caisse).
 * Modele tolerant : colonnes detectees a l'execution.
 */
class MvtCaisse extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_MVTCAISSE';
    public $timestamps = false;

    protected static array $cols = [];

    public static function columns(): array
    {
        return static::$cols = static::$cols ?: SchemaCache::columns('T_MVTCAISSE');
    }

    public static function hasCol(string $c): bool
    {
        return in_array($c, static::columns(), true);
    }

    public static function col(array $candidates): ?string
    {
        foreach ($candidates as $c) {
            if (static::hasCol($c)) {
                return $c;
            }
        }
        return null;
    }

    public static function dateCol(): ?string
    {
        return static::col(['DateMvt', 'DATEMVT', 'DateMouvement', 'DATE', 'DateOperation', 'DateOp']);
    }

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

    /** entree si type/sens indique un credit, sinon sortie (heuristique tolerante). */
    public function direction(): string
    {
        $t = strtolower((string) $this->pick(['TYPE_MVT', 'TypeMvt', 'TypeMouv', 'SENS', 'Sens']));
        if ($t === '' ) {
            // colonnes debit / credit separees ?
            $credit = $this->pick(['CREDIT', 'Credit', 'ENTREE', 'Entree']);
            if ($credit !== null && (float) $credit != 0.0) {
                return 'entree';
            }
            return 'sortie';
        }
        if (str_contains($t, 'ent') || str_contains($t, 'cred') || str_contains($t, 'rec') || $t === 'e' || $t === 'c') {
            return 'entree';
        }
        return 'sortie';
    }

    public function toNormalized(): array
    {
        $montant = $this->pick(['MONTANT', 'Montant', 'CREDIT', 'Credit', 'DEBIT', 'Debit']);

        return [
            'id' => $this->pick(['NUM', 'Num', 'ID', 'Id', 'IDMVT', 'CODEMVT']),
            'cash_account_id' => $this->pick(['CODECAISSE', 'CodeCaisse']),
            'type' => $this->direction(),
            'amount' => $montant !== null ? number_format((float) $montant, 2, '.', '') : null,
            'label' => $this->pick(['LIBELLE', 'Libelle', 'MOTIF', 'Motif', 'DESIGNATION']),
            'reference' => $this->pick(['NUMEROPC', 'NumeroPC', 'NUMPC', 'REFERENCE', 'Reference', 'JUSTIFICATIF']),
            'transaction_date' => $this->pick(['DateMvt', 'DATEMVT', 'DateMouvement', 'DATE', 'DateOperation', 'DateOp']),
        ];
    }
}
