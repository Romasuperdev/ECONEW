<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use App\Support\SchemaCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Mappe sur la table existante ECONOMAT : T_VERSEMENT (paiements des eleves).
 * Lecture seule pour l'instant (l'enregistrement suit une logique metier legacy).
 */
class Versement extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_VERSEMENT';
    protected $primaryKey = 'NUM';
    public $timestamps = false;

    public function eleve()
    {
        return $this->belongsTo(Student::class, 'Matricule', 'Matricule');
    }

    public static function col(array $cands): ?string
    {
        $cols = SchemaCache::columns('T_VERSEMENT');
        foreach ($cands as $c) {
            if (in_array($c, $cols, true)) {
                return $c;
            }
        }
        return null;
    }

    public function scopeForTenant(Builder $q): Builder
    {
        $annee = AnneeContext::current();
        $societe = SocieteContext::current();
        $cAnnee = static::col(['AnneeAcad', 'ANNEE', 'Annee', 'AnneeScolaire']);
        $cSoc = static::col(['CODESOCIETE', 'CodeSociete']);
        return $q->when($annee && $cAnnee, fn ($x) => $x->where($cAnnee, $annee))
                 ->when($societe && $cSoc, fn ($x) => $x->where($cSoc, $societe));
    }

    // Recupere la premiere colonne existante parmi une liste (tolerance aux noms legacy)
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
            'id' => $this->NUM,
            'receipt_number' => $this->pick(['NUM_RECU', 'NUMRECU', 'NUMERO_RECU', 'NumeroRecu']),
            'matricule' => $this->pick(['Matricule', 'MATRICULE', 'CodeEleve', 'CODEELEVE']),
            'student' => $this->eleve ? [
                'matricule' => $this->eleve->Matricule,
                'full_name' => $this->eleve->full_name,
            ] : null,
            'amount' => $this->pick(['Montant', 'MONTANT', 'MONTANT_CFA', 'MontantVerse']),
            'paid_at' => $this->pick(['DateVers', 'DateVersement', 'DATEVERS', 'DateRecu']),
            'method' => $this->pick(['ModePaiement', 'TypeVers', 'TypeVersent', 'ModeReglement']),
            'libelle' => $this->pick(['Libelle', 'LIBELLE', 'Motif']),
            'caisse' => $this->pick(['CODECAISSE', 'CodeCaisse']),
            'numero_pc' => $this->pick(['NumeroPC', 'NUMEROPC']),
        ];
    }
}
