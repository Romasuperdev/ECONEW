<?php

namespace App\Models;

use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Mappe sur la table existante ECONOMAT : T_CLASSE.
 * Colonnes : CodeClasse, LibelleClasse, num, CodN, CodeF, ANNEE,
 *            BoolClassExam, CodeSerie, Site, CODEETABLISSEMENT, CODESOCIETE.
 */
class SchoolClass extends Model
{
    protected $connection = 'economat';
    protected $table = 'T_CLASSE';
    protected $primaryKey = 'num';
    public $timestamps = false;

    protected $fillable = [
        'CodeClasse', 'LibelleClasse', 'CodN', 'CodeF', 'ANNEE',
        'BoolClassExam', 'CodeSerie', 'Site', 'CODEETABLISSEMENT', 'CODESOCIETE',
    ];

    protected $appends = ['id', 'name'];

    public function getIdAttribute()
    {
        return $this->num;
    }

    public function getNameAttribute()
    {
        return $this->LibelleClasse;
    }

    public function niveau()
    {
        return $this->belongsTo(Level::class, 'CodN', 'CodeNiveau');
    }

    public function students()
    {
        return $this->hasMany(Student::class, 'CodeClasse', 'CodeClasse');
    }

    public function feeStructures()
    {
        return $this->hasMany(FeeStructure::class, 'school_class_id', 'num');
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
     * Liste tolérante avec repli société si le filtre strict est vide.
     */
    public static function available()
    {
        $base = fn () => static::with('niveau')->withCount('students')->orderBy('LibelleClasse');
        try {
            $rows = $base()->forTenant()->get();
        } catch (\Throwable $e) {
            $rows = collect();
        }
        if ($rows->isEmpty()) {
            $soc = SocieteContext::current();
            try {
                $rows = $base()->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))->get();
            } catch (\Throwable $e) {
                try { $rows = $base()->get(); } catch (\Throwable $e2) { $rows = collect(); }
            }
        }
        return $rows;
    }

    public function toNormalized(): array
    {
        return [
            'id' => $this->num,
            'code' => $this->CodeClasse,
            'name' => $this->LibelleClasse,
            'section' => $this->CodeSerie,
            'is_exam' => (bool) $this->BoolClassExam,
            'level_id' => $this->niveau?->Num,
            'level' => $this->niveau ? ['id' => $this->niveau->Num, 'name' => $this->niveau->LibelleNiveau] : null,
            'students_count' => $this->students_count ?? null,
        ];
    }
}
